from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models.geofence_model import GeofenceModel

geofence_bp    = Blueprint("geofence", __name__, url_prefix="/api/geofence")
geofence_model = GeofenceModel()


@geofence_bp.route("/zones", methods=["GET"])
@jwt_required()
def get_zones():
    zones = geofence_model.get_all_zones()
    return jsonify({"zones": zones}), 200


@geofence_bp.route("/zones", methods=["POST"])
@jwt_required()
def create_zone():
    if get_jwt().get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    data = request.get_json()
    required = ["name", "zone_type", "latitude", "longitude"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    if data["zone_type"] not in ["safe", "moderate", "danger"]:
        return jsonify({"error": "zone_type must be safe, moderate, or danger"}), 400

    # Keep zones precise: cap radius so a single zone can't blanket an
    # entire district. Admins who need wider coverage should add more
    # smaller zones instead of one huge one.
    if "radius" in data and data["radius"] is not None:
        try:
            radius = float(data["radius"])
        except (TypeError, ValueError):
            return jsonify({"error": "radius must be a number"}), 400
        if radius <= 0:
            return jsonify({"error": "radius must be greater than 0"}), 400
        if radius > 1500:
            return jsonify({"error": "radius too large — max 1500m, add multiple smaller zones for wide areas"}), 400
        data["radius"] = radius

    zone_id = geofence_model.create_zone(data)
    return jsonify({"message": "Zone created", "id": zone_id}), 201


@geofence_bp.route("/zones/<zone_id>", methods=["DELETE"])
@jwt_required()
def delete_zone(zone_id):
    if get_jwt().get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    geofence_model.delete_zone(zone_id)
    return jsonify({"message": "Zone deleted"}), 200