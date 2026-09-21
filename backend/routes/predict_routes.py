import sys
import os

# Add ml/ folder to Python path
ML_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "ml")
sys.path.insert(0, os.path.abspath(ML_PATH))

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.prediction_model import PredictionModel

predict_bp       = Blueprint("predict", __name__, url_prefix="/api")
prediction_model = PredictionModel()

# Import ML predictor
try:
    from predict import predict_risk
    ML_READY = True
    print("✅ ML prediction engine loaded")
except Exception as e:
    ML_READY = False
    print(f"⚠️  ML not ready: {e}")


@predict_bp.route("/predict", methods=["POST"])
@jwt_required()
def predict():
    user_id = get_jwt_identity()
    data    = request.get_json()

    lat = data.get("latitude")
    lon = data.get("longitude")
    if lat is None or lon is None:
        return jsonify({"error": "latitude and longitude required"}), 400

    # Get prediction from ML model
    result = predict_risk(
        lat, lon,
        hour         = data.get("hour"),
        day          = data.get("day"),
        crime_count  = data.get("crime_count", 50),
        feedback_score = data.get("feedback_score", 3.0)
    )

    # Save to database
    prediction_model.save_prediction(
        user_id, lat, lon,
        result["risk_level"],
        result["confidence"],
        result.get("details", {})
    )

    return jsonify({
        "risk_level":    result["risk_level"],
        "confidence":    result["confidence"],
        "probabilities": result.get("probabilities", {}),
        "anomaly":       result.get("anomaly", False),
        "details":       result.get("details", {}),
        "message":       result.get("message", ""),
        "ml_ready":      ML_READY,
    }), 200