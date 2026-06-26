"""
Cloudinary upload service for images and PDF reports.
Uploads files to Cloudinary CDN and returns secure URLs.
"""
import os
import cloudinary
import cloudinary.uploader
from config import Config

# Module-level initialization flag
_initialized = False


def _ensure_init():
    """Initialize Cloudinary SDK once using Config values."""
    global _initialized
    if _initialized:
        return

    config = Config()
    cloud_name = config.CLOUDINARY_CLOUD_NAME
    api_key = config.CLOUDINARY_API_KEY
    api_secret = config.CLOUDINARY_API_SECRET

    if not all([cloud_name, api_key, api_secret]):
        print("[Cloudinary] WARNING: Missing credentials — uploads will be skipped")
        return

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    _initialized = True
    print(f"[Cloudinary] Initialized for cloud: {cloud_name}")


def is_configured():
    """Check whether Cloudinary credentials are present."""
    _ensure_init()
    return _initialized


def upload_image(local_path, folder="illegal-construction/images", public_id=None):
    """
    Upload an image file to Cloudinary.
    Returns the secure_url string, or None on failure.
    """
    if not is_configured():
        return None

    if not os.path.exists(local_path):
        print(f"[Cloudinary] File not found: {local_path}")
        return None

    try:
        options = {
            "folder": folder,
            "resource_type": "image",
            "overwrite": True,
            "quality": "auto:good",
            "fetch_format": "auto",
        }
        if public_id:
            options["public_id"] = public_id

        result = cloudinary.uploader.upload(local_path, **options)
        url = result.get("secure_url")
        print(f"[Cloudinary] Image uploaded: {url}")
        return url
    except Exception as e:
        print(f"[Cloudinary] Image upload error: {e}")
        return None


def upload_pdf(local_path, folder="illegal-construction/reports", public_id=None):
    """
    Upload a PDF file to Cloudinary as a raw resource.
    Returns the secure_url string, or None on failure.
    """
    if not is_configured():
        return None

    if not os.path.exists(local_path):
        print(f"[Cloudinary] File not found: {local_path}")
        return None

    try:
        options = {
            "folder": folder,
            "resource_type": "raw",
            "overwrite": True,
        }
        if public_id:
            options["public_id"] = public_id

        result = cloudinary.uploader.upload(local_path, **options)
        url = result.get("secure_url")
        print(f"[Cloudinary] PDF uploaded: {url}")
        return url
    except Exception as e:
        print(f"[Cloudinary] PDF upload error: {e}")
        return None


def delete_asset(public_id, resource_type="image"):
    """
    Delete an asset from Cloudinary by its public_id.
    """
    if not is_configured():
        return False

    try:
        result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return result.get("result") == "ok"
    except Exception as e:
        print(f"[Cloudinary] Delete error: {e}")
        return False
