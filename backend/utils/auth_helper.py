import bcrypt
from flask_jwt_extended import create_access_token
from datetime import timedelta

def hash_password(plain_password):
    """Hash a plain text password."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def check_password(plain_password, hashed_password):
    """Verify a plain password against hashed."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )

def generate_token(user_id, email, role="user"):
    """Generate a JWT access token."""
    token = create_access_token(
        identity=str(user_id),
        additional_claims={"email": email, "role": role},
        expires_delta=timedelta(days=7)
    )
    return token

def format_user(user):
    """Convert MongoDB user document to JSON-safe dict."""
    return {
        "id":                  str(user["_id"]),
        "name":                user.get("name", ""),
        "email":               user.get("email", ""),
        "phone":               user.get("phone", ""),
        "blood_group":         user.get("blood_group", ""),
        "home_address":        user.get("home_address", ""),
        "role":                user.get("role", "user"),
        "emergency_contacts":  user.get("emergency_contacts", []),
        "created_at":          str(user.get("created_at", "")),
    }