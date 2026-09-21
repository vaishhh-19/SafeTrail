from datetime import datetime
from database import get_db
from bson import ObjectId

class AdminModel:
    def __init__(self):
        self.db = get_db()

    def get_all_users(self):
        """Get all registered users."""
        cursor = self.db["users"].find(
            {},
            # Exclude password from results
            {"password": 0}
        )
        users = []
        for u in cursor:
            users.append({
                "id":         str(u["_id"]),
                "name":       u.get("name", ""),
                "email":      u.get("email", ""),
                "phone":      u.get("phone", ""),
                "role":       u.get("role", "user"),
                "is_active":  u.get("is_active", True),
                "created_at": str(u.get("created_at", "")),
            })
        return users

    def deactivate_user(self, user_id):
        """Disable a user account."""
        self.db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": False}}
        )

    def activate_user(self, user_id):
        """Re-enable a user account."""
        self.db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": True}}
        )

    def get_live_locations(self):
        """For every user who currently has an active alert (SOS or
        danger zone), return their most recent GPS ping. This is what
        actually updates over time, unlike the location frozen on the
        alert document at the moment it was created."""
        alerts_col    = self.db["alerts"]
        locations_col = self.db["locations"]

        active_alerts = alerts_col.find({"status": "active"}).sort("timestamp", -1)

        seen_users = {}
        for a in active_alerts:
            uid = a.get("user_id")
            if uid not in seen_users:
                seen_users[uid] = a.get("alert_type", "danger_zone")

        results = []
        for user_id, alert_type in seen_users.items():
            try:
                user = self.db["users"].find_one({"_id": ObjectId(user_id)}, {"password": 0})
            except Exception:
                user = None
            last_loc = locations_col.find_one(
                {"user_id": user_id}, sort=[("timestamp", -1)]
            )
            results.append({
                "user_id":      user_id,
                "name":         user.get("name", "Unknown") if user else "Unknown",
                "phone":        user.get("phone", "") if user else "",
                "alert_type":   alert_type,
                "latitude":     last_loc.get("latitude") if last_loc else None,
                "longitude":    last_loc.get("longitude") if last_loc else None,
                "last_updated": str(last_loc.get("timestamp")) if last_loc else None,
            })
        return results

    def get_analytics(self):
        """Dashboard analytics summary."""
        users_col      = self.db["users"]
        alerts_col     = self.db["alerts"]
        feedback_col   = self.db["feedback"]
        predictions_col = self.db["predictions"]

        total_users     = users_col.count_documents({})
        total_alerts    = alerts_col.count_documents({})
        danger_alerts   = alerts_col.count_documents({"alert_type": "danger_zone"})
        sos_alerts      = alerts_col.count_documents({"alert_type": "sos"})
        total_feedback  = feedback_col.count_documents({})
        pending_feedback = feedback_col.count_documents({"status": "pending"})
        total_predictions = predictions_col.count_documents({})
        danger_predictions = predictions_col.count_documents({"risk_level": "danger"})

        return {
            "total_users":          total_users,
            "total_alerts":         total_alerts,
            "danger_alerts":        danger_alerts,
            "sos_alerts":           sos_alerts,
            "total_feedback":       total_feedback,
            "pending_feedback":     pending_feedback,
            "total_predictions":    total_predictions,
            "danger_predictions":   danger_predictions,
        }