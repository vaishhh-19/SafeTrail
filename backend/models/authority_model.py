"""
Simulated local-authority directory.

There is no public API a student project can legally call to dispatch a
real police unit, so this model keeps a seeded directory of local
authorities (police stations, fire stations, hospitals / ambulance
control rooms) per SOS category, picks the nearest one to the user's
GPS position, and *logs* a notification record for it -- this is what
gets shown to the user ("Nearest police station notified: ...") and to
the admin dashboard. It never actually contacts a real station.

Real communication (SMS + email) still goes out for real, but only to
the user's own emergency contacts, via utils/sms_service.py and
utils/email_service.py -- that part is NOT simulated.
"""
import math
from datetime import datetime
from database import get_db


def _distance_m(lat1, lon1, lat2, lon2):
    R = 6371000
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Maps an SOS classification to which kind(s) of authority station
# should be notified, in priority order.
SOS_TYPE_TO_AUTHORITY = {
    "medical":    ["ambulance", "hospital"],
    "fire":       ["fire"],
    "crime":      ["police"],
    "harassment": ["police"],
    "accident":   ["ambulance", "police"],
    "other":      ["police"],
}

DEFAULT_STATIONS = [
    # ── Police ───────────────────────────────────────────────
    {"name": "Padmanabhanagar Police Station", "type": "police",
     "phone": "080-26630474", "latitude": 12.9160, "longitude": 77.5580},
    {"name": "Jayanagar Police Station", "type": "police",
     "phone": "080-26630075", "latitude": 12.9250, "longitude": 77.5830},
    {"name": "KR Market Police Station", "type": "police",
     "phone": "080-26702247", "latitude": 12.9625, "longitude": 77.5770},
    {"name": "Majestic Police Station", "type": "police",
     "phone": "080-22860889", "latitude": 12.9767, "longitude": 77.5713},
    {"name": "Indiranagar Police Station", "type": "police",
     "phone": "080-25292215", "latitude": 12.9784, "longitude": 77.6408},
    {"name": "Koramangala Police Station", "type": "police",
     "phone": "080-25532562", "latitude": 12.9352, "longitude": 77.6245},
    {"name": "Whitefield Police Station", "type": "police",
     "phone": "080-28452240", "latitude": 12.9698, "longitude": 77.7500},
    # ── Fire ─────────────────────────────────────────────────
    {"name": "Fire & Emergency Services - Jayanagar", "type": "fire",
     "phone": "101", "latitude": 12.9280, "longitude": 77.5830},
    {"name": "Fire & Emergency Services - Koramangala", "type": "fire",
     "phone": "101", "latitude": 12.9350, "longitude": 77.6250},
    {"name": "Fire & Emergency Services - Whitefield", "type": "fire",
     "phone": "101", "latitude": 12.9700, "longitude": 77.7490},
    # ── Ambulance / Hospitals ────────────────────────────────
    {"name": "108 Ambulance Control Room (Karnataka)", "type": "ambulance",
     "phone": "108", "latitude": 12.9716, "longitude": 77.5946},
    {"name": "BGS Global Hospital", "type": "hospital",
     "phone": "080-25086000", "latitude": 12.9080, "longitude": 77.5610},
    {"name": "St. John's Medical College Hospital", "type": "hospital",
     "phone": "080-49467000", "latitude": 12.9280, "longitude": 77.6220},
    {"name": "Manipal Hospital Whitefield", "type": "hospital",
     "phone": "080-25022222", "latitude": 12.9700, "longitude": 77.7510},
]


class AuthorityModel:
    def __init__(self):
        self.db = get_db()
        self.stations = self.db["authority_stations"]
        self.log = self.db["authority_notifications"]
        self._seed_if_empty()

    def _seed_if_empty(self):
        if self.stations.count_documents({}) == 0:
            self.stations.insert_many([dict(s) for s in DEFAULT_STATIONS])

    def _nearest(self, station_type, lat, lon):
        candidates = list(self.stations.find({"type": station_type}))
        if not candidates:
            return None
        best = min(
            candidates,
            key=lambda s: _distance_m(lat, lon, s["latitude"], s["longitude"])
        )
        best["distance_m"] = round(_distance_m(lat, lon, best["latitude"], best["longitude"]))
        return best

    def notify_for_sos(self, sos_type, lat, lon, user_id, user_name, alert_id):
        """
        Pick the nearest relevant authority station(s) for this SOS type,
        log a (simulated) dispatch record, and return the details so the
        frontend can display "who was notified".
        """
        wanted_types = SOS_TYPE_TO_AUTHORITY.get(sos_type, ["police"])
        notified = []

        for station_type in wanted_types:
            station = self._nearest(station_type, lat, lon)
            if not station:
                continue

            record = {
                "alert_id":     alert_id,
                "user_id":      user_id,
                "user_name":    user_name,
                "sos_type":     sos_type,
                "station_name": station["name"],
                "station_type": station["type"],
                "station_phone": station["phone"],
                "distance_m":   station["distance_m"],
                "latitude":     lat,
                "longitude":    lon,
                "simulated":    True,
                "timestamp":    datetime.utcnow(),
            }
            self.log.insert_one(record)

            notified.append({
                "name":       station["name"],
                "type":       station["type"],
                "phone":      station["phone"],
                "distance_m": station["distance_m"],
                "simulated":  True,
            })

        return notified

    def get_recent_notifications(self, limit=50):
        cursor = self.log.find().sort("timestamp", -1).limit(limit)
        out = []
        for d in cursor:
            out.append({
                "id":            str(d["_id"]),
                "alert_id":      d.get("alert_id"),
                "user_name":     d.get("user_name"),
                "sos_type":      d.get("sos_type"),
                "station_name":  d.get("station_name"),
                "station_type":  d.get("station_type"),
                "station_phone": d.get("station_phone"),
                "distance_m":    d.get("distance_m"),
                "timestamp":     str(d.get("timestamp")),
            })
        return out
