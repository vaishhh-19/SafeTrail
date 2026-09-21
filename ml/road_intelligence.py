"""Road/road-segment intelligence for SafeTrail.

The current bundled dataset does not contain a canonical road-id or road
geometry. Until a road-network provider is connected, SafeTrail uses a small
GPS segment key (about 200m x 200m) as a stable *road segment proxy* and
combines it with area_name. This keeps the model data-driven without
pretending that a GPS grid cell is an official road name.
"""
from collections import defaultdict
import json, os
import math

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
PROFILE_PATH = os.path.join(MODEL_DIR, "road_profiles.json")

GRID = 0.002  # roughly 200-220m in Bengaluru


def road_segment_id(lat, lon, area_name=None):
    lat_bin = math.floor(float(lat) / GRID)
    lon_bin = math.floor(float(lon) / GRID)
    area = str(area_name or "unknown").strip().lower().replace(" ", "_")
    return f"{area}:{lat_bin}:{lon_bin}"


def build_profiles(df, smoothing=8.0):
    """Build smoothed road-segment priors from a dataframe."""
    global_counts = df["risk_label"].value_counts().to_dict()
    total = max(len(df), 1)
    global_danger_rate = (
        (global_counts.get("danger", 0) + 0.5 * global_counts.get("moderate", 0)) / total
    )
    profiles = {}
    grouped = df.groupby("road_segment_id")
    for sid, g in grouped:
        counts = g["risk_label"].value_counts().to_dict()
        n = len(g)
        raw = (
            counts.get("danger", 0) + 0.5 * counts.get("moderate", 0)
        ) / max(n, 1)
        smoothed = (raw * n + global_danger_rate * smoothing) / (n + smoothing)
        night = g[g["hour"].isin(list(range(22,24)) + list(range(0,6)))]
        evening = g[(g["hour"] >= 18) & (g["hour"] < 22)]
        profiles[sid] = {
            "sample_count": int(n),
            "danger_rate": round(float(smoothed), 4),
            "raw_danger_rate": round(float(raw), 4),
            "danger_count": int(counts.get("danger", 0)),
            "moderate_count": int(counts.get("moderate", 0)),
            "safe_count": int(counts.get("safe", 0)),
            "night_incidents": int(len(night)),
            "evening_incidents": int(len(evening)),
            "avg_crime_count": round(float(g["crime_count"].mean()), 2),
            "avg_feedback_score": round(float(g["feedback_score"].mean()), 2),
        }
    return profiles, {
        "global_danger_rate": round(float(global_danger_rate), 4),
        "segment_count": len(profiles),
    }


def save_profiles(profiles, meta=None):
    os.makedirs(MODEL_DIR, exist_ok=True)
    payload = {"version": 1, "grid": GRID, "meta": meta or {}, "profiles": profiles}
    with open(PROFILE_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def load_profiles():
    try:
        with open(PROFILE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"version": 1, "grid": GRID, "meta": {}, "profiles": {}}


def lookup(lat, lon, profiles=None):
    payload = profiles or load_profiles()
    sid = road_segment_id(lat, lon)
    profile = payload.get("profiles", {}).get(sid)
    if profile is None:
        # Area name is unavailable at prediction time, so try all segments
        # in the same GPS bin and select the closest one.
        prefix = f"unknown:{math.floor(float(lat)/GRID)}:{math.floor(float(lon)/GRID)}"
        matches = [v for k, v in payload.get("profiles", {}).items() if k.endswith(sid.split(":", 1)[1])]
        profile = matches[0] if matches else None
    if profile is None:
        profile = {
            "sample_count": 0,
            "danger_rate": payload.get("meta", {}).get("global_danger_rate", 0.35),
            "danger_count": 0, "moderate_count": 0, "safe_count": 0,
            "night_incidents": 0, "evening_incidents": 0,
            "avg_crime_count": 0, "avg_feedback_score": 3.0,
        }
    return sid, profile


def calibrated_risk(global_probs, road_profile):
    """Blend global ML probabilities with a road prior.

    More observations give the road prior more influence, while sparse/new
    segments fall back toward the global model.
    """
    probs = dict(global_probs)
    sample_count = int(road_profile.get("sample_count", 0))
    prior = float(road_profile.get("danger_rate", 0.35))
    # 0 for unknown, approaching 0.30 for well-observed segments.
    weight = min(0.30, 0.30 * (sample_count / 40.0))
    current_danger = float(probs.get("danger", 0.0))
    adjusted_danger = current_danger * (1 - weight) + prior * weight
    delta = adjusted_danger - current_danger
    probs["danger"] = max(0.0, min(1.0, adjusted_danger))
    # Redistribute the delta proportionally across non-danger classes.
    others = [k for k in probs if k != "danger"]
    total_other = sum(float(probs[k]) for k in others)
    if total_other > 0:
        for k in others:
            probs[k] = max(0.0, float(probs[k]) - delta * float(probs[k]) / total_other)
    s = sum(probs.values()) or 1.0
    return {k: round(float(v / s), 4) for k, v in probs.items()}
