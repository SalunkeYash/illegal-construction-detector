import os
import json
import uuid
import random
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_file
from PIL import Image, ImageDraw
from models.database import db, MonitoredArea, SatelliteImage, Detection, Violation, Alert, ScanSession
from utils.auth_utils import token_required
from services import image_processing, yolo_service, gis_service, zoning_service, alert_service, socketio_service
from services import gee_service, cloudinary_service

detection_bp = Blueprint('detection', __name__, url_prefix='/api/detect')

# Singleton YOLO model
_yolo_model = None
_model_loaded = False


def _get_model():
    global _yolo_model, _model_loaded
    if not _model_loaded:
        _yolo_model = yolo_service.load_model()
        _model_loaded = True
    return _yolo_model


def _allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


@detection_bp.route('/', methods=['POST'])
@token_required
def run_detection(current_user):
    """
    Run the full detection pipeline with polygon support, GEE integration,
    and real-time SocketIO logging.
    """
    try:
        area_id = request.form.get('area_id')
        use_sample = request.form.get('use_sample', 'false').lower() == 'true'
        image_source_type = request.form.get('image_source', 'demo')  # gee / upload / demo
        file = request.files.get('file')

        if not area_id:
            return jsonify({'error': 'area_id is required'}), 400
        try:
            area_id = int(area_id)
        except ValueError:
            return jsonify({'error': 'area_id must be an integer'}), 400

        # Create scan session
        session = ScanSession(
            area_id=area_id,
            triggered_by='manual',
            status='running',
            started_at=datetime.utcnow(),
            image_source=image_source_type,
        )
        db.session.add(session)
        db.session.flush()
        session_id = session.id
        log_entries = []

        def log(step, msg, progress=0):
            entry = {'step': step, 'message': msg, 'progress': progress, 'time': datetime.utcnow().isoformat()}
            log_entries.append(entry)
            socketio_service.emit_detection_log(session_id, step, msg, progress)

        # ── STEP 1: Image Source ──────────────────────────
        log(1, '📡 Acquiring satellite image...', 10)
        upload_folder = current_app.config['UPLOAD_FOLDER']
        unique_id = str(uuid.uuid4())[:8]

        if file and file.filename:
            if not _allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
                return jsonify({'error': 'File type not allowed'}), 400
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = f"sat_{unique_id}.{ext}"
            image_path = os.path.join(upload_folder, filename)
            file.save(image_path)
            original_filename = file.filename
            actual_source = 'upload'
        elif image_source_type == 'gee' and gee_service.is_available():
            area = MonitoredArea.query.get(area_id)
            if not area:
                return jsonify({'error': f'Area {area_id} not found'}), 404
            filename = f"gee_{unique_id}.png"
            image_path = os.path.join(upload_folder, filename)
            bbox_coords = {'min_lat': area.min_lat, 'max_lat': area.max_lat,
                           'min_lon': area.min_lon, 'max_lon': area.max_lon}
            gee_result = gee_service.fetch_satellite_image(bbox_coords, image_path)
            original_filename = f"gee_sentinel2_{unique_id}.png"
            actual_source = gee_result.get('source', 'demo')
        elif use_sample or image_source_type == 'demo':
            filename = f"demo_sat_{unique_id}.png"
            image_path = os.path.join(upload_folder, filename)
            gee_service.generate_demo_satellite_image(image_path)
            original_filename = 'demo_satellite.png'
            actual_source = 'demo'
        else:
            return jsonify({'error': 'No image source provided. Upload an image, use GEE, or select demo mode.'}), 400

        # ── STEP 2: Get Area BBox ─────────────────────────
        log(2, '🗺️ Loading area coordinates...', 20)
        area = MonitoredArea.query.get(area_id)
        if not area:
            return jsonify({'error': f'Area with id {area_id} not found'}), 404

        bbox_coords = {
            'min_lat': area.min_lat, 'max_lat': area.max_lat,
            'min_lon': area.min_lon, 'max_lon': area.max_lon,
        }

        # Load polygon coordinates if polygon area
        polygon_coords = None
        if area.selection_method == 'polygon' and area.polygon_coordinates:
            try:
                polygon_coords = json.loads(area.polygon_coordinates)
            except (json.JSONDecodeError, TypeError):
                polygon_coords = None

        # ── STEP 3: Preprocess ────────────────────────────
        log(3, '🔧 Preprocessing image (resize, CLAHE, blur)...', 30)
        try:
            preprocessed_path = image_processing.preprocess(image_path)
        except Exception as e:
            print(f"[Detection] Preprocess error: {e}")
            preprocessed_path = image_path

        # ── STEP 4: Detect ────────────────────────────────
        log(4, '🤖 Running YOLOv8 object detection...', 45)
        model = _get_model()
        detections = yolo_service.detect(
            preprocessed_path, model=model,
            conf=current_app.config.get('YOLO_CONFIDENCE', 0.35),
            iou=current_app.config.get('YOLO_IOU', 0.45),
        )
        detections = yolo_service.apply_nms(detections)

        # ── STEP 5: Geo-tag ──────────────────────────────
        log(5, '📍 Geo-tagging detections with coordinates...', 55)
        try:
            img_pil = Image.open(image_path)
            img_w, img_h = img_pil.size
        except Exception:
            img_w, img_h = 640, 640

        detections = gis_service.geotag_detections(detections, img_w, img_h, bbox_coords)

        # ── STEP 5.5: Filter by polygon if applicable ────
        if polygon_coords and len(polygon_coords) >= 3:
            log(5, '📐 Filtering detections within polygon boundary...', 58)
            detections = gis_service.filter_by_polygon(detections, polygon_coords)

        # ── STEP 6: Load Zoning Data ─────────────────────
        log(6, '🗺️ Loading cadastral zoning records...', 65)
        geojson_path = os.path.join(current_app.config['ZONING_DATA_FOLDER'], 'pune_zones.geojson')
        zones = zoning_service.load_zoning_data(geojson_path)

        # ── STEP 7: Classify Each Detection ──────────────
        log(7, '🏷️ Classifying violations against zoning rules...', 75)
        for det in detections:
            result = zoning_service.classify_violation(det, zones)
            det.update(result)

        # ── STEP 8: Draw Annotated Image ─────────────────
        log(8, '🎨 Drawing annotated bounding boxes...', 85)
        annotated_folder = current_app.config['ANNOTATED_FOLDER']
        annotated_filename = f"annotated_{unique_id}.jpg"
        annotated_path = os.path.join(annotated_folder, annotated_filename)

        try:
            image_processing.draw_bounding_boxes(image_path, detections, annotated_path)
            # Draw polygon overlay if applicable
            if polygon_coords and len(polygon_coords) >= 3:
                image_processing.draw_polygon_overlay(
                    annotated_path, polygon_coords, img_w, img_h, bbox_coords, annotated_path
                )
        except Exception as e:
            print(f"[Detection] Annotate error: {e}")
            annotated_path = None

        # ── STEP 9: Save to DB ───────────────────────────
        log(9, '💾 Saving results to database...', 92)
        sat_image = SatelliteImage(
            filename=filename, original_filename=original_filename,
            area_id=area_id, file_path=image_path,
            annotated_path=annotated_path, capture_date=datetime.utcnow(),
            uploaded_at=datetime.utcnow(), processed=True,
            image_width=img_w, image_height=img_h, source=actual_source,
        )

        # ── Upload to Cloudinary ──────────────────────────
        try:
            original_cloud_url = cloudinary_service.upload_image(
                image_path, folder="illegal-construction/originals", public_id=f"sat_{unique_id}"
            )
            if original_cloud_url:
                sat_image.cloudinary_url = original_cloud_url
                log(9, f'☁️ Original image uploaded to Cloudinary', 93)

            if annotated_path and os.path.exists(annotated_path):
                annotated_cloud_url = cloudinary_service.upload_image(
                    annotated_path, folder="illegal-construction/annotated", public_id=f"annotated_{unique_id}"
                )
                if annotated_cloud_url:
                    sat_image.annotated_cloudinary_url = annotated_cloud_url
                    log(9, f'☁️ Annotated image uploaded to Cloudinary', 95)
        except Exception as e:
            print(f"[Detection] Cloudinary upload error: {e}")

        db.session.add(sat_image)
        db.session.flush()

        bounding_boxes = [d['bbox'] for d in detections]
        confidence_scores = [d['confidence'] for d in detections]
        class_labels = [d['class_label'] for d in detections]

        detection_record = Detection(
            image_id=sat_image.id,
            bounding_boxes=json.dumps(bounding_boxes),
            confidence_scores=json.dumps(confidence_scores),
            class_labels=json.dumps(class_labels),
            detected_at=datetime.utcnow(),
            total_objects_detected=len(detections),
        )
        db.session.add(detection_record)
        db.session.flush()

        violations_created = []
        for det in detections:
            if not det.get('is_authorized', True):
                severity = zoning_service.determine_severity(det['confidence'])
                violation = Violation(
                    detection_id=detection_record.id,
                    violation_type=det.get('violation_type', 'Unknown'),
                    severity=severity, status='Pending',
                    latitude=det.get('lat'), longitude=det.get('lon'),
                    area_sqm=det.get('area_sqm'),
                    confidence_score=det.get('confidence'),
                    zone_name=det.get('zone_name', 'Unknown'),
                    permit_status=det.get('permit_status', 'Unknown'),
                    detected_at=datetime.utcnow(), updated_at=datetime.utcnow(),
                )
                db.session.add(violation)
                db.session.flush()

                try:
                    alert_service.create_alert(violation, db.session, Alert)
                except Exception as e:
                    print(f"[Detection] Alert error: {e}")

                webhook_url = current_app.config.get('N8N_WEBHOOK_URL', '')
                if webhook_url:
                    try:
                        alert_service.send_webhook(violation, webhook_url)
                    except Exception as e:
                        print(f"[Detection] Webhook error: {e}")

                v_dict = violation.to_dict()
                violations_created.append(v_dict)
                socketio_service.emit_violation_alert(v_dict)

        # Update scan session
        session.status = 'completed'
        session.completed_at = datetime.utcnow()
        session.duration_seconds = (session.completed_at - session.started_at).total_seconds()
        session.total_detections = len(detections)
        session.total_violations = len(violations_created)
        session.detection_id = detection_record.id
        session.logs = json.dumps(log_entries)
        db.session.commit()

        # ── STEP 10: Return Response ─────────────────────
        log(10, '✅ Detection pipeline complete!', 100)

        annotated_url = None
        if sat_image.annotated_cloudinary_url:
            annotated_url = sat_image.annotated_cloudinary_url
        elif annotated_path and os.path.exists(annotated_path):
            annotated_url = f'/api/detect/image/{annotated_filename}'

        result_data = {
            'success': True,
            'image_id': sat_image.id,
            'detection_id': detection_record.id,
            'session_id': session_id,
            'annotated_image_url': annotated_url,
            'total_detections': len(detections),
            'violations_found': len(violations_created),
            'detections': detections,
            'violations': violations_created,
            'image_source': actual_source,
            'area_method': area.selection_method or 'bbox',
        }

        socketio_service.emit_detection_complete(session_id, {
            'total_detections': len(detections),
            'violations_found': len(violations_created),
            'image_source': actual_source,
        })

        return jsonify(result_data), 200

    except Exception as e:
        db.session.rollback()
        print(f"[Detection] Pipeline error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Detection pipeline failed: {str(e)}'}), 500


@detection_bp.route('/image/<filename>', methods=['GET'])
def get_annotated_image(filename):
    """Serve annotated image file. Redirects to Cloudinary if available."""
    try:
        # Check if this image has a Cloudinary URL in the database
        from flask import redirect
        sat_image = SatelliteImage.query.filter(
            (SatelliteImage.filename == filename) |
            (SatelliteImage.annotated_path.like(f'%{filename}%'))
        ).first()
        if sat_image and sat_image.annotated_cloudinary_url:
            return redirect(sat_image.annotated_cloudinary_url)

        # Fallback to local file
        annotated_folder = current_app.config['ANNOTATED_FOLDER']
        file_path = os.path.join(annotated_folder, filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'Image not found'}), 404
        return send_file(file_path, mimetype='image/jpeg')
    except Exception as e:
        print(f"[Detection] Image serve error: {e}")
        return jsonify({'error': 'Could not serve image'}), 500
