"""Area-level intelligence for SafeTrail.

Profiles are learned from the training split only. A live GPS point is mapped
to the nearest learned area centroid. Area evidence is then blended with the
global ML probability and the road-segment prior.
"""
import json, math, os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
PROFILE_PATH = os.path.join(MODEL_DIR, "area_profiles.json")


def build_area_profiles(df, smoothing=12.0):
    global_counts = df["risk_label"].value_counts().to_dict()
    total = max(len(df), 1)
    global_rate = (
        global_counts.get("danger", 0)
        + 0.5 * global_counts.get("moderate", 0)
    ) / total

    profiles = {}
    for area, g in df.groupby("area_name"):
        counts = g["risk_label"].value_counts().to_dict()
        n = len(g)
        raw = (
            counts.get("danger", 0)
            + 0.5 * counts.get("moderate", 0)
        ) / max(n, 1)
        smoothed = (raw * n + global_rate * smoothing) / (n + smoothing)

        profiles[str(area)] = {
            "area_name": str(area),
            "sample_count": int(n),
            "danger_rate": round(float(smoothed), 4),
            "raw_danger_rate": round(float(raw), 4),
            "danger_count": int(counts.get("danger", 0)),
            "moderate_count": int(counts.get("moderate", 0)),
            "safe_count": int(counts.get("safe", 0)),
            "night_incidents": int(((g["hour"] >= 22) | (g["hour"] <= 5)).sum()),
            "evening_incidents": int(((g["hour"] >= 18) & (g["hour"] < 22)).sum()),
            "avg_crime_count": round(float(g["crime_count"].mean()), 2),
            "avg_feedback_score": round(float(g["feedback_score"].mean()), 2),
            "centroid_lat": round(float(g["latitude"].mean()), 6),
            "centroid_lon": round(float(g["longitude"].mean()), 6),
        }

    return profiles, {
        "global_danger_rate": round(float(global_rate), 4),
        "area_count": len(profiles),
    }


def save_profiles(profiles, meta=None):
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(PROFILE_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {"version": 2, "meta": meta or {}, "profiles": profiles},
            f,
            indent=2,
        )


def load_profiles():
    try:
        with open(PROFILE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"version": 2, "meta": {}, "profiles": {}}


def nearest_area(lat, lon, payload=None):
    payload = payload or load_profiles()
    best_name = "Unknown"
    best_profile = None
    best_distance = float("inf")

    lat = float(lat)
    lon = float(lon)

    for name, profile in payload.get("profiles", {}).items():
        plat = profile.get("centroid_lat")
        plon = profile.get("centroid_lon")
        if plat is None or plon is None:
            continue

        dy = (lat - float(plat)) * 111_320
        dx = (
            (lon - float(plon))
            * 111_320
            * math.cos(math.radians(lat))
        )
        distance = math.hypot(dx, dy)

        if distance < best_distance:
            best_name = name
            best_profile = profile
            best_distance = distance

    if best_profile is None:
        best_profile = {
            "sample_count": 0,
            "danger_rate": payload.get("meta", {}).get(
                "global_danger_rate", 0.35
            ),
            "danger_count": 0,
            "moderate_count": 0,
            "safe_count": 0,
            "night_incidents": 0,
            "evening_incidents": 0,
            "avg_crime_count": 0,
            "avg_feedback_score": 3.0,
        }

    return best_name, best_profile, best_distance


def calibrated_risk(global_probs, area_profile, road_profile=None):
    probs = {k: float(v) for k, v in global_probs.items()}

    area_n = int(area_profile.get("sample_count", 0))
    area_prior = float(area_profile.get("danger_rate", 0.35))
    area_weight = min(0.28, 0.28 * (area_n / 100.0))

    current = probs.get("danger", 0.0)
    adjusted = current * (1 - area_weight) + area_prior * area_weight

    if road_profile:
        road_n = int(road_profile.get("sample_count", 0))
        road_prior = float(road_profile.get("danger_rate", area_prior))
        road_weight = min(0.18, 0.18 * (road_n / 60.0))
        adjusted = adjusted * (1 - road_weight) + road_prior * road_weight

    delta = adjusted - current
    probs["danger"] = max(0.0, min(1.0, adjusted))

    others = [k for k in probs if k != "danger"]
    other_total = sum(probs[k] for k in others)
    if other_total > 0:
        for key in others:
            probs[key] = max(
                0.0,
                probs[key] - delta * probs[key] / other_total,
            )

    total = sum(probs.values()) or 1.0
    return {k: round(v / total, 4) for k, v in probs.items()}
