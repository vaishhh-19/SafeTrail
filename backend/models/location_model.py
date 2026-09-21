from datetime import datetime
from database import get_db

class LocationModel:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["locations"]
        self._create_indexes()

    def _create_indexes(self):
        """Create indexes for fast querying."""
        self.collection.create_index("user_id")
        self.collection.create_index("timestamp")

    def save_location(self, user_id, lat, lon, accuracy=None):
        """Save a GPS location ping."""
        doc = {
            "user_id":   user_id,
            "latitude":  lat,
            "longitude": lon,
            "accuracy":  accuracy,
            "timestamp": datetime.utcnow(),
        }
        result = self.collection.insert_one(doc)
        return str(result.inserted_id)

    def get_user_locations(self, user_id, limit=50):
        """Get recent locations for a user."""
        cursor = (
            self.collection
            .find({"user_id": user_id})
            .sort("timestamp", -1)
            .limit(limit)
        )
        return self._format_list(cursor)

    def get_last_location(self, user_id):
        """Get the most recent location of a user."""
        doc = self.collection.find_one(
            {"user_id": user_id},
            sort=[("timestamp", -1)]
        )
        return self._format(doc) if doc else None

    def _format(self, doc):
        if not doc:
            return None
        return {
            "id":        str(doc["_id"]),
            "user_id":   doc["user_id"],
            "latitude":  doc["latitude"],
            "longitude": doc["longitude"],
            "accuracy":  doc.get("accuracy"),
            "timestamp": str(doc["timestamp"]),
        }

    def _format_list(self, cursor):
        return [self._format(doc) for doc in cursor]