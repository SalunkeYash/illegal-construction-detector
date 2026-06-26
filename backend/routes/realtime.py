"""
Socket.IO event handlers for the /live namespace.
"""
from flask_socketio import Namespace, emit, join_room, leave_room


class LiveNamespace(Namespace):
    """Handles real-time WebSocket connections on the /live namespace."""

    def on_connect(self):
        """Client connected to /live namespace."""
        print("[SocketIO] Client connected to /live")
        emit('connected', {'message': 'Connected to live monitoring'})

    def on_disconnect(self, reason=None):
        """Client disconnected from /live namespace."""
        print("[SocketIO] Client disconnected from /live")

    def on_join_area(self, data):
        """Client wants to monitor a specific area."""
        area_id = data.get('area_id')
        if area_id:
            room = f"area_{area_id}"
            join_room(room)
            emit('joined_area', {'area_id': area_id, 'room': room})

    def on_leave_area(self, data):
        """Client stops monitoring a specific area."""
        area_id = data.get('area_id')
        if area_id:
            room = f"area_{area_id}"
            leave_room(room)
            emit('left_area', {'area_id': area_id})

    def on_subscribe_detection(self, data):
        """Client subscribes to detection updates for a session."""
        session_id = data.get('session_id')
        if session_id:
            room = f"detection_{session_id}"
            join_room(room)
            emit('subscribed_detection', {'session_id': session_id})

    def on_ping(self, data=None):
        """Respond to client pings for keep-alive."""
        emit('pong', {'status': 'alive'})
