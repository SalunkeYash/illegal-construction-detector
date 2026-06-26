import os
import cv2
import numpy as np
from PIL import Image


def preprocess(image_path, target_size=640):
    """
    Preprocess a satellite image for YOLO detection.
    - Resize to target_size x target_size
    - Gaussian blur for noise removal
    - CLAHE on L channel for contrast enhancement
    Returns the path to the preprocessed image.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    # Resize to target dimensions
    img = cv2.resize(img, (target_size, target_size), interpolation=cv2.INTER_AREA)

    # Apply Gaussian blur for noise removal
    img = cv2.GaussianBlur(img, (3, 3), 0)

    # Apply CLAHE on L channel in LAB color space for contrast enhancement
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_channel = clahe.apply(l_channel)
    lab = cv2.merge([l_channel, a_channel, b_channel])
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # Ensure uint8 range
    img = np.clip(img, 0, 255).astype(np.uint8)

    # Save preprocessed image
    base, ext = os.path.splitext(image_path)
    preprocessed_path = f"{base}_preprocessed{ext}"
    cv2.imwrite(preprocessed_path, img)

    return preprocessed_path


def draw_bounding_boxes(image_path, detections, output_path):
    """
    Draw bounding boxes on the image with labels and confidence scores.
    Green for authorized, Red for unauthorized detections.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    for det in detections:
        bbox = det.get('bbox', [0, 0, 0, 0])
        x1, y1, x2, y2 = [int(v) for v in bbox]
        confidence = det.get('confidence', 0.0)
        class_label = det.get('class_label', 'unknown')
        is_authorized = det.get('is_authorized', True)

        # Color: green if authorized, red if unauthorized
        color = (0, 200, 0) if is_authorized else (0, 0, 220)
        thickness = 2

        # Draw bounding box rectangle
        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)

        # Prepare label text
        label = f"{class_label} {confidence:.0%}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        font_thickness = 1

        # Calculate text size for background rectangle
        (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, font_thickness)

        # Draw filled rectangle background for text
        cv2.rectangle(img, (x1, y1 - text_h - baseline - 4), (x1 + text_w + 4, y1), color, -1)

        # Draw text
        cv2.putText(img, label, (x1 + 2, y1 - baseline - 2), font, font_scale, (255, 255, 255), font_thickness, cv2.LINE_AA)

    cv2.imwrite(output_path, img)
    return output_path


def create_thumbnail(image_path, size=(300, 300)):
    """
    Create a thumbnail of the image using PIL.
    Returns the path to the thumbnail.
    """
    try:
        img = Image.open(image_path)
        img.thumbnail(size, Image.LANCZOS)

        base, ext = os.path.splitext(image_path)
        thumb_path = f"{base}_thumb.jpg"
        img.save(thumb_path, "JPEG", quality=85)

        return thumb_path
    except Exception as e:
        print(f"Error creating thumbnail: {e}")
        return image_path


def draw_polygon_overlay(image_path, polygon_coords, image_w, image_h, bbox_coords, output_path):
    """
    Draw a polygon outline on the image by converting lat/lon coords to pixel coords.
    polygon_coords: list of [lat, lon] pairs.
    """
    from services.gis_service import latlon_to_pixel

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    if not polygon_coords or len(polygon_coords) < 3:
        cv2.imwrite(output_path, img)
        return output_path

    # Convert lat/lon to pixel coordinates
    pixel_points = []
    for lat, lon in polygon_coords:
        px, py = latlon_to_pixel(lat, lon, image_w, image_h, bbox_coords)
        pixel_points.append([px, py])

    # Draw polygon outline
    pts = np.array(pixel_points, dtype=np.int32).reshape((-1, 1, 2))
    cv2.polylines(img, [pts], isClosed=True, color=(255, 165, 30), thickness=3)

    # Draw semi-transparent fill
    overlay = img.copy()
    cv2.fillPoly(overlay, [pts], color=(30, 65, 255))
    cv2.addWeighted(overlay, 0.15, img, 0.85, 0, img)

    cv2.imwrite(output_path, img)
    return output_path
