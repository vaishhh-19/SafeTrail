from datetime import datetime
from bson import ObjectId
from database import get_db

class UserModel:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["users"]

    def create_user(self, data):
        user = {
            "name": data["name"],
            "email": data["email"].lower().strip(),
            "password": data["password"],
            "phone": data.get("phone", ""),
            "blood_group": data.get("blood_group", ""),
            "home_address": data.get("home_address", ""),
            "emergency_contacts": data.get("emergency_contacts", []),
            "role": "user",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = self.collection.insert_one(user)
        return str(result.inserted_id)

    def find_by_email(self, email):
        return self.collection.find_one({
            "email": email.lower().strip()
        })

    def find_by_id(self, user_id):
        return self.collection.find_one({
            "_id": ObjectId(user_id)
        })

    def email_exists(self, email):
        return self.collection.find_one({
            "email": email.lower().strip()
        }) is not None

    def update_password(self, email, hashed_password):
        self.collection.update_one(
            {"email": email.lower().strip()},
            {
                "$set": {
                    "password": hashed_password,
                    "updated_at": datetime.utcnow()
                }
            }
        )