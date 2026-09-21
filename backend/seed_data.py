"""
Idempotent startup seeding.

Called once from app.py on every boot. If the geofences collection (or
the authority-station directory) is already populated, this does
nothing — so it's always safe to leave enabled, in dev and prod alike.
This is what guarantees the map's zones are never simply "missing"
because nobody remembered to run seed_zones.py by hand.
"""
from datetime import datetime
from database import get_db

ZONES = [
    {"name": "Padmanabhanagar Safe Zone", "description": "Residential area — low crime",
     "zone_type": "safe", "center": {"latitude": 12.9163, "longitude": 77.5593}, "radius": 800},
    {"name": "DEMO Danger Zone (Examiner)", "description": "Simulated danger zone — for project demonstration",
     "zone_type": "danger", "center": {"latitude": 12.9300, "longitude": 77.5650}, "radius": 1000},
    {"name": "DEMO Moderate Zone (Examiner)", "description": "Simulated moderate zone — for project demonstration",
     "zone_type": "moderate", "center": {"latitude": 12.9220, "longitude": 77.5620}, "radius": 600},
    {"name": "KR Market High Risk", "description": "High theft and robbery incidents",
     "zone_type": "danger", "center": {"latitude": 12.9625, "longitude": 77.5770}, "radius": 500},
    {"name": "Majestic Bus Stand", "description": "High crime — chain snatching, theft",
     "zone_type": "danger", "center": {"latitude": 12.9767, "longitude": 77.5713}, "radius": 400},
    {"name": "Chickpet Market", "description": "Moderate to high risk area",
     "zone_type": "danger", "center": {"latitude": 12.9680, "longitude": 77.5750}, "radius": 400},
    {"name": "Shivajinagar", "description": "Moderate crime density",
     "zone_type": "moderate", "center": {"latitude": 12.9850, "longitude": 77.6010}, "radius": 600},
    {"name": "Koramangala", "description": "Moderate risk residential area",
     "zone_type": "moderate", "center": {"latitude": 12.9352, "longitude": 77.6245}, "radius": 700},
    {"name": "Whitefield Tech Park", "description": "Safe — gated tech community",
     "zone_type": "safe", "center": {"latitude": 12.9698, "longitude": 77.7500}, "radius": 1000},
    {"name": "Indiranagar", "description": "Safe residential area",
     "zone_type": "safe", "center": {"latitude": 12.9784, "longitude": 77.6408}, "radius": 800},
    {"name": "Jyothy Institute of Technology", "description": "Safe college campus",
     "zone_type": "safe", "center": {"latitude": 12.9165, "longitude": 77.5590}, "radius": 300},
]


def ensure_seeded():
    db = get_db()
    geofences = db["geofences"]

    if geofences.count_documents({}) == 0:
        now = datetime.utcnow()
        docs = []
        for z in ZONES:
            docs.append({
                **z,
                "is_active":  True,
                "created_by": "auto-seed",
                "created_at": now,
                "updated_at": now,
            })
        geofences.insert_many(docs)
        print(f"✅ Auto-seeded {len(docs)} geofence zones (collection was empty)")

    # Importing AuthorityModel seeds the simulated police/fire/ambulance
    # directory if it's empty, via its own constructor.
    from models.authority_model import AuthorityModel
    AuthorityModel()
