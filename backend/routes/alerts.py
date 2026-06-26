from flask import Blueprint, request, jsonify, current_app
from models.database import db, Alert, Violation
from utils.auth_utils import token_required
from services import alert_service

alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')


@alerts_bp.route('/recent', methods=['GET'])
@token_required
def get_recent_alerts(current_user):
    """Get the 20 most recent alerts with violation details."""
    try:
        alerts = (
            Alert.query
            .order_by(Alert.sent_at.desc())
            .limit(20)
            .all()
        )

        return jsonify({
            'alerts': [a.to_dict() for a in alerts],
        }), 200

    except Exception as e:
        print(f"[Alerts] Get recent error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@alerts_bp.route('/<int:alert_id>/resend', methods=['POST'])
@token_required
def resend_alert(alert_id, current_user):
    """Re-trigger sending an alert."""
    try:
        alert = Alert.query.get(alert_id)
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404

        violation = Violation.query.get(alert.violation_id)

        # Re-send webhook if configured
        webhook_url = current_app.config.get('N8N_WEBHOOK_URL', '')
        if webhook_url and violation:
            alert_service.send_webhook(violation, webhook_url)

        return jsonify({
            'success': True,
            'message': 'Alert resent',
        }), 200

    except Exception as e:
        print(f"[Alerts] Resend error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
