"""
APScheduler service for automated periodic scanning of monitored areas.
"""
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

_scheduler = None
_app = None


def init_scheduler(app):
    """Initialize the background scheduler."""
    global _scheduler, _app
    _app = app

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.start()
    print("[Scheduler] Background scheduler started")
    return _scheduler


def get_scheduler():
    """Get the scheduler instance."""
    return _scheduler


def add_scan_job(area_id, interval_minutes=60):
    """Add a recurring scan job for an area."""
    if _scheduler is None:
        return None

    job_id = f'scan_area_{area_id}'

    # Remove existing job if any
    try:
        _scheduler.remove_job(job_id)
    except Exception:
        pass

    job = _scheduler.add_job(
        func=_run_area_scan,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id=job_id,
        name=f'Auto-scan area {area_id}',
        args=[area_id],
        replace_existing=True,
        max_instances=1,
    )
    print(f"[Scheduler] Added scan job for area {area_id} every {interval_minutes} min")
    return job_id


def remove_scan_job(area_id):
    """Remove a recurring scan job for an area."""
    if _scheduler is None:
        return False
    try:
        _scheduler.remove_job(f'scan_area_{area_id}')
        print(f"[Scheduler] Removed scan job for area {area_id}")
        return True
    except Exception:
        return False


def get_jobs():
    """Get all scheduled jobs."""
    if _scheduler is None:
        return []
    jobs = _scheduler.get_jobs()
    return [{
        'id': job.id,
        'name': job.name,
        'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None,
        'trigger': str(job.trigger),
    } for job in jobs]


def pause_scheduler():
    """Pause the scheduler."""
    if _scheduler:
        _scheduler.pause()
        print("[Scheduler] Paused")


def resume_scheduler():
    """Resume the scheduler."""
    if _scheduler:
        _scheduler.resume()
        print("[Scheduler] Resumed")


def is_running():
    """Check if scheduler is running."""
    return _scheduler is not None and _scheduler.running


def _run_area_scan(area_id):
    """
    Execute an automated scan for an area.
    Runs inside app context since it's called by the scheduler.
    """
    if _app is None:
        return

    with _app.app_context():
        try:
            from models.database import db, MonitoredArea, ScanSession
            from services import socketio_service

            area = MonitoredArea.query.get(area_id)
            if not area:
                print(f"[Scheduler] Area {area_id} not found, skipping scan")
                return

            if area.status != 'active':
                print(f"[Scheduler] Area {area_id} is inactive, skipping scan")
                return

            # Create scan session
            session = ScanSession(
                area_id=area_id,
                triggered_by='scheduler',
                status='running',
                started_at=datetime.utcnow(),
                image_source='demo',
            )
            db.session.add(session)
            db.session.commit()

            socketio_service.emit_scan_status(area_id, 'running', f'Auto-scan started for {area.name}')
            socketio_service.emit_scheduler_event('scan_started', {
                'area_id': area_id,
                'area_name': area.name,
                'session_id': session.id,
            })

            print(f"[Scheduler] Auto-scan started for area: {area.name}")

            # The actual detection pipeline would be triggered here.
            # For now, mark as completed — in production this would call the detection pipeline.
            session.status = 'completed'
            session.completed_at = datetime.utcnow()
            session.duration_seconds = (session.completed_at - session.started_at).total_seconds()
            db.session.commit()

            socketio_service.emit_scan_status(area_id, 'completed', f'Auto-scan completed for {area.name}')
            socketio_service.emit_scheduler_event('scan_completed', {
                'area_id': area_id,
                'area_name': area.name,
                'session_id': session.id,
            })

        except Exception as e:
            print(f"[Scheduler] Scan error for area {area_id}: {e}")
            socketio_service.emit_scan_status(area_id, 'failed', str(e))
