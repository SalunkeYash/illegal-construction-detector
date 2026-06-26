import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration with PostgreSQL (Neon) and GEE support."""

    SECRET_KEY = os.environ.get('SECRET_KEY', 'jscoe-illegal-construction-2026-secret')
    JWT_SECRET = os.environ.get('JWT_SECRET', 'jscoe-jwt-secret-2026')
    JWT_EXPIRY_HOURS = 24

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DATA_DIR = os.path.join(BASE_DIR, 'data')

    # ── PostgreSQL (Neon) Database ──────────────────────
    DATABASE_URL = os.environ.get(
        'DATABASE_URL',
        'postgresql://neondb_owner:npg_aQsz9NEJV7Lx@ep-curly-frog-aojwrp3h-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    )
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 10,
        'max_overflow': 20,
        'connect_args': {
            'sslmode': 'require',
        },
    }

    # ── File Storage ────────────────────────────────────
    UPLOAD_FOLDER = os.path.join(DATA_DIR, 'uploads')
    ANNOTATED_FOLDER = os.path.join(DATA_DIR, 'annotated')
    REPORTS_FOLDER = os.path.join(DATA_DIR, 'reports')
    ZONING_DATA_FOLDER = os.path.join(DATA_DIR, 'zoning_data')

    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff', 'webp'}
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB

    # ── External Services ───────────────────────────────
    N8N_WEBHOOK_URL = os.environ.get('N8N_WEBHOOK_URL', '')

    # ── Cloudinary ──────────────────────────────────────
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

    # ── YOLO Settings ───────────────────────────────────
    YOLO_CONFIDENCE = 0.35
    YOLO_IOU = 0.45

    # ── Default Location (Pune) ─────────────────────────
    DEFAULT_LAT = 18.5204
    DEFAULT_LON = 73.8567

    # ── Google Earth Engine ─────────────────────────────
    GEE_SERVICE_ACCOUNT = os.environ.get('GEE_SERVICE_ACCOUNT', '')
    GEE_PROJECT = os.environ.get('GEE_PROJECT', '')
    GEE_KEY_FILE = os.environ.get('GEE_KEY_FILE', '')
    GEE_ENABLED = os.environ.get('GEE_ENABLED', 'false').lower() == 'true'

    # ── WebSocket / SocketIO ────────────────────────────
    SOCKETIO_ASYNC_MODE = 'eventlet'

    # ── Scheduler ───────────────────────────────────────
    SCHEDULER_ENABLED = os.environ.get('SCHEDULER_ENABLED', 'false').lower() == 'true'
    SCHEDULER_INTERVAL_MINUTES = int(os.environ.get('SCHEDULER_INTERVAL_MINUTES', '60'))

    def __init__(self):
        """Auto-create all required data directories."""
        dirs_to_create = [
            self.DATA_DIR,
            self.UPLOAD_FOLDER,
            self.ANNOTATED_FOLDER,
            self.REPORTS_FOLDER,
            self.ZONING_DATA_FOLDER,
        ]
        for d in dirs_to_create:
            os.makedirs(d, exist_ok=True)
