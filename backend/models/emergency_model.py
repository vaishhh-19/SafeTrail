from datetime import datetime
from database import get_db

class EmergencyModel:
    def __init__(self):
        self.db         = get_db()
        self.collection = self.db["emergency_contacts"]
        self._create_indexes()

    def _create_indexes(self):
        self.collection.create_index("user_id")

    def add_contact(self, user_id, name, phone, relation="", email=""):
        """Add an emergency contact."""
        doc = {
            "user_id":    user_id,
            "name":       name,
            "phone":      phone,
            "email":      email,
            "relation":   relation,
            "created_at": datetime.utcnow(),
        }
        result = self.collection.insert_one(doc)
        return str(result.inserted_id)

    def get_contacts(self, user_id):
        """Get all emergency contacts for a user."""
        cursor = self.collection.find({"user_id": user_id})
        return [self._format(doc) for doc in cursor]

    def delete_contact(self, contact_id):
        """Delete an emergency contact."""
        from bson import ObjectId
        self.collection.delete_one({"_id": ObjectId(contact_id)})

    def log_sos(self, user_id, lat, lon, sos_type="other"):
        """Log an SOS event."""
        sos_col = self.db["sos_logs"]
        doc = {
            "user_id":   user_id,
            "sos_type":  sos_type,
            "location": {"latitude": lat, "longitude": lon},
            "timestamp": datetime.utcnow(),
            "resolved":  False,
        }
        result = sos_col.insert_one(doc)
        return str(result.inserted_id)

    def _format(self, doc):
        if not doc:
            return None
        return {
            "id":         str(doc["_id"]),
            "user_id":    doc["user_id"],
            "name":       doc.get("name", ""),
            "phone":      doc.get("phone", ""),
            "email":      doc.get("email", ""),
            "relation":   doc.get("relation", ""),
            "created_at": str(doc.get("created_at", "")),
        }