from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.location_model import LocationModel
from models.emergency_model import EmergencyModel
from models.user_model import UserModel
from utils.auth_helper import format_user

user_bp         = Blueprint("user", __name__, url_prefix="/api/user")
location_model  = LocationModel()
emergency_model = EmergencyModel()
user_model      = UserModel()


@user_bp.route("/location", methods=["POST"])
@jwt_required()
def save_location():
    user_id = get_jwt_identity()
    data    = request.get_json()
    lat     = data.get("latitude")
    lon     = data.get("longitude")
    if lat is None or lon is None:
        return jsonify({"error": "latitude and longitude are required"}), 400
    loc_id = location_model.save_location(user_id, lat, lon, data.get("accuracy"))
    return jsonify({"message": "Location saved", "id": loc_id}), 201


@user_bp.route("/location/history", methods=["GET"])
@jwt_required()
def location_history():
    user_id   = get_jwt_identity()
    locations = location_model.get_user_locations(user_id)
    return jsonify({"locations": locations}), 200


@user_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data    = request.get_json()
    allowed = ["name", "phone", "blood_group", "home_address"]
    update  = {k: data[k] for k in allowed if k in data}
    if not update:
        return jsonify({"error": "No valid fields to update"}), 400
    from database import get_db
    from bson import ObjectId
    from datetime import datetime
    get_db()["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {**update, "updated_at": datetime.utcnow()}}
    )
    user = user_model.find_by_id(user_id)
    return jsonify({"message": "Profile updated", "user": format_user(user)}), 200


@user_bp.route("/emergency-contact/primary", methods=["PUT"])
@jwt_required()
def update_primary_contact():
    """Edit the emergency contact captured at registration time
    (stored as emergency_contacts.0 on the user document). This is the
    only way to fix/add its email after signup, since that contact
    doesn't live in the emergency_contacts collection."""
    user_id = get_jwt_identity()
    data    = request.get_json() or {}

    if not data.get("name") or not data.get("phone"):
        return jsonify({"error": "Name and phone are required"}), 400

    from database import get_db
    from bson import ObjectId
    from datetime import datetime

    db   = get_db()
    user = db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    contacts = user.get("emergency_contacts", [])
    updated_contact = {
        "name":     data["name"],
        "phone":    data["phone"],
        "relation": data.get("relation", "Other"),
        "email":    data.get("email", ""),
    }
    if contacts:
        contacts[0] = updated_contact
    else:
        contacts = [updated_contact]

    db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"emergency_contacts": contacts, "updated_at": datetime.utcnow()}}
    )
    user = user_model.find_by_id(user_id)
    return jsonify({"message": "Primary contact updated", "user": format_user(user)}), 200


@user_bp.route("/emergency-contact", methods=["POST"])
@jwt_required()
def add_contact():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    if not data.get("name") or not data.get("phone"):
        return jsonify({"error": "Name and phone are required"}), 400

    phone = str(data["phone"]).strip()
    user = user_model.find_by_id(user_id)
    existing = emergency_model.get_contacts(user_id)
    existing_phones = {str(c.get("phone", "")).strip() for c in existing}
    existing_phones.update(str(c.get("phone", "")).strip() for c in (user or {}).get("emergency_contacts", []))
    if phone in existing_phones:
        return jsonify({"error": "This emergency contact is already added"}), 409

    contact = {
        "name": str(data["name"]).strip(),
        "phone": phone,
        "relation": str(data.get("relation", "Other")).strip() or "Other",
        "email": str(data.get("email", "")).strip(),
    }

    # Store the new contact in the user document so SOS always sees it.
    from database import get_db
    from bson import ObjectId
    from datetime import datetime
    db = get_db()
    db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$push": {"emergency_contacts": contact}, "$set": {"updated_at": datetime.utcnow()}}
    )

    # Keep the legacy collection for existing Profile flows.
    contact_id = emergency_model.add_contact(
        user_id, contact["name"], contact["phone"], contact["relation"], contact["email"]
    )
    user = user_model.find_by_id(user_id)
    return jsonify({"message": "Contact added", "id": contact_id, "user": format_user(user)}), 201


@user_bp.route("/emergency-contacts", methods=["GET"])
@jwt_required()
def get_contacts():
    user_id = get_jwt_identity()
    user = user_model.find_by_id(user_id)
    legacy_contacts = emergency_model.get_contacts(user_id)
    profile_contacts = (user or {}).get("emergency_contacts", [])

    merged = []
    seen = set()
    for contact in profile_contacts + legacy_contacts:
        phone = str(contact.get("phone", "")).strip()
        if not phone or phone in seen:
            continue
        seen.add(phone)
        merged.append({
            "id": contact.get("id", ""),
            "name": contact.get("name", "Emergency Contact"),
            "phone": phone,
            "email": contact.get("email", ""),
            "relation": contact.get("relation", "Other"),
        })
    return jsonify({"contacts": merged}), 200


@user_bp.route("/emergency-contact/<contact_id>", methods=["DELETE"])
@jwt_required()
def delete_contact(contact_id):
    user_id = get_jwt_identity()
    from database import get_db
    from bson import ObjectId
    from datetime import datetime
    db = get_db()
    legacy = db["emergency_contacts"].find_one({"_id": ObjectId(contact_id)})
    if legacy and legacy.get("user_id") == user_id:
        phone = str(legacy.get("phone", "")).strip()
        emergency_model.delete_contact(contact_id)
        if phone:
            db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {"$pull": {"emergency_contacts": {"phone": phone}}, "$set": {"updated_at": datetime.utcnow()}}
            )
    return jsonify({"message": "Contact deleted"}), 200
