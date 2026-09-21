"""
SafeTrail — Feedback-driven Retraining Pipeline
================================================
Folds admin-approved user feedback (safe/danger/risk ratings on a
location) back into the training data and retrains the Random Forest
risk classifier + Isolation Forest anomaly detector.

Triggered from the admin dashboard via:
    POST /api/admin/retrain
which imports and calls `retrain_from_feedback()` below.

Can also be run standalone for the viva/demo:
    cd ml && python retrain_from_feedback.py
"""
import os
import shutil
import numpy as np
import pandas as pd
import joblib
from datetime import datetime
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import StandardScaler, LabelEncoder

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR  = os.path.join(BASE_DIR, "datasets")
MODELS_DIR    = os.path.join(BASE_DIR, "models")
BASE_CSV      = os.path.join(DATASETS_DIR, "bangalore_crime.csv")
FEEDBACK_CSV  = os.path.join(DATASETS_DIR, "feedback_augmented.csv")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/safetrail")

FEEDBACK_COLUMNS = [
    "latitude", "longitude", "area_name", "hour", "day_of_week",
    "crime_count", "incident_type", "feedback_score", "risk_label",
]

# Rough crime-count proxy so a 1-5 "how unsafe did this feel" rating can
# sit on the same numeric scale as the original crime dataset.
RATING_TO_CRIME_COUNT = {1: 90, 2: 70, 3: 45, 4: 20, 5: 8}


def _rating_to_risk_label(rating):
    if rating <= 2:
        return "danger"
    if rating == 3:
        return "moderate"
    return "safe"


def _pull_new_feedback_rows():
    """Fetch admin-approved feedback that hasn't been folded into the
    dataset yet, and mark it as used once we've captured it."""
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client["safetrail"]
    feedback_col = db["feedback"]

    query = {"status": "approved", "used_in_training": {"$ne": True}}
    docs = list(feedback_col.find(query))

    rows = []
    ids = []
    for d in docs:
        loc = d.get("location", {})
        lat, lon = loc.get("latitude"), loc.get("longitude")
        if lat is None or lon is None:
            continue
        rating = int(d.get("rating", 3))
        rating = min(max(rating, 1), 5)
        ts = d.get("timestamp") or datetime.utcnow()

        rows.append({
            "latitude":       lat,
            "longitude":      lon,
            "area_name":      d.get("address") or "User Feedback",
            "hour":           ts.hour,
            "day_of_week":    ts.weekday(),
            "crime_count":    RATING_TO_CRIME_COUNT.get(rating, 45),
            "incident_type":  "user_reported",
            "feedback_score": float(rating),
            "risk_label":     _rating_to_risk_label(rating),
        })
        ids.append(d["_id"])

    if ids:
        feedback_col.update_many(
            {"_id": {"$in": ids}},
            {"$set": {"used_in_training": True}}
        )

    return rows


def _calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    d_lat = np.radians(lat2 - lat1)
    d_lon = np.radians(lon2 - lon1)
    a = (np.sin(d_lat / 2) ** 2 +
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) *
         np.sin(d_lon / 2) ** 2)
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))


DANGER_HOTSPOTS = [
    (12.9625, 77.5770), (12.9767, 77.5713), (12.9850, 77.6010),
    (12.9680, 77.5750), (13.0050, 77.6680),
]


def _engineer_features(df):
    df = df.copy()
    df["is_night"]   = ((df["hour"] >= 22) | (df["hour"] <= 5)).astype(int)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_evening"] = ((df["hour"] >= 18) & (df["hour"] < 22)).astype(int)

    df["hotspot_distance"] = df.apply(
        lambda r: min(_calculate_distance(r["latitude"], r["longitude"], h[0], h[1])
                       for h in DANGER_HOTSPOTS),
        axis=1
    )
    df["hotspot_proximity"] = 1 / (1 + df["hotspot_distance"] / 1000)
    df["risk_score"] = df["crime_count"] * 0.6 + (5 - df["feedback_score"]) * 10 * 0.4
    return df


def retrain_from_feedback():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(DATASETS_DIR, exist_ok=True)

    # 1. Pull any newly-approved feedback and append it to the running
    #    "feedback_augmented.csv" so it keeps contributing on every
    #    future retrain too, not just this one.
    new_rows = _pull_new_feedback_rows()
    if new_rows:
        new_df = pd.DataFrame(new_rows, columns=FEEDBACK_COLUMNS)
        if os.path.exists(FEEDBACK_CSV):
            new_df.to_csv(FEEDBACK_CSV, mode="a", header=False, index=False)
        else:
            new_df.to_csv(FEEDBACK_CSV, index=False)

    # 2. Build the combined training set: original crime dataset +
    #    everything gathered from feedback so far.
    base_df = pd.read_csv(BASE_CSV)
    if os.path.exists(FEEDBACK_CSV):
        fb_df = pd.read_csv(FEEDBACK_CSV)
        combined_df = pd.concat([base_df, fb_df], ignore_index=True)
    else:
        combined_df = base_df

    combined_df = _engineer_features(combined_df)

    feature_cols = [
        "latitude", "longitude", "hour", "day_of_week",
        "crime_count", "feedback_score",
        "is_night", "is_weekend", "is_evening",
        "hotspot_distance", "hotspot_proximity", "risk_score",
    ]
    X = combined_df[feature_cols].values
    y_raw = combined_df["risk_label"].values

    le = LabelEncoder()
    le.fit(["safe", "moderate", "danger"])
    y = le.transform(y_raw)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 3. Isolation Forest — refresh anomaly detector on the combined data
    iso_forest = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    iso_forest.fit(X_scaled)
    anomaly_labels = iso_forest.predict(X_scaled)
    normal_mask = anomaly_labels == 1
    X_clean, y_clean = X_scaled[normal_mask], y[normal_mask]

    # 4. Random Forest — retrain classifier
    X_train, X_test, y_train, y_test = train_test_split(
        X_clean, y_clean, test_size=0.2, random_state=42, stratify=y_clean
    )
    rf = RandomForestClassifier(
        n_estimators=100, max_depth=15, min_samples_split=5,
        min_samples_leaf=2, class_weight="balanced", random_state=42, n_jobs=-1
    )
    rf.fit(X_train, y_train)
    accuracy = accuracy_score(y_test, rf.predict(X_test))

    # 5. Back up the previous model set before overwriting (handy for a
    #    viva demo: "here's the model before vs. after retraining").
    backup_dir = os.path.join(MODELS_DIR, "backups", datetime.utcnow().strftime("%Y%m%d_%H%M%S"))
    os.makedirs(backup_dir, exist_ok=True)
    for fname in ["random_forest.pkl", "isolation_forest.pkl", "scaler.pkl", "label_encoder.pkl"]:
        fpath = os.path.join(MODELS_DIR, fname)
        if os.path.exists(fpath):
            shutil.copy(fpath, os.path.join(backup_dir, fname))

    joblib.dump(rf,         os.path.join(MODELS_DIR, "random_forest.pkl"))
    joblib.dump(iso_forest, os.path.join(MODELS_DIR, "isolation_forest.pkl"))
    joblib.dump(scaler,     os.path.join(MODELS_DIR, "scaler.pkl"))
    joblib.dump(le,         os.path.join(MODELS_DIR, "label_encoder.pkl"))
    joblib.dump(feature_cols, os.path.join(MODELS_DIR, "feature_cols.pkl"))

    # 6. Push the freshly-trained models to cloud storage (S3-compatible)
    #    if configured. No-ops cleanly if CLOUD_STORAGE_BUCKET isn't set.
    from cloud_sync import upload_models_to_cloud
    cloud_report = upload_models_to_cloud(MODELS_DIR)

    return {
        "new_feedback_rows_added": len(new_rows),
        "total_training_samples":  int(len(X_clean)),
        "accuracy":                round(float(accuracy), 4),
        "backup_location":         backup_dir,
        "trained_at":              datetime.utcnow().isoformat(),
        "cloud_sync":              cloud_report,
    }


if __name__ == "__main__":
    report = retrain_from_feedback()
    print("Retrain complete:", report)
