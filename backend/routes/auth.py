from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user_model import UserModel
from utils.auth_helper import hash_password, check_password, generate_token, format_user
from models.emergency_model import EmergencyModel

auth_bp    = Blueprint("auth", __name__, url_prefix="/api/auth")
user_model = UserModel()
emergency_model = EmergencyModel()


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data received"}), 400

        required = ["name", "email", "phone", "password"]

        for field in required:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400

        if user_model.email_exists(data["email"]):
            return jsonify({"error": "Email already registered"}), 409

        data["password"] = hash_password(data["password"])

        # Support multiple emergency contacts. Keep the old single-contact
        # payload format working for backwards compatibility.
        emergency_contacts = data.get("emergency_contacts")
        if not isinstance(emergency_contacts, list) or not emergency_contacts:
            emergency = data.get("emergency_contact", {})
            emergency_contacts = [emergency]

        cleaned_contacts = []
        seen_phones = set()
        for contact in emergency_contacts:
            if not isinstance(contact, dict):
                continue
            name = str(contact.get("name", "")).strip()
            phone = str(contact.get("phone", "")).strip()
            email = str(contact.get("email", "")).strip()
            relation = str(contact.get("relation", "Other")).strip() or "Other"
            if not name or not phone:
                continue
            if phone in seen_phones:
                continue
            seen_phones.add(phone)
            cleaned_contacts.append({
                "name": name,
                "phone": phone,
                "relation": relation,
                "email": email
            })

        if not cleaned_contacts:
            return jsonify({"error": "At least one emergency contact is required"}), 400

        data["emergency_contacts"] = cleaned_contacts
        data.pop("emergency_contact", None)

        user_id = user_model.create_user(data)

        # Mirror registration contacts into the emergency_contacts collection.
        # The user document remains the source of truth, while the collection
        # keeps Profile/legacy flows compatible.
        for contact in cleaned_contacts:
            emergency_model.add_contact(
                user_id,
                contact["name"],
                contact["phone"],
                contact.get("relation", "Other"),
                contact.get("email", ""),
            )

        token = generate_token(
            user_id,
            data["email"],
            "user"
        )

        return jsonify({
            "message": "Account created successfully",
            "token": token,
            "user": format_user(
                user_model.find_by_id(user_id)
            )
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()

        return jsonify({
            "error": str(e)
        }), 500
# ── LOGIN ─────────────────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    user = user_model.find_by_email(data["email"])
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if user.get("role") == "admin":
        return jsonify({"error": "Admin account detected. Please use the Admin / Authority Login portal."}), 403

    if not check_password(data["password"], user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.get("is_active", True):
        return jsonify({"error": "Account is disabled"}), 403

    token = generate_token(str(user["_id"]), user["email"], user.get("role", "user"))
    return jsonify({
        "message": "Login successful",
        "token":   token,
        "user":    format_user(user)
    }), 200


# ── ADMIN LOGIN ──────────────────────────────────────────────────────────────
@auth_bp.route("/admin-login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Admin email and password are required"}), 400

    user = user_model.find_by_email(data["email"])
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Admin account not found or access denied"}), 403
    if not check_password(data["password"], user["password"]):
        return jsonify({"error": "Invalid admin email or password"}), 401
    if not user.get("is_active", True):
        return jsonify({"error": "Admin account is disabled"}), 403

    token = generate_token(str(user["_id"]), user["email"], "admin")
    return jsonify({"message": "Admin login successful", "token": token, "user": format_user(user)}), 200


# ── GET PROFILE ───────────────────────────────────────────────────────────────
@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user    = user_model.find_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": format_user(user)}), 200


# ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data         = request.get_json()
    email        = data.get("email")
    new_password = data.get("new_password")

    if not email or not new_password:
        return jsonify({"error": "Email and new password are required"}), 400

    if not user_model.email_exists(email):
        return jsonify({"error": "No account found with this email"}), 404

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    user_model.update_password(email, hash_password(new_password))
    return jsonify({"message": "Password updated successfully"}), 200