import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app


def generate_token(user_id, role, secret, expiry_hours=24):
    """Generate a JWT token for a user."""
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=expiry_hours),
        'iat': datetime.datetime.utcnow(),
    }
    token = jwt.encode(payload, secret, algorithm='HS256')
    return token


def decode_token(token, secret):
    """Decode and validate a JWT token. Returns payload dict or None."""
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Decorator that requires a valid JWT token in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')

        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        secret = current_app.config.get('JWT_SECRET', 'jscoe-jwt-secret-2026')
        payload = decode_token(token, secret)

        if payload is None:
            return jsonify({'error': 'Token is invalid or expired'}), 401

        # Import here to avoid circular imports
        from models.database import User
        current_user = User.query.get(payload.get('user_id'))

        if current_user is None:
            return jsonify({'error': 'User not found'}), 401

        if not current_user.is_active:
            return jsonify({'error': 'Account is disabled'}), 403

        kwargs['current_user'] = current_user
        return f(*args, **kwargs)

    return decorated


def role_required(*roles):
    """Decorator that restricts access to users with specific roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if current_user is None:
                return jsonify({'error': 'Authentication required'}), 401

            if current_user.role not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403

            return f(*args, **kwargs)
        return decorated
    return decorator
