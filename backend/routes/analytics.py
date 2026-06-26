from flask import Blueprint, jsonify
from sqlalchemy import func
from models.database import db, MonitoredArea, Detection, Violation, SatelliteImage, ScanSession
from utils.auth_utils import token_required
from services import gis_service

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


@analytics_bp.route('/summary', methods=['GET'])
@token_required
def get_summary(current_user):
    """Get overall summary statistics."""
    try:
        areas_scanned = MonitoredArea.query.count()
        buildings_detected = db.session.query(func.sum(Detection.total_objects_detected)).scalar() or 0
        violations = Violation.query.count()
        registrations = Violation.query.filter_by(status='Verified').count()
        construction_records = SatelliteImage.query.count()
        pending_review = Violation.query.filter_by(status='Pending').count()

        return jsonify({
            'areas_scanned': areas_scanned,
            'buildings_detected': int(buildings_detected),
            'violations': violations,
            'registrations': registrations,
            'construction_records': construction_records,
            'pending_review': pending_review,
        }), 200
    except Exception as e:
        print(f"[Analytics] Summary error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@analytics_bp.route('/by-type', methods=['GET'])
@token_required
def get_by_type(current_user):
    """Get violation counts grouped by type."""
    try:
        results = db.session.query(
            Violation.violation_type, func.count(Violation.id).label('count')
        ).group_by(Violation.violation_type).all()
        return jsonify([{'violation_type': r[0], 'count': r[1]} for r in results]), 200
    except Exception as e:
        print(f"[Analytics] By type error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@analytics_bp.route('/by-severity', methods=['GET'])
@token_required
def get_by_severity(current_user):
    """Get violation counts grouped by severity with percentages."""
    try:
        results = db.session.query(
            Violation.severity, func.count(Violation.id).label('count')
        ).group_by(Violation.severity).all()
        total = sum(r[1] for r in results)
        data = [{'severity': r[0], 'count': r[1],
                 'percentage': round((r[1] / max(total, 1)) * 100, 1)} for r in results]
        return jsonify(data), 200
    except Exception as e:
        print(f"[Analytics] By severity error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@analytics_bp.route('/detection-summary', methods=['GET'])
@token_required
def get_detection_summary(current_user):
    """Get detection summary statistics."""
    try:
        total = Violation.query.count()
        registered = Violation.query.filter(
            Violation.status.in_(['Verified', 'Resolved', 'Action Taken'])).count()
        buildings_detected = db.session.query(func.sum(Detection.total_objects_detected)).scalar() or 0
        areas_completed = MonitoredArea.query.count()
        avg_detections = round(int(buildings_detected) / max(areas_completed, 1), 1)
        violation_rate = round(total / max(total, 1) * 100, 1)
        registration_rate = round(registered / max(total, 1) * 100, 1)

        return jsonify({
            'violation_rate': violation_rate,
            'registration_rate': registration_rate,
            'areas_completed': areas_completed,
            'avg_detections': avg_detections,
        }), 200
    except Exception as e:
        print(f"[Analytics] Detection summary error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@analytics_bp.route('/status-breakdown', methods=['GET'])
@token_required
def get_status_breakdown(current_user):
    """Get violation status breakdown."""
    try:
        pending = Violation.query.filter_by(status='Pending').count()
        verified = Violation.query.filter_by(status='Verified').count()
        total = Violation.query.count()
        return jsonify({'pending': pending, 'verified': verified, 'total': total}), 200
    except Exception as e:
        print(f"[Analytics] Status breakdown error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@analytics_bp.route('/geojson', methods=['GET'])
@token_required
def get_geojson(current_user):
    """Get all violations as GeoJSON FeatureCollection."""
    try:
        violations = Violation.query.all()
        geojson = gis_service.create_geojson_features(violations)
        return jsonify(geojson), 200
    except Exception as e:
        print(f"[Analytics] GeoJSON error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@analytics_bp.route('/dashboard', methods=['GET'])
@token_required
def get_dashboard_summary(current_user):
    """Single endpoint returning everything the dashboard needs."""
    try:
        # Stats
        areas_scanned = MonitoredArea.query.count()
        buildings_detected = db.session.query(func.sum(Detection.total_objects_detected)).scalar() or 0
        violations_count = Violation.query.count()
        pending = Violation.query.filter_by(status='Pending').count()
        verified = Violation.query.filter_by(status='Verified').count()

        # Recent violations
        recent_violations = Violation.query.order_by(
            Violation.detected_at.desc()).limit(5).all()

        # Recent scan sessions
        recent_sessions = ScanSession.query.order_by(
            ScanSession.started_at.desc()).limit(3).all()

        # Violations by type
        by_type = db.session.query(
            Violation.violation_type, func.count(Violation.id).label('count')
        ).group_by(Violation.violation_type).all()

        # Violations by severity
        by_severity = db.session.query(
            Violation.severity, func.count(Violation.id).label('count')
        ).group_by(Violation.severity).all()
        sev_total = sum(r[1] for r in by_severity)

        # GeoJSON
        all_violations = Violation.query.all()
        geojson = gis_service.create_geojson_features(all_violations)

        return jsonify({
            'stats': {
                'areas': areas_scanned,
                'buildings': int(buildings_detected),
                'violations': violations_count,
                'pending': pending,
                'verified': verified,
            },
            'recent_violations': [v.to_dict() for v in recent_violations],
            'recent_sessions': [s.to_dict() for s in recent_sessions],
            'violations_by_type': [{'violation_type': r[0], 'count': r[1]} for r in by_type],
            'violations_by_severity': [
                {'severity': r[0], 'count': r[1],
                 'percentage': round((r[1] / max(sev_total, 1)) * 100, 1)}
                for r in by_severity
            ],
            'geojson': geojson,
        }), 200
    except Exception as e:
        print(f"[Analytics] Dashboard error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
