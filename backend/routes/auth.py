from flask import Blueprint, request, jsonify, current_app
from models.database import db, User
from utils.auth_utils import generate_token, token_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        user = User.query.filter_by(username=username).first()

        if user is None or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401

        if not user.is_active:
            return jsonify({'error': 'Account disabled'}), 403

        token = generate_token(
            user.id,
            user.role,
            current_app.config['JWT_SECRET'],
            current_app.config['JWT_EXPIRY_HOURS'],
        )

        return jsonify({
            'token': token,
            'user': user.to_dict(),
        }), 200

    except Exception as e:
        print(f"[Auth] Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user and return JWT token."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        role = data.get('role', 'citizen').strip()

        if not username or not email or not password:
            return jsonify({'error': 'Username, email, and password are required'}), 400

        if role not in ('admin', 'authority', 'citizen'):
            role = 'citizen'

        # Check if username already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 409

        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 409

        user = User(
            username=username,
            email=email,
            role=role,
            is_active=True,
        )
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        token = generate_token(
            user.id,
            user.role,
            current_app.config['JWT_SECRET'],
            current_app.config['JWT_EXPIRY_HOURS'],
        )

        return jsonify({
            'token': token,
            'user': user.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"[Auth] Register error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me(current_user):
    """Get current authenticated user info."""
    return jsonify({'user': current_user.to_dict()}), 200
