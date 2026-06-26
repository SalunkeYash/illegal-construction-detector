"""
Socket.IO service for real-time WebSocket event emission.
Provides a centralized interface for emitting events from any backend service.
"""
from datetime import datetime

_socketio = None


def init_socketio(socketio_instance):
    """Initialize with the Flask-SocketIO instance."""
    global _socketio
    _socketio = socketio_instance
    print("[SocketIO] Service initialized")


def get_socketio():
    """Get the SocketIO instance."""
    return _socketio


def emit_detection_log(session_id, step, message, progress=0):
    """Emit a real-time detection log entry."""
    if _socketio is None:
        return
    _socketio.emit('detection_log', {
        'session_id': session_id,
        'step': step,
        'message': message,
        'progress': progress,
        'timestamp': datetime.utcnow().isoformat(),
    }, namespace='/live')


def emit_detection_complete(session_id, result):
    """Emit detection completion event."""
    if _socketio is None:
        return
    _socketio.emit('detection_complete', {
        'session_id': session_id,
        'result': result,
        'timestamp': datetime.utcnow().isoformat(),
    }, namespace='/live')


def emit_violation_alert(violation_data):
    """Emit a new violation alert in real-time."""
    if _socketio is None:
        return
    _socketio.emit('new_violation', {
        'violation': violation_data,
        'timestamp': datetime.utcnow().isoformat(),
    }, namespace='/live')


def emit_scan_status(area_id, status, message=''):
    """Emit scan status update for an area."""
    if _socketio is None:
        return
    _socketio.emit('scan_status', {
        'area_id': area_id,
        'status': status,
        'message': message,
        'timestamp': datetime.utcnow().isoformat(),
    }, namespace='/live')


def emit_system_status(stats):
    """Emit system-wide status update."""
    if _socketio is None:
        return
    _socketio.emit('system_status', {
        'stats': stats,
        'timestamp': datetime.utcnow().isoformat(),
    }, namespace='/live')


def emit_scheduler_event(event_type, data=None):
    """Emit scheduler-related events."""
    if _socketio is None:
        return
    _socketio.emit('scheduler_event', {
        'type': event_type,
        'data': data or {},
        'timestamp': datetime.utcnow().isoformat(),
    }, namespace='/live')
