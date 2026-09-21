"""SafeTrail prediction engine: global ML + area + road intelligence."""
import os
import numpy as np
import joblib
from datetime import datetime

from road_intelligence import lookup as lookup_road
from area_intelligence import nearest_area, calibrated_risk

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

_rf = None
_iso = None
_scaler = None
_le = None
_feat_cols = None


def load_models():
    global _rf, _iso, _scaler, _le, _feat_cols
    try:
        _rf = joblib.load(os.path.join(MODEL_DIR, "random_forest.pkl"))
        _iso = joblib.load(os.path.join(MODEL_DIR, "isolation_forest.pkl"))
        _scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
        _le = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
        _feat_cols = joblib.load(os.path.join(MODEL_DIR, "feature_cols.pkl"))
        print("✅ ML models loaded successfully")
        return True
    except Exception as e:
        print(f"⚠️ ML models not found: {e}")
        return False


def _calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(np.radians(lat1))
        * np.cos(np.radians(lat2))
        * np.sin(dlon / 2) ** 2
    )
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))


def _build_features(
    lat,
    lon,
    hour=None,
    day=None,
    crime_count=50,
    feedback_score=3.0,
):
    now = datetime.now()
    hour = now.hour if hour is None else int(hour)
    day = now.weekday() if day is None else int(day)

    # Retained for compatibility with the existing model.
    hotspot_distance = min(
        _calculate_distance(lat, lon, h[0], h[1])
        for h in [
            (12.9625, 77.5770),
            (12.9767, 77.5713),
            (12.9850, 77.6010),
            (12.9680, 77.5750),
            (13.0050, 77.6680),
        ]
    )

    return [
        lat,
        lon,
        hour,
        day,
        crime_count,
        feedback_score,
        int(hour >= 22 or hour <= 5),
        int(day >= 5),
        int(18 <= hour < 22),
        hotspot_distance,
        1 / (1 + hotspot_distance / 1000),
        crime_count * 0.6 + (5 - feedback_score) * 10 * 0.4,
    ]


def predict_risk(
    lat,
    lon,
    hour=None,
    day=None,
    crime_count=50,
    feedback_score=3.0,
):
    if _rf is None and not load_models():
        return _mock_predict(lat, lon)

    try:
        features = _build_features(
            lat, lon, hour, day, crime_count, feedback_score
        )
        X = _scaler.transform(np.array([features]))

        anomaly = bool(_iso.predict(X)[0] == -1)
        proba = _rf.predict_proba(X)[0]
        classes = list(_le.classes_)

        global_probs = {
            label: float(prob)
            for label, prob in zip(classes, proba)
        }

        area_name, area, area_distance = nearest_area(lat, lon)
        road_sid, road = lookup_road(lat, lon)

        final_probs = calibrated_risk(
            global_probs,
            area,
            road,
        )

        risk_label = max(final_probs, key=final_probs.get)
        confidence = max(final_probs.values())

        details = {
            "hour": features[2],
            "is_night": bool(features[6]),
            "is_weekend": bool(features[7]),
            "hotspot_distance_m": round(features[9], 0),

            "area_name": area_name,
            "area_distance_m": round(float(area_distance), 0),
            "area_sample_count": area.get("sample_count", 0),
            "area_danger_rate": round(
                float(area.get("danger_rate", 0)), 3
            ),
            "area_night_incidents": area.get("night_incidents", 0),
            "area_evening_incidents": area.get("evening_incidents", 0),

            "road_segment_id": road_sid,
            "road_sample_count": road.get("sample_count", 0),
            "road_danger_rate": round(
                float(road.get("danger_rate", 0)), 3
            ),
            "road_night_incidents": road.get("night_incidents", 0),
            "road_evening_incidents": road.get("evening_incidents", 0),

            "global_risk": max(
                global_probs, key=global_probs.get
            ),
            "global_confidence": round(
                max(global_probs.values()), 3
            ),
        }

        return {
            "risk_level": risk_label,
            "confidence": round(float(confidence), 3),
            "anomaly": anomaly,
            "probabilities": final_probs,
            "details": details,
            "message": (
                f"{risk_label.title()} risk with "
                "area + road intelligence"
            ),
        }

    except Exception as e:
        print(f"Prediction error: {e}")
        return _mock_predict(lat, lon)


def _mock_predict(lat, lon):
    import math
    value = abs(
        math.sin(lat * 1000) + math.cos(lon * 1000)
    ) % 1

    return {
        "risk_level": (
            "safe"
            if value < 0.6
            else "moderate"
            if value < 0.85
            else "danger"
        ),
        "confidence": 0.75,
        "anomaly": False,
        "probabilities": {},
        "details": {},
        "message": "Fallback risk estimate",
    }


load_models()
