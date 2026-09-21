"""
Geofence zones for SafeTrail — Bangalore
Run: python seed_zones.py
"""
from database import init_db
from datetime import datetime

db = init_db()
collection = db["geofences"]
collection.delete_many({})

zones = [
    # ── Your actual area — Padmanabhanagar ──────────────────────────
    {
        "name": "Padmanabhanagar Safe Zone",
        "description": "Residential area — low crime",
        "zone_type": "safe",
        "center": {"latitude": 12.9163, "longitude": 77.5593},
        "radius": 400,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    # ── Demo zone for examiner — place danger zone nearby ───────────
    {
        "name": "DEMO Danger Zone (Examiner)",
        "description": "Simulated danger zone — for project demonstration",
        "zone_type": "danger",
        "center": {"latitude": 12.9300, "longitude": 77.5650},
        "radius": 500,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "name": "DEMO Moderate Zone (Examiner)",
        "description": "Simulated moderate zone — for project demonstration",
        "zone_type": "moderate",
        "center": {"latitude": 12.9220, "longitude": 77.5620},
        "radius": 300,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    # ── Real Bangalore high crime zones ─────────────────────────────
    {
        "name": "KR Market High Risk",
        "description": "High theft and robbery incidents",
        "zone_type": "danger",
        "center": {"latitude": 12.9625, "longitude": 77.5770},
        "radius": 250,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "name": "Majestic Bus Stand",
        "description": "High crime — chain snatching, theft",
        "zone_type": "danger",
        "center": {"latitude": 12.9767, "longitude": 77.5713},
        "radius": 200,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "name": "Chickpet Market",
        "description": "Moderate to high risk area",
        "zone_type": "danger",
        "center": {"latitude": 12.9680, "longitude": 77.5750},
        "radius": 200,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "name": "Shivajinagar",
        "description": "Moderate crime density",
        "zone_type": "moderate",
        "center": {"latitude": 12.9850, "longitude": 77.6010},
        "radius": 300,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "name": "Koramangala",
        "description": "Moderate risk residential area",
        "zone_type": "moderate",
        "center": {"latitude": 12.9352, "longitude": 77.6245},
        "radius": 350,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "name": "Whitefield Tech Park",
        "description": "Safe — gated tech community",
        "zone_type": "safe",
        "center": {"latitude": 12.9698, "longitude": 77.7500},
        "radius": 500,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "name": "Indiranagar",
        "description": "Safe residential area",
        "zone_type": "safe",
        "center": {"latitude": 12.9784, "longitude": 77.6408},
        "radius": 400,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "name": "Jyothy Institute of Technology",
        "description": "Safe college campus",
        "zone_type": "safe",
        "center": {"latitude": 12.9165, "longitude": 77.5590},
        "radius": 150,
        "is_active": True,
        "created_by": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
]

result = collection.insert_many(zones)
print(f"✅ Inserted {len(result.inserted_ids)} geofence zones")
for zone in collection.find():
    print(f"  → {zone['zone_type'].upper():<10} {zone['name']}")