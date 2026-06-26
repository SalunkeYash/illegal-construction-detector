import json
import os
from shapely.geometry import shape, Point


def load_zoning_data(geojson_path):
    """
    Load zoning data from a GeoJSON file.
    Parse features into list of zone dicts with shapely Polygon geometries.
    """
    zones = []

    if not os.path.exists(geojson_path):
        print(f"[ZoningService] GeoJSON file not found: {geojson_path}")
        return zones

    try:
        with open(geojson_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"[ZoningService] Error reading GeoJSON: {e}")
        return zones

    features = data.get('features', [])

    for feature in features:
        try:
            geometry = feature.get('geometry')
            properties = feature.get('properties', {})

            polygon = shape(geometry)

            zone = {
                'name': properties.get('name', 'Unknown Zone'),
                'zone_type': properties.get('zone_type', 'Residential'),
                'polygon': polygon,
                'is_approved': properties.get('is_approved', False),
                'permit_number': properties.get('permit_number', ''),
                'max_allowed_sqm': properties.get('max_allowed_sqm', 5000),
                'owner_name': properties.get('owner_name', ''),
            }
            zones.append(zone)
        except Exception as e:
            print(f"[ZoningService] Error parsing feature: {e}")
            continue

    return zones


def point_in_zone(lat, lon, zones):
    """
    Check if a point (lat, lon) falls within any zone polygon.
    Returns the matching zone dict or None.
    """
    pt = Point(lon, lat)

    for zone in zones:
        try:
            if pt.within(zone['polygon']):
                return zone
        except Exception:
            continue

    return None


def classify_violation(detection, zones):
    """
    Classify a detection against zoning data to determine if it's a violation.
    Returns a dict with violation_type, is_authorized, zone_name, permit_status.
    """
    lat = detection.get('lat', 0)
    lon = detection.get('lon', 0)

    zone = point_in_zone(lat, lon, zones)

    if zone is None:
        return {
            'violation_type': 'No Cadastral Match',
            'is_authorized': False,
            'zone_name': 'Unknown',
            'permit_status': 'No Record',
        }

    if zone['zone_type'] == 'Restricted':
        return {
            'violation_type': 'Boundary Violation',
            'is_authorized': False,
            'zone_name': zone['name'],
            'permit_status': 'Restricted',
        }

    if zone['zone_type'] == 'Green':
        return {
            'violation_type': 'Unauthorized Extension',
            'is_authorized': False,
            'zone_name': zone['name'],
            'permit_status': 'Not Permitted',
        }

    area_sqm = detection.get('area_sqm', 0)
    if area_sqm > zone.get('max_allowed_sqm', 5000):
        return {
            'violation_type': 'Height Violation',
            'is_authorized': False,
            'zone_name': zone['name'],
            'permit_status': 'Exceeds Limit',
        }

    return {
        'violation_type': None,
        'is_authorized': True,
        'zone_name': zone['name'],
        'permit_status': 'Approved',
    }


def determine_severity(confidence):
    """Determine violation severity based on confidence score."""
    if confidence >= 0.90:
        return 'HIGH'
    if confidence >= 0.70:
        return 'MEDIUM'
    return 'LOW'
