from datetime import datetime
from database import get_db

class GeofenceModel:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["geofences"]
        self._create_indexes()

    def _create_indexes(self):
        self.collection.create_index("zone_type")
        self.collection.create_index("is_active")

    def create_zone(self, data):
        """Create a geofence zone."""
        doc = {
            "name":        data["name"],
            "description": data.get("description", ""),
            # zone_type: "safe", "moderate", "danger"
            "zone_type":   data["zone_type"],
            "center": {
                "latitude":  data["latitude"],
                "longitude": data["longitude"],
            },
            # radius in meters — kept tight by default so zones map to
            # the actual risky spot rather than a whole neighborhood
            "radius":      data.get("radius", 100),
            "is_active":   True,
            "created_by":  data.get("created_by", "admin"),
            "created_at":  datetime.utcnow(),
            "updated_at":  datetime.utcnow(),
        }
        result = self.collection.insert_one(doc)
        return str(result.inserted_id)

    def get_all_zones(self, active_only=True):
        """Get all geofence zones."""
        query = {"is_active": True} if active_only else {}
        cursor = self.collection.find(query)
        return [self._format(doc) for doc in cursor]

    def get_zone_by_type(self, zone_type):
        """Get zones by type: safe / moderate / danger."""
        cursor = self.collection.find({
            "zone_type": zone_type,
            "is_active": True
        })
        return [self._format(doc) for doc in cursor]

    def delete_zone(self, zone_id):
        """Soft delete a zone."""
        from bson import ObjectId
        self.collection.update_one(
            {"_id": ObjectId(zone_id)},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )

    def _format(self, doc):
        if not doc:
            return None
        return {
            "id":          str(doc["_id"]),
            "name":        doc["name"],
            "description": doc.get("description", ""),
            "zone_type":   doc["zone_type"],
            "latitude":    doc["center"]["latitude"],
            "longitude":   doc["center"]["longitude"],
            "radius":      doc["radius"],
            "is_active":   doc["is_active"],
            "created_at":  str(doc["created_at"]),
        }