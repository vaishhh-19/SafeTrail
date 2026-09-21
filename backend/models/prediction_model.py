from datetime import datetime
from database import get_db

class PredictionModel:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["predictions"]
        self._create_indexes()

    def _create_indexes(self):
        self.collection.create_index("user_id")
        self.collection.create_index("timestamp")
        self.collection.create_index("risk_level")

    def save_prediction(self, user_id, lat, lon, risk_level, confidence, details=None):
        """
        Save an ML prediction result.
        risk_level: "safe", "moderate", "danger"
        confidence: float 0.0 to 1.0
        """
        doc = {
            "user_id":    user_id,
            "location": {
                "latitude":  lat,
                "longitude": lon,
            },
            "risk_level":  risk_level,
            "confidence":  confidence,
            "details":     details or {},
            "timestamp":   datetime.utcnow(),
        }
        result = self.collection.insert_one(doc)
        return str(result.inserted_id)

    def get_user_predictions(self, user_id, limit=20):
        """Get prediction history for a user."""
        cursor = (
            self.collection
            .find({"user_id": user_id})
            .sort("timestamp", -1)
            .limit(limit)
        )
        return [self._format(doc) for doc in cursor]

    def get_predictions_by_risk(self, risk_level, limit=100):
        """Get all predictions of a specific risk level — used for heatmap."""
        cursor = (
            self.collection
            .find({"risk_level": risk_level})
            .sort("timestamp", -1)
            .limit(limit)
        )
        return [self._format(doc) for doc in cursor]

    def get_all_predictions(self, limit=200):
        """Admin: get all predictions for heatmap."""
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
            "id":         str(doc["_id"]),
            "user_id":    doc["user_id"],
            "latitude":   doc["location"]["latitude"],
            "longitude":  doc["location"]["longitude"],
            "risk_level": doc["risk_level"],
            "confidence": doc["confidence"],
            "details":    doc.get("details", {}),
            "timestamp":  str(doc["timestamp"]),
        }