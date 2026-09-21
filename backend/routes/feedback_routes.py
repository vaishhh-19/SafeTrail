from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.feedback_model import FeedbackModel

feedback_bp    = Blueprint("feedback", __name__, url_prefix="/api/feedback")
feedback_model = FeedbackModel()


@feedback_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_feedback():
    user_id = get_jwt_identity()
    data    = request.get_json()

    if not data.get("latitude") or not data.get("longitude"):
        return jsonify({"error": "Location is required"}), 400

    feedback_id = feedback_model.create_feedback(user_id, data)
    return jsonify({"message": "Feedback submitted", "id": feedback_id}), 201


@feedback_bp.route("/my", methods=["GET"])
@jwt_required()
def my_feedback():
    user_id  = get_jwt_identity()
    feedback = feedback_model.get_user_feedback(user_id)
    return jsonify({"feedback": feedback}), 200