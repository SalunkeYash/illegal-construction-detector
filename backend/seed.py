"""
Database seeder for AI-Based Illegal Construction Detection System.
Run with: python seed.py
"""
import sys
import os
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models.database import db, User, MonitoredArea, SatelliteImage, Detection, Violation, Alert, ZoningRecord, ScanSession


def seed_database():
    """Seed the database with complete demo data."""
    app = create_app()

    with app.app_context():
        print("Dropping existing tables to refresh schema...")
        db.drop_all()
        print("Creating new tables...")
        db.create_all()

        # ─── USERS (3) ──────────────────────────────────
        print("Creating users...")
        admin = User(username='admin', email='admin@jscoe.edu', role='admin', is_active=True)
        admin.set_password('Admin@123')

        officer = User(username='officer', email='officer@pmcpune.gov.in', role='authority', is_active=True)
        officer.set_password('Officer@123')

        citizen = User(username='citizen', email='citizen@pune.com', role='citizen', is_active=True)
        citizen.set_password('Citizen@123')

        db.session.add_all([admin, officer, citizen])
        db.session.flush()

        # ─── MONITORED AREAS (7) ────────────────────────
        print("Creating monitored areas...")

        # 5 bbox areas
        bbox_areas_data = [
            {'name': 'Hadapsar', 'min_lat': 18.49, 'max_lat': 18.52, 'min_lon': 73.93, 'max_lon': 73.97, 'description': 'Hadapsar industrial and residential zone, eastern Pune'},
            {'name': 'Baner', 'min_lat': 18.55, 'max_lat': 18.58, 'min_lon': 73.77, 'max_lon': 73.81, 'description': 'Baner IT hub and residential expansion area'},
            {'name': 'Kothrud', 'min_lat': 18.49, 'max_lat': 18.52, 'min_lon': 73.81, 'max_lon': 73.85, 'description': 'Kothrud residential and educational zone'},
            {'name': 'Wakad', 'min_lat': 18.58, 'max_lat': 18.61, 'min_lon': 73.74, 'max_lon': 73.78, 'description': 'Wakad rapidly developing residential area'},
            {'name': 'Pimpri', 'min_lat': 18.61, 'max_lat': 18.64, 'min_lon': 73.79, 'max_lon': 73.83, 'description': 'Pimpri-Chinchwad industrial and residential belt'},
        ]

        areas = []
        for ad in bbox_areas_data:
            area = MonitoredArea(
                name=ad['name'],
                min_lat=ad['min_lat'], max_lat=ad['max_lat'],
                min_lon=ad['min_lon'], max_lon=ad['max_lon'],
                created_by=admin.id, status='active',
                description=ad['description'],
                selection_method='bbox',
                center_lat=(ad['min_lat'] + ad['max_lat']) / 2,
                center_lon=(ad['min_lon'] + ad['max_lon']) / 2,
            )
            db.session.add(area)
            areas.append(area)

        # 2 polygon areas
        koregaon_coords = [
            [18.5369, 73.8932], [18.5412, 73.8978], [18.5398, 73.9021],
            [18.5342, 73.9018], [18.5318, 73.8965], [18.5369, 73.8932]
        ]
        k_lats = [p[0] for p in koregaon_coords]
        k_lons = [p[1] for p in koregaon_coords]
        koregaon_area = MonitoredArea(
            name='Koregaon Park',
            min_lat=min(k_lats), max_lat=max(k_lats),
            min_lon=min(k_lons), max_lon=max(k_lons),
            created_by=admin.id, status='active',
            description='Koregaon Park upscale residential and commercial area',
            polygon_coordinates=json.dumps(koregaon_coords),
            selection_method='polygon',
            center_lat=sum(k_lats) / len(k_lats),
            center_lon=sum(k_lons) / len(k_lons),
        )
        db.session.add(koregaon_area)
        areas.append(koregaon_area)

        shivajinagar_coords = [
            [18.5308, 73.8474], [18.5356, 73.8521], [18.5334, 73.8567],
            [18.5289, 73.8578], [18.5261, 73.8534], [18.5272, 73.8489],
            [18.5308, 73.8474]
        ]
        s_lats = [p[0] for p in shivajinagar_coords]
        s_lons = [p[1] for p in shivajinagar_coords]
        shivajinagar_area = MonitoredArea(
            name='Shivajinagar',
            min_lat=min(s_lats), max_lat=max(s_lats),
            min_lon=min(s_lons), max_lon=max(s_lons),
            created_by=admin.id, status='active',
            description='Shivajinagar central commercial and heritage zone',
            polygon_coordinates=json.dumps(shivajinagar_coords),
            selection_method='polygon',
            center_lat=sum(s_lats) / len(s_lats),
            center_lon=sum(s_lons) / len(s_lons),
        )
        db.session.add(shivajinagar_area)
        areas.append(shivajinagar_area)
        db.session.flush()

        # ─── ZONING RECORDS (10) ─────────────────────────
        print("Creating zoning records...")
        zoning_data = [
            {'zone_name': 'Hadapsar Residential A', 'zone_type': 'Residential', 'permit_number': 'PMC/HAD/RES/001', 'is_approved': True, 'owner_name': 'PMC Ward Office', 'area_sqm': 45000},
            {'zone_name': 'Hadapsar Commercial Hub', 'zone_type': 'Commercial', 'permit_number': 'PMC/HAD/COM/002', 'is_approved': True, 'owner_name': 'Hadapsar Business Park', 'area_sqm': 80000},
            {'zone_name': 'Baner IT Park Zone', 'zone_type': 'Commercial', 'permit_number': 'PMC/BAN/COM/003', 'is_approved': True, 'owner_name': 'Baner IT Development', 'area_sqm': 60000},
            {'zone_name': 'Baner Hill Green Zone', 'zone_type': 'Green', 'permit_number': '', 'is_approved': False, 'owner_name': 'Forest Department', 'area_sqm': 120000},
            {'zone_name': 'Kothrud Educational Zone', 'zone_type': 'Residential', 'permit_number': 'PMC/KOT/RES/005', 'is_approved': True, 'owner_name': 'SPPU Campus', 'area_sqm': 55000},
            {'zone_name': 'Kothrud Market Area', 'zone_type': 'Commercial', 'permit_number': 'PMC/KOT/COM/006', 'is_approved': True, 'owner_name': 'Kothrud Traders Assoc', 'area_sqm': 35000},
            {'zone_name': 'Wakad Residential Expansion', 'zone_type': 'Residential', 'permit_number': 'PCMC/WAK/RES/007', 'is_approved': True, 'owner_name': 'PCMC Wakad Office', 'area_sqm': 70000},
            {'zone_name': 'Wakad Defence Zone', 'zone_type': 'Restricted', 'permit_number': '', 'is_approved': False, 'owner_name': 'Ministry of Defence', 'area_sqm': 150000},
            {'zone_name': 'Pimpri Industrial Area', 'zone_type': 'Residential', 'permit_number': 'PCMC/PIM/IND/009', 'is_approved': True, 'owner_name': 'MIDC Pimpri', 'area_sqm': 90000},
            {'zone_name': 'Pimpri Cantonment', 'zone_type': 'Restricted', 'permit_number': '', 'is_approved': False, 'owner_name': 'Cantonment Board', 'area_sqm': 100000},
        ]
        for zd in zoning_data:
            zr = ZoningRecord(
                zone_name=zd['zone_name'], zone_type=zd['zone_type'],
                permit_number=zd['permit_number'], is_approved=zd['is_approved'],
                owner_name=zd['owner_name'], area_sqm=zd['area_sqm'],
            )
            db.session.add(zr)
        db.session.flush()

        # ─── SATELLITE IMAGES (7) ───────────────────────
        print("Creating satellite image records...")
        sat_images = []
        for i, area in enumerate(areas):
            fname = f"{area.name.lower().replace(' ', '_')}_sat.jpg"
            si = SatelliteImage(
                filename=fname, original_filename=fname,
                area_id=area.id,
                file_path=f'data/uploads/{fname}',
                annotated_path=f'data/annotated/annotated_{fname}',
                capture_date=datetime.utcnow() - timedelta(days=i * 3),
                uploaded_at=datetime.utcnow() - timedelta(days=i * 3),
                processed=True, image_width=640, image_height=640,
                source='demo',
            )
            db.session.add(si)
            sat_images.append(si)
        db.session.flush()

        # ─── DETECTIONS (7) ─────────────────────────────
        print("Creating detection records...")
        det_records = []
        detection_counts = [35, 42, 30, 38, 45, 28, 33]
        for i, si in enumerate(sat_images):
            det = Detection(
                image_id=si.id,
                bounding_boxes='[[100,100,200,200],[300,150,420,280],[50,400,170,520]]',
                confidence_scores='[0.95, 0.88, 0.76]',
                class_labels='["building","construction","structure"]',
                detected_at=datetime.utcnow() - timedelta(days=i * 3),
                total_objects_detected=detection_counts[i],
            )
            db.session.add(det)
            det_records.append(det)
        db.session.flush()

        # ─── SCAN SESSIONS (7) ──────────────────────────
        print("Creating scan sessions...")
        for i, area in enumerate(areas):
            session = ScanSession(
                area_id=area.id,
                triggered_by='manual',
                status='completed',
                total_detections=detection_counts[i],
                total_violations=2 if i < 5 else 1,
                started_at=datetime.utcnow() - timedelta(days=i * 3, hours=1),
                completed_at=datetime.utcnow() - timedelta(days=i * 3),
                duration_seconds=12.5 + i * 2,
                image_source='demo',
                detection_id=det_records[i].id,
            )
            db.session.add(session)
        db.session.flush()

        # ─── VIOLATIONS (11) ────────────────────────────
        print("Creating violation records...")
        violations_data = [
            {'detection_idx': 0, 'violation_type': 'Boundary Violation', 'severity': 'HIGH', 'status': 'Pending', 'lat': 18.5025, 'lon': 73.9412, 'area_sqm': 520.5, 'confidence': 0.954, 'zone_name': 'Hadapsar Residential A', 'permit_status': 'Restricted'},
            {'detection_idx': 0, 'violation_type': 'Unauthorized Building', 'severity': 'HIGH', 'status': 'Verified', 'lat': 18.5098, 'lon': 73.9567, 'area_sqm': 780.3, 'confidence': 0.998, 'zone_name': 'Hadapsar Commercial Hub', 'permit_status': 'No Record'},
            {'detection_idx': 1, 'violation_type': 'Unauthorized Extension', 'severity': 'MEDIUM', 'status': 'Pending', 'lat': 18.5634, 'lon': 73.7845, 'area_sqm': 345.8, 'confidence': 0.877, 'zone_name': 'Baner Hill Green Zone', 'permit_status': 'Not Permitted'},
            {'detection_idx': 1, 'violation_type': 'Height Violation', 'severity': 'HIGH', 'status': 'Pending', 'lat': 18.5712, 'lon': 73.7923, 'area_sqm': 620.1, 'confidence': 0.923, 'zone_name': 'Baner IT Park Zone', 'permit_status': 'Exceeds Limit'},
            {'detection_idx': 2, 'violation_type': 'No Cadastral Match', 'severity': 'MEDIUM', 'status': 'False Positive', 'lat': 18.5045, 'lon': 73.8234, 'area_sqm': 450.2, 'confidence': 0.845, 'zone_name': 'Unknown', 'permit_status': 'No Record'},
            {'detection_idx': 2, 'violation_type': 'Illegal Floor Addition', 'severity': 'HIGH', 'status': 'Verified', 'lat': 18.5123, 'lon': 73.8345, 'area_sqm': 380.6, 'confidence': 0.967, 'zone_name': 'Kothrud Educational Zone', 'permit_status': 'Violation'},
            {'detection_idx': 3, 'violation_type': 'Boundary Violation', 'severity': 'MEDIUM', 'status': 'Pending', 'lat': 18.5923, 'lon': 73.7567, 'area_sqm': 850.0, 'confidence': 0.812, 'zone_name': 'Wakad Defence Zone', 'permit_status': 'Restricted'},
            {'detection_idx': 3, 'violation_type': 'Unauthorized Extension', 'severity': 'LOW', 'status': 'Resolved', 'lat': 18.6012, 'lon': 73.7678, 'area_sqm': 320.4, 'confidence': 0.734, 'zone_name': 'Wakad Residential Expansion', 'permit_status': 'Pending Review'},
            {'detection_idx': 4, 'violation_type': 'Unauthorized Building', 'severity': 'HIGH', 'status': 'Pending', 'lat': 18.6234, 'lon': 73.8067, 'area_sqm': 690.7, 'confidence': 0.945, 'zone_name': 'Pimpri Industrial Area', 'permit_status': 'No Record'},
            {'detection_idx': 5, 'violation_type': 'Unauthorized Extension', 'severity': 'MEDIUM', 'status': 'Pending', 'lat': 18.5385, 'lon': 73.8968, 'area_sqm': 410.3, 'confidence': 0.889, 'zone_name': 'Koregaon Park', 'permit_status': 'Not Permitted'},
            {'detection_idx': 6, 'violation_type': 'Boundary Violation', 'severity': 'HIGH', 'status': 'Pending', 'lat': 18.5312, 'lon': 73.8530, 'area_sqm': 560.9, 'confidence': 0.912, 'zone_name': 'Shivajinagar', 'permit_status': 'Restricted'},
        ]

        violations = []
        for vd in violations_data:
            v = Violation(
                detection_id=det_records[vd['detection_idx']].id,
                violation_type=vd['violation_type'], severity=vd['severity'],
                status=vd['status'],
                latitude=vd['lat'], longitude=vd['lon'],
                area_sqm=vd['area_sqm'], confidence_score=vd['confidence'],
                zone_name=vd['zone_name'], permit_status=vd['permit_status'],
                detected_at=datetime.utcnow() - timedelta(hours=len(violations_data) - len(violations)),
                updated_at=datetime.utcnow(),
            )
            db.session.add(v)
            violations.append(v)
        db.session.flush()

        # ─── ALERTS (11) ────────────────────────────────
        print("Creating alert records...")
        for v in violations:
            message = (
                f"Illegal Construction Alert\n"
                f"Type: {v.violation_type}\n"
                f"Severity: {v.severity}\n"
                f"Location: {v.latitude:.6f}, {v.longitude:.6f}\n"
                f"Area: {v.area_sqm:.1f} sqm\n"
                f"Confidence: {v.confidence_score:.1%}\n"
                f"Detected: {v.detected_at.isoformat()}"
            )
            alert = Alert(
                violation_id=v.id, notification_type='dashboard',
                recipient='dashboard', message=message,
                sent_at=datetime.utcnow(), is_sent=True,
            )
            db.session.add(alert)

        db.session.commit()

        # ─── SUMMARY ────────────────────────────────────
        print("\n" + "=" * 55)
        print("  Database seeded successfully!")
        print("=" * 55)
        print(f"  Users:            {User.query.count()}")
        print(f"  Monitored Areas:  {MonitoredArea.query.count()} (5 bbox + 2 polygon)")
        print(f"  Zoning Records:   {ZoningRecord.query.count()}")
        print(f"  Satellite Images: {SatelliteImage.query.count()}")
        print(f"  Detections:       {Detection.query.count()}")
        print(f"  Scan Sessions:    {ScanSession.query.count()}")
        print(f"  Violations:       {Violation.query.count()}")
        print(f"  Alerts:           {Alert.query.count()}")
        print("=" * 55)
        print("  Admin login:   admin / Admin@123")
        print("  Officer login: officer / Officer@123")
        print("  Citizen login: citizen / Citizen@123")
        print("=" * 55)


if __name__ == '__main__':
    seed_database()
