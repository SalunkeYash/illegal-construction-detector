"""
Google Earth Engine service with graceful fallback to demo mode.
If GEE is not configured or unavailable, generates demo satellite images.
"""
import os
import random
from datetime import datetime, timedelta
from PIL import Image, ImageDraw

_gee_available = False
_gee_initialized = False

try:
    import ee
    _gee_available = True
except ImportError:
    _gee_available = False


def init_gee(service_account=None, project=None, key_file=None):
    """Initialize Google Earth Engine. Returns True on success."""
    global _gee_initialized
    if not _gee_available:
        print("[GEE] earthengine-api not installed — running in demo mode")
        return False

    try:
        if service_account and key_file and os.path.exists(key_file):
            credentials = ee.ServiceAccountCredentials(service_account, key_file)
            ee.Initialize(credentials, project=project)
        else:
            ee.Initialize(project=project)

        _gee_initialized = True
        print(f"[GEE] Initialized successfully (project: {project})")
        return True
    except Exception as e:
        print(f"[GEE] Initialization failed: {e} — running in demo mode")
        _gee_initialized = False
        return False


def is_available():
    """Check if GEE is available and initialized."""
    return _gee_available and _gee_initialized


def get_status():
    """Return GEE status information."""
    return {
        'available': _gee_available,
        'authenticated': _gee_initialized,
        'project': '',
        'mode': 'service_account' if _gee_initialized else 'demo',
    }


def fetch_satellite_image(bbox_coords, output_path, resolution=10):
    """
    Fetch satellite imagery from Google Earth Engine for the given bounding box.
    Falls back to demo image generation if GEE is unavailable.
    """
    if not is_available():
        return generate_demo_satellite_image(output_path)

    try:
        min_lat = bbox_coords['min_lat']
        max_lat = bbox_coords['max_lat']
        min_lon = bbox_coords['min_lon']
        max_lon = bbox_coords['max_lon']

        # Define AOI
        aoi = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])

        # Get recent Sentinel-2 image
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=90)

        collection = (
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(aoi)
            .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            .sort('CLOUDY_PIXEL_PERCENTAGE')
        )

        image = collection.first()
        if image is None:
            print("[GEE] No Sentinel-2 images found — using demo image")
            return generate_demo_satellite_image(output_path)

        # Get RGB bands
        rgb = image.select(['B4', 'B3', 'B2'])

        # Generate URL for download
        url = rgb.getThumbURL({
            'region': aoi,
            'dimensions': '640x640',
            'min': 0,
            'max': 3000,
            'format': 'png',
        })

        # Download image
        import requests
        response = requests.get(url, timeout=60)
        if response.status_code == 200:
            with open(output_path, 'wb') as f:
                f.write(response.content)
            return {'path': output_path, 'source': 'sentinel-2', 'is_demo': False}
        else:
            print(f"[GEE] Download failed ({response.status_code}) — using demo image")
            return generate_demo_satellite_image(output_path)

    except Exception as e:
        print(f"[GEE] Fetch error: {e} — using demo image")
        return generate_demo_satellite_image(output_path)


def generate_demo_satellite_image(output_path):
    """
    Generate a 640x640 PIL image simulating a satellite view.
    Used as fallback when GEE is not available.
    """
    img = Image.new('RGB', (640, 640), color=(138, 154, 138))
    draw = ImageDraw.Draw(img)

    # Draw road lines
    for _ in range(random.randint(3, 6)):
        if random.random() > 0.5:
            y = random.randint(50, 590)
            draw.line([(0, y), (640, y)], fill=(100, 100, 100), width=random.randint(3, 6))
        else:
            x = random.randint(50, 590)
            draw.line([(x, 0), (x, 640)], fill=(100, 100, 100), width=random.randint(3, 6))

    # Draw buildings (random filled rectangles)
    for _ in range(random.randint(8, 15)):
        w = random.randint(30, 120)
        h = random.randint(30, 100)
        x1 = random.randint(10, 600 - w)
        y1 = random.randint(10, 600 - h)
        grey_shade = random.randint(140, 200)
        color = (grey_shade, grey_shade - 10, grey_shade - 5)
        draw.rectangle([x1, y1, x1 + w, y1 + h], fill=color, outline=(80, 80, 80), width=1)

    # Add green areas
    for _ in range(random.randint(2, 4)):
        cx = random.randint(50, 590)
        cy = random.randint(50, 590)
        r = random.randint(15, 40)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                     fill=(80, 120 + random.randint(0, 40), 70))

    # Add noise
    pixels = img.load()
    for _ in range(2000):
        nx = random.randint(0, 639)
        ny = random.randint(0, 639)
        r, g, b = pixels[nx, ny]
        noise = random.randint(-15, 15)
        pixels[nx, ny] = (
            max(0, min(255, r + noise)),
            max(0, min(255, g + noise)),
            max(0, min(255, b + noise)),
        )

    img.save(output_path, 'PNG')
    return {'path': output_path, 'source': 'demo', 'is_demo': True}
