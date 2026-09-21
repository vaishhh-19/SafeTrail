from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from database import init_db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=["http://localhost:5173"])
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

if __name__ == "__main__":
    app = create_app()
    app.run(debug=Config.DEBUG, port=5000)