import os
import cv2
import numpy as np


def compare_images(old_path, new_path):
    """
    Compare two images to detect changes between them.
    Uses absolute difference and contour detection to find changed regions.
    Returns dict with changed_regions, change_percentage, has_significant_change.
    """
    # Handle missing files gracefully
    if old_path is None or new_path is None:
        return {
            'changed_regions': [],
            'change_percentage': 0.0,
            'has_significant_change': False,
        }

    if not os.path.exists(old_path) or not os.path.exists(new_path):
        return {
            'changed_regions': [],
            'change_percentage': 0.0,
            'has_significant_change': False,
        }

    # Read both images
    old_img = cv2.imread(old_path)
    new_img = cv2.imread(new_path)

    if old_img is None or new_img is None:
        return {
            'changed_regions': [],
            'change_percentage': 0.0,
            'has_significant_change': False,
        }

    # Resize to same dimensions
    target_size = (640, 640)
    old_img = cv2.resize(old_img, target_size, interpolation=cv2.INTER_AREA)
    new_img = cv2.resize(new_img, target_size, interpolation=cv2.INTER_AREA)

    # Convert to grayscale
    old_gray = cv2.cvtColor(old_img, cv2.COLOR_BGR2GRAY)
    new_gray = cv2.cvtColor(new_img, cv2.COLOR_BGR2GRAY)

    # Compute absolute difference
    diff = cv2.absdiff(old_gray, new_gray)

    # Threshold at 30 to get change mask
    _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)

    # Find contours of changed regions
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    changed_regions = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area > 500:  # Filter small noise
            x, y, w, h = cv2.boundingRect(contour)
            changed_regions.append([x, y, x + w, y + h])

    # Calculate change percentage
    total_pixels = target_size[0] * target_size[1]
    changed_pixels = np.count_nonzero(thresh)
    change_percentage = round((changed_pixels / total_pixels) * 100, 2)

    return {
        'changed_regions': changed_regions,
        'change_percentage': change_percentage,
        'has_significant_change': change_percentage > 5.0,
    }
