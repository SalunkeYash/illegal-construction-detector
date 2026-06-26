import json
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='citizen')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
        }


class MonitoredArea(db.Model):
    __tablename__ = 'monitored_areas'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    min_lat = db.Column(db.Float, nullable=False)
    max_lat = db.Column(db.Float, nullable=False)
    min_lon = db.Column(db.Float, nullable=False)
    max_lon = db.Column(db.Float, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='active')
    description = db.Column(db.Text, nullable=True)
    # ── New polygon fields ──────────────────────────────
    polygon_coordinates = db.Column(db.Text, nullable=True)
    selection_method = db.Column(db.String(20), default='bbox')
    center_lat = db.Column(db.Float, nullable=True)
    center_lon = db.Column(db.Float, nullable=True)

    creator = db.relationship('User', backref='monitored_areas', lazy=True)

    def to_dict(self):
        polygon_coords = None
        if self.polygon_coordinates:
            try:
                polygon_coords = json.loads(self.polygon_coordinates)
            except (json.JSONDecodeError, TypeError):
                polygon_coords = None
        return {
            'id': self.id,
            'name': self.name,
            'min_lat': self.min_lat,
            'max_lat': self.max_lat,
            'min_lon': self.min_lon,
            'max_lon': self.max_lon,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'status': self.status,
            'description': self.description,
            'polygon_coordinates': polygon_coords,
            'selection_method': self.selection_method or 'bbox',
            'center_lat': self.center_lat,
            'center_lon': self.center_lon,
        }


class SatelliteImage(db.Model):
    __tablename__ = 'satellite_images'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=True)
    area_id = db.Column(db.Integer, db.ForeignKey('monitored_areas.id'), nullable=True)
    file_path = db.Column(db.String(500), nullable=False)
    annotated_path = db.Column(db.String(500), nullable=True)
    capture_date = db.Column(db.DateTime, nullable=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed = db.Column(db.Boolean, default=False)
    image_width = db.Column(db.Integer, nullable=True)
    image_height = db.Column(db.Integer, nullable=True)
    source = db.Column(db.String(50), default='upload')  # upload / gee / demo
    # ── Cloudinary URLs ─────────────────────────────────
    cloudinary_url = db.Column(db.String(500), nullable=True)
    annotated_cloudinary_url = db.Column(db.String(500), nullable=True)

    area = db.relationship('MonitoredArea', backref='satellite_images', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'area_id': self.area_id,
            'file_path': self.file_path,
            'annotated_path': self.annotated_path,
            'capture_date': self.capture_date.isoformat() if self.capture_date else None,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'processed': self.processed,
            'image_width': self.image_width,
            'image_height': self.image_height,
            'source': self.source or 'upload',
            'cloudinary_url': self.cloudinary_url,
            'annotated_cloudinary_url': self.annotated_cloudinary_url,
        }


class Detection(db.Model):
    __tablename__ = 'detections'

    id = db.Column(db.Integer, primary_key=True)
    image_id = db.Column(db.Integer, db.ForeignKey('satellite_images.id'), nullable=False)
    bounding_boxes = db.Column(db.Text, nullable=True)
    confidence_scores = db.Column(db.Text, nullable=True)
    class_labels = db.Column(db.Text, nullable=True)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    total_objects_detected = db.Column(db.Integer, default=0)

    image = db.relationship('SatelliteImage', backref='detections', lazy=True)

    def to_dict(self):
        bboxes, scores, labels = [], [], []
        try:
            if self.bounding_boxes:
                bboxes = json.loads(self.bounding_boxes)
        except (json.JSONDecodeError, TypeError):
            pass
        try:
            if self.confidence_scores:
                scores = json.loads(self.confidence_scores)
        except (json.JSONDecodeError, TypeError):
            pass
        try:
            if self.class_labels:
                labels = json.loads(self.class_labels)
        except (json.JSONDecodeError, TypeError):
            pass
        return {
            'id': self.id,
            'image_id': self.image_id,
            'bounding_boxes': bboxes,
            'confidence_scores': scores,
            'class_labels': labels,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'total_objects_detected': self.total_objects_detected,
        }


class Violation(db.Model):
    __tablename__ = 'violations'

    id = db.Column(db.Integer, primary_key=True)
    detection_id = db.Column(db.Integer, db.ForeignKey('detections.id'), nullable=False)
    violation_type = db.Column(db.String(100), nullable=False)
    severity = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(30), default='Pending')
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    area_sqm = db.Column(db.Float, nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    zone_name = db.Column(db.String(200), nullable=True)
    permit_status = db.Column(db.String(100), nullable=True)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = db.Column(db.Text, nullable=True)

    detection = db.relationship('Detection', backref='violations', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'detection_id': self.detection_id,
            'violation_type': self.violation_type,
            'severity': self.severity,
            'status': self.status,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'area_sqm': self.area_sqm,
            'confidence_score': self.confidence_score,
            'zone_name': self.zone_name,
            'permit_status': self.permit_status,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'notes': self.notes,
        }


class Alert(db.Model):
    __tablename__ = 'alerts'

    id = db.Column(db.Integer, primary_key=True)
    violation_id = db.Column(db.Integer, db.ForeignKey('violations.id'), nullable=False)
    notification_type = db.Column(db.String(30), nullable=False)
    recipient = db.Column(db.String(200), nullable=True)
    message = db.Column(db.Text, nullable=True)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_sent = db.Column(db.Boolean, default=False)

    violation = db.relationship('Violation', backref='alerts', lazy=True)

    def to_dict(self):
        violation_dict = {}
        if self.violation:
            violation_dict = {
                'violation_type': self.violation.violation_type,
                'severity': self.violation.severity,
                'latitude': self.violation.latitude,
                'longitude': self.violation.longitude,
                'status': self.violation.status,
                'area_sqm': self.violation.area_sqm,
                'confidence_score': self.violation.confidence_score,
            }
        return {
            'id': self.id,
            'violation_id': self.violation_id,
            'notification_type': self.notification_type,
            'recipient': self.recipient,
            'message': self.message,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'is_sent': self.is_sent,
            'violation': violation_dict,
        }


class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)
    violation_id = db.Column(db.Integer, db.ForeignKey('violations.id'), nullable=False)
    report_filename = db.Column(db.String(255), nullable=False)
    report_path = db.Column(db.String(500), nullable=False)
    report_url = db.Column(db.String(500), nullable=True)  # Cloudinary URL
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

    violation = db.relationship('Violation', backref='reports', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'violation_id': self.violation_id,
            'report_filename': self.report_filename,
            'report_path': self.report_path,
            'report_url': self.report_url,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
        }


class ZoningRecord(db.Model):
    __tablename__ = 'zoning_records'

    id = db.Column(db.Integer, primary_key=True)
    zone_name = db.Column(db.String(200), nullable=False)
    zone_type = db.Column(db.String(50), nullable=False)
    geojson_polygon = db.Column(db.Text, nullable=True)
    permit_number = db.Column(db.String(100), nullable=True)
    is_approved = db.Column(db.Boolean, default=False)
    owner_name = db.Column(db.String(200), nullable=True)
    area_sqm = db.Column(db.Float, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'zone_name': self.zone_name,
            'zone_type': self.zone_type,
            'geojson_polygon': self.geojson_polygon,
            'permit_number': self.permit_number,
            'is_approved': self.is_approved,
            'owner_name': self.owner_name,
            'area_sqm': self.area_sqm,
        }


class ScanSession(db.Model):
    __tablename__ = 'scan_sessions'

    id = db.Column(db.Integer, primary_key=True)
    area_id = db.Column(db.Integer, db.ForeignKey('monitored_areas.id'), nullable=False)
    triggered_by = db.Column(db.String(50), default='manual')  # manual / scheduler / api
    status = db.Column(db.String(30), default='running')  # running / completed / failed
    total_detections = db.Column(db.Integer, default=0)
    total_violations = db.Column(db.Integer, default=0)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    duration_seconds = db.Column(db.Float, nullable=True)
    image_source = db.Column(db.String(50), default='demo')
    detection_id = db.Column(db.Integer, db.ForeignKey('detections.id'), nullable=True)
    logs = db.Column(db.Text, nullable=True)
    error_message = db.Column(db.Text, nullable=True)

    area = db.relationship('MonitoredArea', backref='scan_sessions', lazy=True)

    def to_dict(self):
        log_list = []
        if self.logs:
            try:
                log_list = json.loads(self.logs)
            except (json.JSONDecodeError, TypeError):
                log_list = []
        return {
            'id': self.id,
            'area_id': self.area_id,
            'triggered_by': self.triggered_by,
            'status': self.status,
            'total_detections': self.total_detections,
            'total_violations': self.total_violations,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_seconds': self.duration_seconds,
            'image_source': self.image_source,
            'detection_id': self.detection_id,
            'logs': log_list,
            'error_message': self.error_message,
        }
