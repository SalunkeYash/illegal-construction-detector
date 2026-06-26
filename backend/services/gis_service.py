from math import cos, radians


def pixel_to_latlon(px, py, image_w, image_h, bbox_coords):
    """
    Convert pixel coordinates to latitude/longitude using linear interpolation
    within the monitored area bounding box.
    """
    min_lat = bbox_coords['min_lat']
    max_lat = bbox_coords['max_lat']
    min_lon = bbox_coords['min_lon']
    max_lon = bbox_coords['max_lon']

    lat = max_lat - (py / image_h) * (max_lat - min_lat)
    lon = min_lon + (px / image_w) * (max_lon - min_lon)

    return lat, lon


def bbox_to_latlon(bbox, image_w, image_h, bbox_coords):
    """
    Convert a bounding box to center lat/lon and calculate area in square meters.
    """
    x1, y1, x2, y2 = bbox
    center_x = (x1 + x2) / 2
    center_y = (y1 + y2) / 2

    lat, lon = pixel_to_latlon(center_x, center_y, image_w, image_h, bbox_coords)
    area_sqm = calculate_area_sqm(bbox, image_w, image_h, bbox_coords)

    return lat, lon, area_sqm


def calculate_area_sqm(bbox, image_w, image_h, bbox_coords):
    """
    Approximate the real-world area in square meters for a bounding box
    based on the monitored area's geographic extent.
    """
    pixel_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
    total_pixels = image_w * image_h

    lat_range = bbox_coords['max_lat'] - bbox_coords['min_lat']
    lon_range = bbox_coords['max_lon'] - bbox_coords['min_lon']

    # Approximate: 1 degree lat ≈ 111000m, 1 degree lon ≈ 111000*cos(lat) m
    avg_lat = (bbox_coords['min_lat'] + bbox_coords['max_lat']) / 2
    total_area_sqm = (lat_range * 111000) * (lon_range * 111000 * abs(cos(radians(avg_lat))))

    area_sqm = (pixel_area / total_pixels) * total_area_sqm
    return round(area_sqm, 2)


def geotag_detections(detections, image_w, image_h, bbox_coords):
    """
    Add latitude, longitude, and area_sqm to each detection
    based on its bounding box position within the image.
    """
    for det in detections:
        bbox = det.get('bbox', [0, 0, 0, 0])
        lat, lon, area_sqm = bbox_to_latlon(bbox, image_w, image_h, bbox_coords)
        det['lat'] = round(lat, 6)
        det['lon'] = round(lon, 6)
        det['area_sqm'] = area_sqm

    return detections


def create_geojson_features(violations):
    """
    Create a GeoJSON FeatureCollection from a list of violation objects.
    """
    features = []

    for v in violations:
        if hasattr(v, 'to_dict'):
            vd = v.to_dict()
        elif isinstance(v, dict):
            vd = v
        else:
            continue

        lat = vd.get('latitude', 0)
        lon = vd.get('longitude', 0)

        if lat is None or lon is None:
            continue

        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [lon, lat],
            },
            'properties': {
                'id': vd.get('id'),
                'violation_type': vd.get('violation_type'),
                'severity': vd.get('severity'),
                'status': vd.get('status'),
                'confidence_score': vd.get('confidence_score'),
                'detected_at': vd.get('detected_at'),
                'area_sqm': vd.get('area_sqm'),
                'zone_name': vd.get('zone_name'),
            },
        }
        features.append(feature)

    return {
        'type': 'FeatureCollection',
        'features': features,
    }


def filter_by_polygon(detections, polygon_coords):
    """
    Filter detections to only include those whose center lat/lon
    falls INSIDE the polygon defined by polygon_coords.
    polygon_coords: list of [lat, lon] pairs.
    """
    if not polygon_coords or len(polygon_coords) < 3:
        return detections  # No polygon filter, return all

    try:
        from shapely.geometry import Point, Polygon

        # Shapely uses (lon, lat) order
        poly = Polygon([(lon, lat) for lat, lon in polygon_coords])
        filtered = []
        for d in detections:
            pt = Point(d.get('lon', 0), d.get('lat', 0))
            if pt.within(poly):
                filtered.append(d)
        return filtered
    except Exception as e:
        print(f"[GIS] Polygon filter error: {e} — returning all detections")
        return detections


def latlon_to_pixel(lat, lon, image_w, image_h, bbox_coords):
    """
    Convert latitude/longitude to pixel coordinates within the image.
    Inverse of pixel_to_latlon.
    """
    min_lat = bbox_coords['min_lat']
    max_lat = bbox_coords['max_lat']
    min_lon = bbox_coords['min_lon']
    max_lon = bbox_coords['max_lon']

    py = ((max_lat - lat) / (max_lat - min_lat)) * image_h
    px = ((lon - min_lon) / (max_lon - min_lon)) * image_w

    return int(px), int(py)
