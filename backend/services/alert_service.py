import datetime
import requests
import smtplib
from email.mime.text import MIMEText


def create_alert(violation, db_session, AlertModel):
    """
    Create Alert records in DB for each notification type.
    Returns a list of created alert dicts.
    """
    alerts_created = []
    message = format_alert_message(violation)

    # Always create a dashboard alert
    notification_types = ['dashboard']

    for ntype in notification_types:
        alert = AlertModel(
            violation_id=violation.id,
            notification_type=ntype,
            recipient='dashboard',
            message=message,
            sent_at=datetime.datetime.utcnow(),
            is_sent=True,
        )
        db_session.add(alert)
        alerts_created.append({
            'notification_type': ntype,
            'recipient': 'dashboard',
            'message': message,
            'is_sent': True,
        })

    try:
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        print(f"[AlertService] Error saving alerts: {e}")

    return alerts_created


def send_webhook(violation, webhook_url):
    """
    Send violation data to a webhook URL via POST.
    Silently skips if webhook_url is empty or not configured.
    """
    if not webhook_url:
        return

    try:
        if hasattr(violation, 'to_dict'):
            payload = violation.to_dict()
        elif isinstance(violation, dict):
            payload = violation
        else:
            payload = {'violation_id': str(violation)}

        payload['alert_type'] = 'illegal_construction_detected'
        payload['timestamp'] = datetime.datetime.utcnow().isoformat()

        response = requests.post(
            webhook_url,
            json=payload,
            timeout=10,
            headers={'Content-Type': 'application/json'}
        )
        print(f"[AlertService] Webhook sent: {response.status_code}")
    except Exception as e:
        print(f"[AlertService] Webhook error: {e}")


def send_email_alert(violation, smtp_config):
    """
    Send an email alert about a violation.
    Silently skips if SMTP credentials are empty or not configured.
    """
    if not smtp_config:
        return

    smtp_host = smtp_config.get('host', '')
    smtp_port = smtp_config.get('port', 587)
    smtp_user = smtp_config.get('user', '')
    smtp_pass = smtp_config.get('password', '')
    recipient = smtp_config.get('recipient', '')

    if not smtp_host or not smtp_user or not recipient:
        return

    try:
        message = format_alert_message(violation)

        msg = MIMEText(message, 'plain')
        msg['Subject'] = f"⚠️ Illegal Construction Alert - Violation #{getattr(violation, 'id', 'N/A')}"
        msg['From'] = smtp_user
        msg['To'] = recipient

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)

        print(f"[AlertService] Email sent to {recipient}")
    except Exception as e:
        print(f"[AlertService] Email error: {e}")


def format_alert_message(violation):
    """
    Format a violation into a readable alert message string.
    """
    if hasattr(violation, 'to_dict'):
        v = violation.to_dict()
    elif isinstance(violation, dict):
        v = violation
    else:
        return f"⚠️ Illegal Construction Alert - Violation detected"

    violation_type = v.get('violation_type', 'Unknown')
    severity = v.get('severity', 'Unknown')
    lat = v.get('latitude', 0)
    lon = v.get('longitude', 0)
    area_sqm = v.get('area_sqm', 0)
    confidence = v.get('confidence_score', 0)
    detected_at = v.get('detected_at', 'Unknown')

    return (
        f"⚠️ Illegal Construction Alert\n"
        f"Type: {violation_type}\n"
        f"Severity: {severity}\n"
        f"Location: {lat:.6f}, {lon:.6f}\n"
        f"Area: {area_sqm:.1f} sqm\n"
        f"Confidence: {confidence:.1%}\n"
        f"Detected: {detected_at}"
    )
