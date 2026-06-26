import os
import sys
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from config import Config
from models.database import db
from services import socketio_service, scheduler_service, gee_service

socketio = SocketIO()


def create_app():
    """Create and configure the Flask application."""
    config = Config()
    app = Flask(__name__)

    # Load config
    app.config.from_object(config)
    app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER
    app.config['ANNOTATED_FOLDER'] = config.ANNOTATED_FOLDER
    app.config['REPORTS_FOLDER'] = config.REPORTS_FOLDER
    app.config['ZONING_DATA_FOLDER'] = config.ZONING_DATA_FOLDER
    app.config['ALLOWED_EXTENSIONS'] = config.ALLOWED_EXTENSIONS
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH
    app.config['YOLO_CONFIDENCE'] = config.YOLO_CONFIDENCE
    app.config['YOLO_IOU'] = config.YOLO_IOU
    app.config['N8N_WEBHOOK_URL'] = config.N8N_WEBHOOK_URL

    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize SocketIO
    socketio.init_app(app, cors_allowed_origins="*", async_mode='threading')
    socketio_service.init_socketio(socketio)

    # Register Socket.IO namespace
    from routes.realtime import LiveNamespace
    socketio.on_namespace(LiveNamespace('/live'))

    # Initialize GEE if configured
    if config.GEE_ENABLED:
        gee_service.init_gee(
            service_account=config.GEE_SERVICE_ACCOUNT,
            project=config.GEE_PROJECT,
            key_file=config.GEE_KEY_FILE,
        )

    # Register blueprints
    from routes.auth import auth_bp
    from routes.areas import areas_bp
    from routes.detection import detection_bp
    from routes.violations import violations_bp
    from routes.alerts import alerts_bp
    from routes.analytics import analytics_bp
    from routes.monitoring import monitoring_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(areas_bp)
    app.register_blueprint(detection_bp)
    app.register_blueprint(violations_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(monitoring_bp)

    # Create tables
    with app.app_context():
        db.create_all()
        print("[App] Database tables created/verified")

    # Initialize scheduler
    if config.SCHEDULER_ENABLED:
        scheduler_service.init_scheduler(app)

    return app


if __name__ == '__main__':
    app = create_app()
    print("=" * 55)
    print("  🏗️  AI-Based Illegal Construction Detection System")
    print("  🌐  Server: http://localhost:5000")
    print("  🔌  WebSocket: ws://localhost:5000/live")
    print("=" * 55)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
