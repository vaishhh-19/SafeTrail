from datetime import datetime
from database import get_db

class FeedbackModel:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["feedback"]
        self._create_indexes()

    def _create_indexes(self):
        self.collection.create_index("user_id")
        self.collection.create_index("status")
        self.collection.create_index("timestamp")

    def create_feedback(self, user_id, data):
        """Submit feedback about an unsafe area."""
        doc = {
            "user_id":     user_id,
            "location": {
                "latitude":  data["latitude"],
                "longitude": data["longitude"],
            },
            "address":     data.get("address", ""),
            "comment":     data.get("comment", ""),
            # rating: 1 (very unsafe) to 5 (very safe)
            "rating":      data.get("rating", 1),
            "photo_url":   data.get("photo_url", ""),
            # status: "pending", "approved", "rejected"
            "status":      "pending",
            # has this feedback already been folded into a model retrain?
            "used_in_training": False,
            "timestamp":   datetime.utcnow(),
        }
        result = self.collection.insert_one(doc)
        return str(result.inserted_id)

    def get_approved_unused_feedback(self):
        """Approved feedback that hasn't been used to retrain the model yet."""
        cursor = self.collection.find({
            "status": "approved",
            "used_in_training": {"$ne": True},
        })
        return list(cursor)

    def mark_used_in_training(self, feedback_ids):
        from bson import ObjectId
        ids = [ObjectId(i) if not isinstance(i, ObjectId) else i for i in feedback_ids]
        self.collection.update_many(
            {"_id": {"$in": ids}},
            {"$set": {"used_in_training": True}}
        )

    def get_all_feedback(self, status=None):
        """Get feedback, optionally filtered by status."""
        query = {"status": status} if status else {}
        cursor = self.collection.find(query).sort("timestamp", -1)
        return [self._format(doc) for doc in cursor]

    def get_user_feedback(self, user_id):
        """Get feedback submitted by a specific user."""
        cursor = self.collection.find({"user_id": user_id}).sort("timestamp", -1)
        return [self._format(doc) for doc in cursor]

    def approve_feedback(self, feedback_id):
        """Admin approves a feedback report."""
        from bson import ObjectId
        self.collection.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": {"status": "approved"}}
        )

    def reject_feedback(self, feedback_id):
        """Admin rejects a feedback report."""
        from bson import ObjectId
        self.collection.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": {"status": "rejected"}}
        )

    def _format(self, doc):
        if not doc:
            return None
        return {
            "id":        str(doc["_id"]),
            "user_id":   doc["user_id"],
            "latitude":  doc["location"]["latitude"],
            "longitude": doc["location"]["longitude"],
            "address":   doc.get("address", ""),
            "comment":   doc.get("comment", ""),
            "rating":    doc.get("rating", 1),
            "photo_url": doc.get("photo_url", ""),
            "status":    doc["status"],
            "timestamp": str(doc["timestamp"]),
        }