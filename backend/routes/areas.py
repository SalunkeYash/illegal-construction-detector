import json
from flask import Blueprint, request, jsonify
from models.database import db, MonitoredArea, Violation, Detection, SatelliteImage, ScanSession
from utils.auth_utils import token_required, role_required

areas_bp = Blueprint('areas', __name__, url_prefix='/api/areas')


@areas_bp.route('/', methods=['POST'])
@token_required
def create_area(current_user):
    """Create a new monitored area. Supports both bbox and polygon methods."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        selection_method = data.get('selection_method', 'bbox').strip()

        if selection_method == 'polygon':
            # ── Polygon mode ────────────────────────────
            polygon_coords = data.get('polygon_coordinates', [])

            if not polygon_coords or len(polygon_coords) < 3:
                return jsonify({'error': 'Polygon must have at least 3 points'}), 400

            # Validate each point
            for i, point in enumerate(polygon_coords):
                if not isinstance(point, (list, tuple)) or len(point) < 2:
                    return jsonify({'error': f'Invalid point at index {i}'}), 400
                try:
                    lat, lon = float(point[0]), float(point[1])
                    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                        return jsonify({'error': f'Point {i} has invalid coordinates'}), 400
                except (ValueError, TypeError):
                    return jsonify({'error': f'Point {i} has non-numeric values'}), 400

            # Calculate bounding box from polygon
            lats = [p[0] for p in polygon_coords]
            lons = [p[1] for p in polygon_coords]
            min_lat = min(lats)
            max_lat = max(lats)
            min_lon = min(lons)
            max_lon = max(lons)

            # Calculate centroid
            center_lat = sum(lats) / len(lats)
            center_lon = sum(lons) / len(lons)

            # Auto-generate name if empty
            if not name:
                from datetime import datetime
                name = f"Area_{datetime.utcnow().strftime('%Y%m%d_%H%M')}"

            area = MonitoredArea(
                name=name,
                min_lat=min_lat,
                max_lat=max_lat,
                min_lon=min_lon,
                max_lon=max_lon,
                created_by=current_user.id,
                status='active',
                description=description or None,
                polygon_coordinates=json.dumps(polygon_coords),
                selection_method='polygon',
                center_lat=center_lat,
                center_lon=center_lon,
            )

        else:
            # ── BBox mode (existing) ────────────────────
            try:
                min_lat = float(data.get('min_lat', 0))
                max_lat = float(data.get('max_lat', 0))
                min_lon = float(data.get('min_lon', 0))
                max_lon = float(data.get('max_lon', 0))
            except (ValueError, TypeError):
                return jsonify({'error': 'Latitude and longitude must be valid numbers'}), 400

            if not name:
                from datetime import datetime
                name = f"Area_{datetime.utcnow().strftime('%Y%m%d_%H%M')}"

            if min_lat >= max_lat:
                return jsonify({'error': 'min_lat must be less than max_lat'}), 400

            if min_lon >= max_lon:
                return jsonify({'error': 'min_lon must be less than max_lon'}), 400

            center_lat = (min_lat + max_lat) / 2
            center_lon = (min_lon + max_lon) / 2

            area = MonitoredArea(
                name=name,
                min_lat=min_lat,
                max_lat=max_lat,
                min_lon=min_lon,
                max_lon=max_lon,
                created_by=current_user.id,
                status='active',
                description=description or None,
                selection_method='bbox',
                center_lat=center_lat,
                center_lon=center_lon,
            )

        db.session.add(area)
        db.session.commit()

        return jsonify(area.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        print(f"[Areas] Create error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@areas_bp.route('/', methods=['GET'])
@token_required
def get_areas(current_user):
    """Get all monitored areas ordered by created_at desc."""
    try:
        areas = MonitoredArea.query.order_by(MonitoredArea.created_at.desc()).all()
        return jsonify({'areas': [a.to_dict() for a in areas]}), 200
    except Exception as e:
        print(f"[Areas] Get all error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@areas_bp.route('/<int:area_id>', methods=['GET'])
@token_required
def get_area(area_id, current_user):
    """Get a single monitored area by ID."""
    try:
        area = MonitoredArea.query.get(area_id)
        if not area:
            return jsonify({'error': 'Area not found'}), 404
        return jsonify(area.to_dict()), 200
    except Exception as e:
        print(f"[Areas] Get error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@areas_bp.route('/<int:area_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_area(area_id, current_user):
    """Delete a monitored area (admin only)."""
    try:
        area = MonitoredArea.query.get(area_id)
        if not area:
            return jsonify({'error': 'Area not found'}), 404

        db.session.delete(area)
        db.session.commit()

        return jsonify({'message': 'Deleted'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"[Areas] Delete error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@areas_bp.route('/<int:area_id>/violations', methods=['GET'])
@token_required
def get_area_violations(area_id, current_user):
    """Get all violations for detections linked to images of this area."""
    try:
        area = MonitoredArea.query.get(area_id)
        if not area:
            return jsonify({'error': 'Area not found'}), 404

        # Get all satellite images for this area
        image_ids = [img.id for img in SatelliteImage.query.filter_by(area_id=area_id).all()]

        if not image_ids:
            return jsonify({'violations': [], 'count': 0}), 200

        # Get all detections for these images
        detection_ids = [d.id for d in Detection.query.filter(Detection.image_id.in_(image_ids)).all()]

        if not detection_ids:
            return jsonify({'violations': [], 'count': 0}), 200

        # Get violations for these detections
        violations = Violation.query.filter(
            Violation.detection_id.in_(detection_ids)
        ).order_by(Violation.detected_at.desc()).all()

        return jsonify({
            'violations': [v.to_dict() for v in violations],
            'count': len(violations),
        }), 200

    except Exception as e:
        print(f"[Areas] Area violations error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@areas_bp.route('/<int:area_id>/history', methods=['GET'])
@token_required
def get_area_history(area_id, current_user):
    """Get all scan sessions for this area ordered by date."""
    try:
        area = MonitoredArea.query.get(area_id)
        if not area:
            return jsonify({'error': 'Area not found'}), 404

        sessions = ScanSession.query.filter_by(area_id=area_id)\
            .order_by(ScanSession.started_at.desc()).all()

        return jsonify({
            'sessions': [s.to_dict() for s in sessions],
            'count': len(sessions),
        }), 200

    except Exception as e:
        print(f"[Areas] Area history error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
