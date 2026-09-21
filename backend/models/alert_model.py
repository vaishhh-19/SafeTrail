from datetime import datetime
from database import get_db

class AlertModel:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["alerts"]
        self._create_indexes()

    def _create_indexes(self):
        self.collection.create_index("user_id")
        self.collection.create_index("timestamp")
        self.collection.create_index("alert_type")

    def create_alert(self, user_id, alert_type, location, message="", sos_type=None):
        """
        Create a new alert.
        alert_type: "danger_zone", "sos", "moderate_zone"
        sos_type (only meaningful when alert_type == "sos"):
            "medical", "fire", "crime", "harassment", "accident", "other"
        """
        doc = {
            "user_id":    user_id,
            "alert_type": alert_type,
            "sos_type":   sos_type,
            "message":    message,
            "location": {
                "latitude":  location.get("latitude"),
                "longitude": location.get("longitude"),
            },
            # status: "active", "resolved", "ignored"
            "status":        "active",
            "responded":     False,
            # has an admin seen this in the live notification feed yet?
            "seen_by_admin": False,
            "timestamp":     datetime.utcnow(),
        }
        result = self.collection.insert_one(doc)
        return str(result.inserted_id)

    def get_unseen_alerts(self, limit=50):
        """Admin: alerts not yet acknowledged in the notification feed."""
        cursor = (
            self.collection
            .find({"seen_by_admin": False, "status": "active"})
            .sort("timestamp", -1)
            .limit(limit)
        )
        return [self._format(doc) for doc in cursor]

    def count_unseen(self):
        return self.collection.count_documents({"seen_by_admin": False, "status": "active"})

    def mark_seen(self, alert_id):
        from bson import ObjectId
        self.collection.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"seen_by_admin": True}}
        )

    def mark_all_seen(self):
        self.collection.update_many(
            {"seen_by_admin": False},
            {"$set": {"seen_by_admin": True}}
        )

    def get_user_alerts(self, user_id, limit=20):
        """Get alert history for a user."""
        cursor = (
            self.collection
            .find({"user_id": user_id})
            .sort("timestamp", -1)
            .limit(limit)
        )
        return [self._format(doc) for doc in cursor]

    def resolve_alert(self, alert_id):
        """Mark alert as resolved."""
        from bson import ObjectId
        self.collection.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"status": "resolved", "responded": True}}
        )

    def get_all_alerts(self, limit=100):
        """Admin: get all alerts."""
        cursor = (
            self.collection
            .find()
            .sort("timestamp", -1)
            .limit(limit)
        )
        return [self._format(doc) for doc in cursor]

    def _format(self, doc):
        if not doc:
            return None
        return {
            "id":            str(doc["_id"]),
            "user_id":       doc["user_id"],
            "alert_type":    doc["alert_type"],
            "sos_type":      doc.get("sos_type"),
            "message":       doc.get("message", ""),
            "latitude":      doc["location"]["latitude"],
            "longitude":     doc["location"]["longitude"],
            "status":        doc["status"],
            "responded":     doc["responded"],
            "seen_by_admin": doc.get("seen_by_admin", True),
            "timestamp":     str(doc["timestamp"]),
        }