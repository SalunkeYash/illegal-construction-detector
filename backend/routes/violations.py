import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_file
from models.database import db, Violation, Detection, SatelliteImage, Alert, Report
from utils.auth_utils import token_required, role_required
from services import report_service

violations_bp = Blueprint('violations', __name__, url_prefix='/api/violations')


@violations_bp.route('/', methods=['GET'])
@token_required
def get_violations(current_user):
    """Get violations with optional filters and pagination."""
    try:
        status = request.args.get('status')
        severity = request.args.get('severity')
        violation_type = request.args.get('violation_type')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Violation.query
        if status:
            query = query.filter(Violation.status == status)
        if severity:
            query = query.filter(Violation.severity == severity)
        if violation_type:
            query = query.filter(Violation.violation_type == violation_type)

        query = query.order_by(Violation.detected_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'violations': [v.to_dict() for v in pagination.items],
            'total': pagination.total,
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total_pages': pagination.pages,
        }), 200
    except Exception as e:
        print(f"[Violations] Get all error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@violations_bp.route('/<int:vid>', methods=['GET'])
@token_required
def get_violation(vid, current_user):
    """Get a single violation with joined detection and image info."""
    try:
        violation = Violation.query.get(vid)
        if not violation:
            return jsonify({'error': 'Violation not found'}), 404

        result = violation.to_dict()
        detection = Detection.query.get(violation.detection_id)
        if detection:
            result['detection'] = detection.to_dict()
            image = SatelliteImage.query.get(detection.image_id)
            if image:
                result['image'] = image.to_dict()

        return jsonify(result), 200
    except Exception as e:
        print(f"[Violations] Get error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@violations_bp.route('/<int:vid>/status', methods=['PATCH'])
@token_required
def update_status(vid, current_user):
    """Update the status of a violation."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        new_status = data.get('status', '').strip()
        allowed_statuses = ['Pending', 'Verified', 'False Positive', 'Resolved', 'Action Taken']
        if new_status not in allowed_statuses:
            return jsonify({'error': f'Status must be one of: {", ".join(allowed_statuses)}'}), 400

        violation = Violation.query.get(vid)
        if not violation:
            return jsonify({'error': 'Violation not found'}), 404

        violation.status = new_status
        violation.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(violation.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        print(f"[Violations] Update status error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@violations_bp.route('/<int:vid>/report', methods=['GET'])
@token_required
def get_report(vid, current_user):
    """Generate and download a PDF report for a violation."""
    try:
        violation = Violation.query.get(vid)
        if not violation:
            return jsonify({'error': 'Violation not found'}), 404

        detection = Detection.query.get(violation.detection_id)
        if not detection:
            return jsonify({'error': 'Detection not found'}), 404

        image = SatelliteImage.query.get(detection.image_id)
        image_path = None
        if image and image.annotated_path and os.path.exists(image.annotated_path):
            image_path = image.annotated_path

        reports_folder = current_app.config['REPORTS_FOLDER']
        report_filename = f"violation_report_{vid}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        report_path = os.path.join(reports_folder, report_filename)

        report_service.generate_pdf_report(violation, detection, image_path, report_path)

        # Upload PDF to Cloudinary
        from services import cloudinary_service
        report_url = cloudinary_service.upload_pdf(
            report_path,
            folder="illegal-construction/reports",
            public_id=f"report_{vid}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        )

        # Save Report record
        report_record = Report(
            violation_id=vid,
            report_filename=report_filename,
            report_path=report_path,
            report_url=report_url,
        )
        db.session.add(report_record)
        db.session.commit()

        # If Cloudinary URL is available, redirect to it
        if report_url:
            from flask import redirect
            return redirect(report_url)

        return send_file(report_path, as_attachment=True,
                         download_name=report_filename, mimetype='application/pdf')
    except Exception as e:
        print(f"[Violations] Report error: {e}")
        return jsonify({'error': f'Report generation failed: {str(e)}'}), 500


@violations_bp.route('/<int:vid>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_violation(vid, current_user):
    """Delete a violation and its related alerts and reports (admin only)."""
    try:
        violation = Violation.query.get(vid)
        if not violation:
            return jsonify({'error': 'Violation not found'}), 404

        # Delete related alerts
        Alert.query.filter_by(violation_id=vid).delete()
        # Delete related reports
        Report.query.filter_by(violation_id=vid).delete()
        # Delete violation
        db.session.delete(violation)
        db.session.commit()

        return jsonify({'message': 'Violation deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"[Violations] Delete error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@violations_bp.route('/<int:vid>/notes', methods=['POST'])
@token_required
def update_notes(vid, current_user):
    """Add or update notes on a violation."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        notes = data.get('notes', '')

        violation = Violation.query.get(vid)
        if not violation:
            return jsonify({'error': 'Violation not found'}), 404

        violation.notes = notes
        violation.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify(violation.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        print(f"[Violations] Notes error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
