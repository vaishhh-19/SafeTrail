import sys
import os
import threading

# Add ml/ folder to Python path so we can trigger a retrain from here
ML_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "ml")
sys.path.insert(0, os.path.abspath(ML_PATH))

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt
from models.admin_model import AdminModel
from models.feedback_model import FeedbackModel
from models.alert_model import AlertModel
from models.authority_model import AuthorityModel

admin_bp       = Blueprint("admin", __name__, url_prefix="/api/admin")
admin_model    = AdminModel()
feedback_model = FeedbackModel()
alert_model    = AlertModel()
authority_model = AuthorityModel()

# Guards against two retrains running at once (e.g. two feedback items
# approved back-to-back triggering overlapping background retrains).
_retrain_lock = threading.Lock()


def admin_required():
    claims = get_jwt()
    return claims.get("role") == "admin"


def _run_auto_retrain(app):
    """Runs a full retrain in a background thread so approving feedback
    stays fast for the admin. Cloud upload (if configured) happens as
    part of retrain_from_feedback() -> cloud_sync.upload_models_to_cloud().
    """
    if not _retrain_lock.acquire(blocking=False):
        print("⏭️  Auto-retrain already running — skipping this trigger")
        return
    try:
        with app.app_context():
            from retrain_from_feedback import retrain_from_feedback
            report = retrain_from_feedback()
            try:
                from predict import load_models
                load_models()
            except Exception:
                pass
            print(f"✅ Auto-retrain complete: {report}")
    except Exception as e:
        print(f"⚠️  Auto-retrain failed: {e}")
    finally:
        _retrain_lock.release()


def trigger_auto_retrain_async():
    """Fire-and-forget retrain trigger, called whenever new approved
    feedback exists (e.g. right after an admin approves a report)."""
    app = current_app._get_current_object()
    threading.Thread(target=_run_auto_retrain, args=(app,), daemon=True).start()




@admin_bp.route("/road-intelligence", methods=["GET"])
@jwt_required()
def road_intelligence():
    """Return trained road-segment priors and model evaluation metrics."""
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    import json, os
    model_dir = os.path.join(ML_PATH, "models")
    try:
        with open(os.path.join(model_dir, "road_profiles.json"), encoding="utf-8") as f:
            payload = json.load(f)
    except Exception:
        payload = {"profiles": {}, "meta": {}}
    try:
        with open(os.path.join(model_dir, "training_metrics.json"), encoding="utf-8") as f:
            metrics = json.load(f)
    except Exception:
        metrics = {}
    profiles = []
    for segment_id, profile in payload.get("profiles", {}).items():
        profiles.append({"road_segment_id": segment_id, **profile})
    profiles.sort(key=lambda x: (x.get("danger_rate", 0), x.get("sample_count", 0)), reverse=True)
    return jsonify({"metrics": metrics, "road_segments": profiles[:100], "meta": payload.get("meta", {})}), 200



@admin_bp.route("/area-intelligence", methods=["GET"])
@jwt_required()
def area_intelligence():
    """Return named-area profiles and per-area model metrics."""
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403

    import json
    import os

    model_dir = os.path.join(ML_PATH, "models")

    try:
        with open(
            os.path.join(model_dir, "area_profiles.json"),
            encoding="utf-8",
        ) as f:
            payload = json.load(f)
    except Exception:
        payload = {"profiles": {}, "meta": {}}

    try:
        with open(
            os.path.join(model_dir, "training_metrics.json"),
            encoding="utf-8",
        ) as f:
            metrics = json.load(f)
    except Exception:
        metrics = {}

    evaluation = {
        item.get("area_name"): item
        for item in metrics.get("area_metrics", [])
    }

    areas = []
    for name, profile in payload.get("profiles", {}).items():
        areas.append({
            "area_name": name,
            **profile,
            "evaluation": evaluation.get(name, {}),
        })

    areas.sort(
        key=lambda x: (
            x.get("danger_rate", 0),
            x.get("sample_count", 0),
        ),
        reverse=True,
    )

    return jsonify({
        "areas": areas,
        "meta": payload.get("meta", {}),
        "model_metrics": {
            "global": metrics.get("global", {}),
            "area_calibrated": metrics.get("area_calibrated", {}),
            "road_calibrated": metrics.get("road_calibrated", {}),
        },
    }), 200


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def get_users():
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    users = admin_model.get_all_users()
    return jsonify({"users": users}), 200


@admin_bp.route("/users/<user_id>/deactivate", methods=["PUT"])
@jwt_required()
def deactivate_user(user_id):
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    admin_model.deactivate_user(user_id)
    return jsonify({"message": "User deactivated"}), 200


@admin_bp.route("/users/<user_id>/activate", methods=["PUT"])
@jwt_required()
def activate_user(user_id):
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    admin_model.activate_user(user_id)
    return jsonify({"message": "User activated"}), 200


@admin_bp.route("/analytics", methods=["GET"])
@jwt_required()
def analytics():
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    data = admin_model.get_analytics()
    return jsonify({"analytics": data}), 200


@admin_bp.route("/feedback", methods=["GET"])
@jwt_required()
def get_feedback():
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    feedback = feedback_model.get_all_feedback()
    return jsonify({"feedback": feedback}), 200


@admin_bp.route("/feedback/<feedback_id>/approve", methods=["PUT"])
@jwt_required()
def approve_feedback(feedback_id):
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    feedback_model.approve_feedback(feedback_id)

    # Auto-retrain: every time feedback is approved, kick off a retrain
    # in the background (and cloud-sync the resulting model, if cloud
    # storage is configured) instead of waiting for a manual click.
    trigger_auto_retrain_async()

    return jsonify({
        "message": "Feedback approved — retraining started in background",
    }), 200


@admin_bp.route("/feedback/<feedback_id>/reject", methods=["PUT"])
@jwt_required()
def reject_feedback(feedback_id):
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    feedback_model.reject_feedback(feedback_id)
    return jsonify({"message": "Feedback rejected"}), 200


@admin_bp.route("/alerts", methods=["GET"])
@jwt_required()
def get_all_alerts():
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    alerts = alert_model.get_all_alerts()
    return jsonify({"alerts": alerts}), 200


@admin_bp.route("/live-locations", methods=["GET"])
@jwt_required()
def live_locations():
    """Continuously-updating GPS position for every user who currently
    has an active SOS/danger alert -- for the admin 'in case of danger'
    live tracking view."""
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    locations = admin_model.get_live_locations()
    return jsonify({"locations": locations}), 200


# ---------------------------------------------------------------------
# LIVE NOTIFICATIONS — polled every few seconds by the admin dashboard
# ---------------------------------------------------------------------
@admin_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    """Unseen active alerts (SOS + danger-zone entries) for the admin
    notification bell / toast feed."""
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    alerts = alert_model.get_unseen_alerts()
    return jsonify({
        "notifications": alerts,
        "unseen_count":  alert_model.count_unseen(),
    }), 200


@admin_bp.route("/notifications/<alert_id>/seen", methods=["PUT"])
@jwt_required()
def mark_notification_seen(alert_id):
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    alert_model.mark_seen(alert_id)
    return jsonify({"message": "Marked as seen"}), 200


@admin_bp.route("/notifications/mark-all-seen", methods=["PUT"])
@jwt_required()
def mark_all_notifications_seen():
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    alert_model.mark_all_seen()
    return jsonify({"message": "All notifications marked as seen"}), 200


# ---------------------------------------------------------------------
# SIMULATED AUTHORITY NOTIFICATION LOG
# ---------------------------------------------------------------------
@admin_bp.route("/authority-notifications", methods=["GET"])
@jwt_required()
def authority_notifications():
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403
    return jsonify({"notifications": authority_model.get_recent_notifications()}), 200


# ---------------------------------------------------------------------
# ML RETRAINING — folds approved feedback back into the risk model
# ---------------------------------------------------------------------
@admin_bp.route("/retrain", methods=["POST"])
@jwt_required()
def retrain_model():
    """Retrain the Random Forest / Isolation Forest risk-classification
    models using approved user feedback as additional labeled data."""
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403

    try:
        from retrain_from_feedback import retrain_from_feedback
        report = retrain_from_feedback()

        # Reload the freshly-trained models into the live predictor so
        # the API reflects the retrain without needing a server restart.
        try:
            from predict import load_models
            load_models()
        except Exception:
            pass

        return jsonify({"message": "Retraining complete", "report": report}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Retraining failed: {str(e)}"}), 500