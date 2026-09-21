"""Feature engineering and preprocessing for SafeTrail ML pipeline."""
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import os
from road_intelligence import road_segment_id

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)


def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    d_lat = np.radians(lat2 - lat1)
    d_lon = np.radians(lon2 - lon1)
    a = (np.sin(d_lat/2)**2 + np.cos(np.radians(lat1))*np.cos(np.radians(lat2))*np.sin(d_lon/2)**2)
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))

DANGER_HOTSPOTS = [
    (12.9625, 77.5770), (12.9767, 77.5713), (12.9850, 77.6010),
    (12.9680, 77.5750), (13.0050, 77.6680),
]


def engineer_features(df):
    df = df.copy()
    df["is_night"] = ((df["hour"] >= 22) | (df["hour"] <= 5)).astype(int)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_evening"] = ((df["hour"] >= 18) & (df["hour"] < 22)).astype(int)
    df["road_segment_id"] = [road_segment_id(a, b, c) for a, b, c in zip(df.latitude, df.longitude, df.area_name)]

    def min_hotspot_dist(row):
        return min(calculate_distance(row.latitude, row.longitude, h[0], h[1]) for h in DANGER_HOTSPOTS)
    df["hotspot_distance"] = df.apply(min_hotspot_dist, axis=1)
    df["hotspot_proximity"] = 1 / (1 + df["hotspot_distance"] / 1000)
    df["risk_score"] = df["crime_count"] * 0.6 + (5 - df["feedback_score"]) * 10 * 0.4
    return df


def load_and_preprocess(csv_path="datasets/bangalore_crime.csv", fit_scaler=True):
    print("📂 Loading dataset...")
    df = engineer_features(pd.read_csv(csv_path))
    print(f"   Rows: {len(df)} | Road segments: {df.road_segment_id.nunique()}")

    feature_cols = [
        "latitude", "longitude", "hour", "day_of_week", "crime_count", "feedback_score",
        "is_night", "is_weekend", "is_evening", "hotspot_distance", "hotspot_proximity", "risk_score",
    ]
    X = df[feature_cols].values
    y = df["risk_label"].values
    le = LabelEncoder(); le.fit(["safe", "moderate", "danger"]); y_encoded = le.transform(y)

    scaler = StandardScaler(); X_scaled = scaler.fit_transform(X) if fit_scaler else scaler.transform(X)
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
    joblib.dump(le, os.path.join(MODEL_DIR, "label_encoder.pkl"))
    joblib.dump(feature_cols, os.path.join(MODEL_DIR, "feature_cols.pkl"))
    return X_scaled, y_encoded, le, feature_cols, df

if __name__ == "__main__":
    X, y, le, cols, df = load_and_preprocess()
    print(f"\n✅ Preprocessing complete | Features: {len(cols)} | Samples: {len(X)}")
