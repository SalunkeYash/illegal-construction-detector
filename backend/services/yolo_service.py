import os
import random
import numpy as np

# Try to import ultralytics YOLO, fall back to mock mode if unavailable
_yolo_available = False
try:
    from ultralytics import YOLO as _YOLO
    _yolo_available = True
except ImportError:
    _yolo_available = False


def load_model(weights_path='yolov8n.pt'):
    """
    Load YOLOv8 model. Falls back to None (mock mode) if ultralytics
    is not installed or model cannot be loaded.
    """
    if not _yolo_available:
        print("[YOLOv8] ultralytics not available — running in MOCK detection mode")
        return None

    try:
        model = _YOLO(weights_path)
        print(f"[YOLOv8] Model loaded successfully: {weights_path}")
        return model
    except Exception as e:
        print(f"[YOLOv8] Failed to load model: {e} — running in MOCK detection mode")
        return None


def detect(image_path, model=None, conf=0.35, iou=0.45):
    """
    Run object detection on an image.
    If model is None, generates realistic mock detections for demo purposes.
    """
    if model is None:
        return _mock_detect(image_path)

    try:
        results = model(image_path, conf=conf, iou=iou, verbose=False)
        detections = []

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            for i in range(len(boxes)):
                bbox = boxes.xyxy[i].cpu().numpy().tolist()
                confidence = float(boxes.conf[i].cpu().numpy())
                class_id = int(boxes.cls[i].cpu().numpy())
                class_label = result.names.get(class_id, 'object')

                detections.append({
                    'bbox': [round(v, 1) for v in bbox],
                    'confidence': round(confidence, 4),
                    'class_label': class_label,
                    'is_mock': False,
                })

        return detections

    except Exception as e:
        print(f"[YOLOv8] Detection error: {e} — falling back to mock mode")
        return _mock_detect(image_path)


def _mock_detect(image_path):
    """
    Generate 3-7 realistic mock detections for demo purposes.
    Uses random coordinates within typical image dimensions.
    """
    try:
        import cv2
        img = cv2.imread(image_path)
        if img is not None:
            img_h, img_w = img.shape[:2]
        else:
            img_w, img_h = 640, 640
    except Exception:
        img_w, img_h = 640, 640

    class_labels = ['building', 'construction', 'rooftop', 'foundation', 'structure', 'extension']
    num_detections = random.randint(3, 7)
    detections = []

    for _ in range(num_detections):
        # Generate random bounding box within image bounds
        w = random.randint(40, min(150, img_w // 3))
        h = random.randint(40, min(150, img_h // 3))
        x1 = random.randint(10, max(11, img_w - w - 10))
        y1 = random.randint(10, max(11, img_h - h - 10))
        x2 = x1 + w
        y2 = y1 + h

        detections.append({
            'bbox': [x1, y1, x2, y2],
            'confidence': round(random.uniform(0.72, 0.99), 4),
            'class_label': random.choice(class_labels),
            'is_mock': True,
        })

    return detections


def apply_nms(detections, iou_threshold=0.45):
    """
    Apply Non-Maximum Suppression using shapely Polygon intersection.
    Filters overlapping detections, keeping the most confident ones.
    """
    if not detections:
        return detections

    from shapely.geometry import box as shapely_box

    # Sort by confidence descending
    sorted_dets = sorted(detections, key=lambda d: d['confidence'], reverse=True)
    kept = []

    for det in sorted_dets:
        bbox = det['bbox']
        det_poly = shapely_box(bbox[0], bbox[1], bbox[2], bbox[3])
        should_keep = True

        for kept_det in kept:
            kept_bbox = kept_det['bbox']
            kept_poly = shapely_box(kept_bbox[0], kept_bbox[1], kept_bbox[2], kept_bbox[3])

            if not det_poly.intersects(kept_poly):
                continue

            intersection_area = det_poly.intersection(kept_poly).area
            union_area = det_poly.union(kept_poly).area

            if union_area > 0:
                iou = intersection_area / union_area
                if iou > iou_threshold:
                    should_keep = False
                    break

        if should_keep:
            kept.append(det)

    return kept
