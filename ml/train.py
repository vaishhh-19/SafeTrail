"""SafeTrail ML training: global model + area + road intelligence."""
import os, json
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    precision_score, recall_score, f1_score
)
from sklearn.preprocessing import StandardScaler, LabelEncoder

from preprocess import engineer_features
from road_intelligence import (
    build_profiles as build_road_profiles,
    save_profiles as save_road_profiles,
    road_segment_id,
    calibrated_risk as road_calibrated_risk,
)
from area_intelligence import (
    build_area_profiles,
    save_profiles as save_area_profiles,
    nearest_area,
    calibrated_risk,
)

BASE = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE, "models")
DATA = os.path.join(BASE, "datasets", "bangalore_crime.csv")
os.makedirs(MODEL_DIR, exist_ok=True)

print("=" * 70)
print("SafeTrail ML — Global + Area + Road Intelligence")
print("=" * 70)

df = engineer_features(pd.read_csv(DATA))

feature_cols = [
    "latitude", "longitude", "hour", "day_of_week",
    "crime_count", "feedback_score",
    "is_night", "is_weekend", "is_evening",
    "hotspot_distance", "hotspot_proximity", "risk_score",
]

X_raw = df[feature_cols].values
y_labels = df["risk_label"].values

le = LabelEncoder()
le.fit(["safe", "moderate", "danger"])
y = le.transform(y_labels)

X_train_raw, X_test_raw, y_train, y_test, df_train, df_test = train_test_split(
    X_raw, y, df,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train_raw)
X_test = scaler.transform(X_test_raw)

joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
joblib.dump(le, os.path.join(MODEL_DIR, "label_encoder.pkl"))
joblib.dump(feature_cols, os.path.join(MODEL_DIR, "feature_cols.pkl"))

# IMPORTANT: profiles use training rows only.
road_profiles, road_meta = build_road_profiles(df_train)
save_road_profiles(
    road_profiles,
    {
        **road_meta,
        "training_rows": len(df_train),
        "evaluation_rows": len(df_test),
    },
)

area_profiles, area_meta = build_area_profiles(df_train)
save_area_profiles(
    area_profiles,
    {
        **area_meta,
        "training_rows": len(df_train),
        "evaluation_rows": len(df_test),
        "note": "Area profiles learned from training split only.",
    },
)

iso = IsolationForest(
    n_estimators=150,
    contamination=0.05,
    random_state=42,
)
iso.fit(X_train)
joblib.dump(iso, os.path.join(MODEL_DIR, "isolation_forest.pkl"))

normal_mask = iso.predict(X_train) == 1

rf = RandomForestClassifier(
    n_estimators=300,
    max_depth=18,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
rf.fit(X_train[normal_mask], y_train[normal_mask])
joblib.dump(rf, os.path.join(MODEL_DIR, "random_forest.pkl"))

classes = list(le.classes_)
global_pred = rf.predict(X_test)
proba = rf.predict_proba(X_test)

area_pred = []
road_pred = []
area_names = []

test_rows = df_test.reset_index(drop=True)

for i, row in test_rows.iterrows():
    global_probs = {
        label: float(prob)
        for label, prob in zip(classes, proba[i])
    }

    area_name, area_profile, _ = nearest_area(
        row.latitude,
        row.longitude,
        {"profiles": area_profiles, "meta": area_meta},
    )

    sid = road_segment_id(
        row.latitude,
        row.longitude,
        row.area_name,
    )
    road_profile = road_profiles.get(sid, {})

    area_probs = calibrated_risk(global_probs, area_profile)
    road_probs = calibrated_risk(
        global_probs,
        area_profile,
        road_profile,
    )

    area_pred.append(classes.index(max(area_probs, key=area_probs.get)))
    road_pred.append(classes.index(max(road_probs, key=road_probs.get)))
    area_names.append(area_name)

area_pred = np.array(area_pred)
road_pred = np.array(road_pred)

def metric_block(y_true, y_pred):
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(
            y_true, y_pred, average="weighted", zero_division=0
        )), 4),
        "recall": round(float(recall_score(
            y_true, y_pred, average="weighted", zero_division=0
        )), 4),
        "f1": round(float(f1_score(
            y_true, y_pred, average="weighted", zero_division=0
        )), 4),
    }

area_metrics = []
for area in sorted(set(area_names)):
    idx = np.array([name == area for name in area_names])
    if idx.sum() == 0:
        continue

    area_metrics.append({
        "area_name": area,
        "test_samples": int(idx.sum()),
        **metric_block(y_test[idx], area_pred[idx]),
        "danger_rate": area_profiles[area]["danger_rate"],
        "sample_count": area_profiles[area]["sample_count"],
        "centroid_lat": area_profiles[area]["centroid_lat"],
        "centroid_lon": area_profiles[area]["centroid_lon"],
    })

area_metrics.sort(
    key=lambda x: x["sample_count"],
    reverse=True,
)

metrics = {
    "evaluation": "stratified 80/20 holdout; bundled dataset has no real dates",
    "samples": int(len(df)),
    "training_samples": int(len(X_train)),
    "test_samples": int(len(X_test)),
    "areas": int(len(area_profiles)),
    "road_segments": int(len(road_profiles)),
    "global": metric_block(y_test, global_pred),
    "area_calibrated": metric_block(y_test, area_pred),
    "road_calibrated": metric_block(y_test, road_pred),
    "area_metrics": area_metrics,
    "classes": classes,
    "feature_importance": {
        key: round(float(value), 4)
        for key, value in sorted(
            zip(feature_cols, rf.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
    },
}

with open(
    os.path.join(MODEL_DIR, "training_metrics.json"),
    "w",
    encoding="utf-8",
) as f:
    json.dump(metrics, f, indent=2)

# DBSCAN remains useful for map visualization and hotspot discovery.
coords_rad = np.radians(df[["latitude", "longitude"]].values)
dbscan = DBSCAN(
    eps=500 / 6371000,
    min_samples=15,
    metric="haversine",
)
cluster_labels = dbscan.fit_predict(coords_rad)

centers = []
for label in sorted(set(cluster_labels)):
    if label == -1:
        continue
    mask = cluster_labels == label
    center = df.loc[mask, ["latitude", "longitude"]].mean()
    count = int(mask.sum())
    centers.append({
        "cluster_id": int(label),
        "latitude": round(float(center.latitude), 6),
        "longitude": round(float(center.longitude), 6),
        "point_count": count,
        "risk_type": "danger" if count > 50 else "moderate",
    })

pd.DataFrame(centers).to_csv(
    os.path.join(MODEL_DIR, "dbscan_clusters.csv"),
    index=False,
)
joblib.dump(dbscan, os.path.join(MODEL_DIR, "dbscan.pkl"))

print(f"Samples: {len(df)}")
print(f"Areas learned: {len(area_profiles)}")
print(f"Road segments learned: {len(road_profiles)}")
print(f"Global precision: {metrics['global']['precision']}")
print(f"Area precision: {metrics['area_calibrated']['precision']}")
print(f"Road precision: {metrics['road_calibrated']['precision']}")
print("\nArea metrics:")
for item in area_metrics:
    print(
        f"  {item['area_name']:<20} "
        f"precision={item['precision']:.3f} "
        f"recall={item['recall']:.3f} "
        f"f1={item['f1']:.3f}"
    )

print("\nClassification report (global):")
print(classification_report(
    y_test, global_pred,
    target_names=classes,
    zero_division=0,
))
print("Confusion matrix:")
print(confusion_matrix(y_test, global_pred))
print("\nTraining complete.")
