from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.alert_model import AlertModel
from models.emergency_model import EmergencyModel
from models.user_model import UserModel
from models.authority_model import AuthorityModel

from utils.sms_service import send_sos_sms
from utils.email_service import send_sos_email

alert_bp = Blueprint("alert", __name__, url_prefix="/api/alert")

alert_model = AlertModel()
emergency_model = EmergencyModel()
user_model = UserModel()
authority_model = AuthorityModel()

# Valid SOS classifications. Keep in sync with the frontend SOS type picker.
VALID_SOS_TYPES = ["medical", "fire", "crime", "harassment", "accident", "other"]


# ---------------------------------------------------------------------
# CREATE ALERT
# ---------------------------------------------------------------------
@alert_bp.route("/create", methods=["POST"])
@jwt_required()
def create_alert():
    user_id = get_jwt_identity()
    data = request.get_json()

    required = ["alert_type", "latitude", "longitude"]

    for field in required:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    location = {
        "latitude": data["latitude"],
        "longitude": data["longitude"]
    }

    alert_id = alert_model.create_alert(
        user_id,
        data["alert_type"],
        location,
        data.get("message", "")
    )

    return jsonify({
        "message": "Alert created",
        "id": alert_id
    }), 201


# ---------------------------------------------------------------------
# ALERT HISTORY
# ---------------------------------------------------------------------
@alert_bp.route("/history", methods=["GET"])
@jwt_required()
def alert_history():
    user_id = get_jwt_identity()
    alerts = alert_model.get_user_alerts(user_id)

    return jsonify({"alerts": alerts}), 200


# ---------------------------------------------------------------------
# RESOLVE ALERT
# ---------------------------------------------------------------------
@alert_bp.route("/resolve/<alert_id>", methods=["PUT"])
@jwt_required()
def resolve_alert(alert_id):
    alert_model.resolve_alert(alert_id)

    return jsonify({
        "message": "Alert resolved"
    }), 200


# ---------------------------------------------------------------------
# SOS
# ---------------------------------------------------------------------
@alert_bp.route("/sos", methods=["POST"])
@jwt_required()
def sos():

    user_id = get_jwt_identity()
    data = request.get_json()

    lat = data.get("latitude")
    lon = data.get("longitude")

    if lat is None or lon is None:
        return jsonify({
            "error": "Location required for SOS"
        }), 400

    # -------------------------------------------------
    # User
    # -------------------------------------------------

    user = user_model.find_by_id(user_id)

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    user_name = user.get("name", "Unknown User")
    user_phone = user.get("phone", "")
    zone_name = data.get("zone_name", "Unknown Location")

    sos_type = data.get("sos_type", "other")
    if sos_type not in VALID_SOS_TYPES:
        sos_type = "other"

    # -------------------------------------------------
    # Save SOS
    # -------------------------------------------------

    sos_id = emergency_model.log_sos(
        user_id,
        lat,
        lon,
        sos_type=sos_type
    )

    location = {
        "latitude": lat,
        "longitude": lon
    }

    alert_id = alert_model.create_alert(
        user_id,
        "sos",
        location,
        f"{sos_type.upper()} SOS triggered by {user_name} at {zone_name}",
        sos_type=sos_type
    )

    # -------------------------------------------------
    # Notify nearest local authority (simulated — see
    # models/authority_model.py for why this can't be real)
    # -------------------------------------------------

    authority_notified = authority_model.notify_for_sos(
        sos_type, lat, lon, user_id, user_name, alert_id
    )

    # -------------------------------------------------
    # Collect contacts
    # -------------------------------------------------

    db_contacts = emergency_model.get_contacts(user_id)

    user_contacts = user.get(
        "emergency_contacts",
        []
    )

    all_contacts = []
    seen = set()

    for c in db_contacts + user_contacts:

        phone = c.get("phone", "").strip()

        if phone and phone not in seen:

            seen.add(phone)

            all_contacts.append({
                "name": c.get("name", "Emergency Contact"),
                "phone": phone,
                "email": c.get("email", "")
            })

    print(f"\n🚨 SOS TRIGGERED by {user_name}")
    print(f"Location : {lat},{lon}")
    print(f"Zone : {zone_name}")

    # -------------------------------------------------
    # SMS + EMAIL
    # -------------------------------------------------

    sms_results = []
    email_results = []

    for contact in all_contacts:

        # SMS
        sms = send_sos_sms(
            contact_name=contact["name"],
            contact_phone=contact["phone"],
            user_name=user_name,
            lat=lat,
            lon=lon,
            zone_name=zone_name,
            sos_type=sos_type
        )

        sms_results.append({
            "contact": contact["name"],
            "phone": contact["phone"],
            "sent": sms.get("success", False),
            "simulated": sms.get("simulated", False)
        })

        # EMAIL
        if contact.get("email"):

            email = send_sos_email(
                receiver_email=contact["email"],
                contact_name=contact["name"],
                user_name=user_name,
                lat=lat,
                lon=lon,
                zone_name=zone_name,
                sos_type=sos_type
            )

            email_results.append({
                "contact": contact["name"],
                "email": contact["email"],
                "sent": email.get("success", False)
            })

    maps_link = f"https://maps.google.com/?q={lat},{lon}"

    return jsonify({

        "message": "SOS triggered successfully",

        "sos_id": sos_id,

        "alert_id": alert_id,

        "sos_type": sos_type,

        "authority_notified": authority_notified,

        "user_name": user_name,

        "user_phone": user_phone,

        "contacts_notified": len(all_contacts),

        "contacts": all_contacts,

        "sms_results": sms_results,

        "email_results": email_results,

        "location": {
            "latitude": lat,
            "longitude": lon,
            "maps_link": maps_link
        },

        "emergency_numbers": {
            "police": "100",
            "ambulance": "108",
            "fire": "101",
            "women_helpline": "1091"
        }

    }), 200