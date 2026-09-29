import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from database import init_db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    cors_env = os.getenv("CORS_ORIGINS", "")
    if cors_env.strip() == "*":
        allowed_origins = "*"
    elif cors_env.strip():
        allowed_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
    else:
        allowed_origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "https://vaishhh-19.github.io",
        ]

    CORS(app, origins=allowed_origins, supports_credentials=True)
    JWTManager(app)
    init_db()

    # Auto-seed geofence zones + the simulated authority directory the
    # first time the app runs against an empty database, so "no zones on
    # the map" can't happen just because seed_zones.py was never run by
    # hand. Safe to call on every startup -- it's a no-op once seeded.
    try:
        from seed_data import ensure_seeded
        ensure_seeded()
    except Exception as e:
        print(f"⚠️  Auto-seed skipped: {e}")

    from routes.auth            import auth_bp
    from routes.user_routes     import user_bp
    from routes.geofence_routes import geofence_bp
    from routes.alert_routes    import alert_bp
    from routes.feedback_routes import feedback_bp
    from routes.admin_routes    import admin_bp
    from routes.predict_routes  import predict_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(geofence_bp)
    app.register_blueprint(alert_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(predict_bp)

    @app.route("/")
    def health():
        return jsonify({"status": "ok", "message": "SafeTrail API running 🛡️"}), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Route not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app

try:
    app = create_app()
except Exception:
    app = None

if __name__ == "__main__":
    if app is None:
        app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)