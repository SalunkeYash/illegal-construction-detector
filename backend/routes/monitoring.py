from flask import Blueprint, request, jsonify
from utils.auth_utils import token_required, role_required
from services import scheduler_service, gee_service

monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/api/monitoring')


@monitoring_bp.route('/scheduler/status', methods=['GET'])
@token_required
def get_scheduler_status(current_user):
    """Get scheduler status and list of scheduled jobs."""
    try:
        return jsonify({
            'running': scheduler_service.is_running(),
            'jobs': scheduler_service.get_jobs(),
        }), 200
    except Exception as e:
        print(f"[Monitoring] Scheduler status error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@monitoring_bp.route('/scheduler/add', methods=['POST'])
@token_required
@role_required('admin')
def add_scan_job(current_user):
    """Add a recurring scan job for an area (admin only)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        area_id = data.get('area_id')
        interval = data.get('interval_minutes', 60)

        if not area_id:
            return jsonify({'error': 'area_id is required'}), 400

        job_id = scheduler_service.add_scan_job(int(area_id), int(interval))

        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': f'Scan job added: every {interval} minutes',
        }), 201
    except Exception as e:
        print(f"[Monitoring] Add job error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@monitoring_bp.route('/scheduler/remove', methods=['POST'])
@token_required
@role_required('admin')
def remove_scan_job(current_user):
    """Remove a recurring scan job (admin only)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        area_id = data.get('area_id')
        if not area_id:
            return jsonify({'error': 'area_id is required'}), 400

        removed = scheduler_service.remove_scan_job(int(area_id))

        return jsonify({
            'success': removed,
            'message': 'Job removed' if removed else 'Job not found',
        }), 200
    except Exception as e:
        print(f"[Monitoring] Remove job error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@monitoring_bp.route('/scheduler/pause', methods=['POST'])
@token_required
@role_required('admin')
def pause_scheduler(current_user):
    """Pause the scheduler (admin only)."""
    try:
        scheduler_service.pause_scheduler()
        return jsonify({'success': True, 'message': 'Scheduler paused'}), 200
    except Exception as e:
        print(f"[Monitoring] Pause error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@monitoring_bp.route('/scheduler/resume', methods=['POST'])
@token_required
@role_required('admin')
def resume_scheduler(current_user):
    """Resume the scheduler (admin only)."""
    try:
        scheduler_service.resume_scheduler()
        return jsonify({'success': True, 'message': 'Scheduler resumed'}), 200
    except Exception as e:
        print(f"[Monitoring] Resume error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@monitoring_bp.route('/gee/status', methods=['GET'])
@token_required
def get_gee_status(current_user):
    """Get Google Earth Engine status."""
    try:
        status = gee_service.get_status()
        return jsonify(status), 200
    except Exception as e:
        print(f"[Monitoring] GEE status error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@monitoring_bp.route('/gee/init', methods=['POST'])
@token_required
@role_required('admin')
def init_gee(current_user):
    """Initialize GEE with provided credentials (admin only)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        service_account = data.get('service_account', '')
        project = data.get('project', '')

        success = gee_service.init_gee(
            service_account=service_account,
            project=project,
        )

        return jsonify({
            'success': success,
            'message': 'GEE initialized' if success else 'GEE init failed — running in demo mode',
        }), 200
    except Exception as e:
        print(f"[Monitoring] GEE init error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@monitoring_bp.route('/sessions', methods=['GET'])
@token_required
def get_sessions(current_user):
    """Get all scan sessions with pagination."""
    try:
        from models.database import ScanSession
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        area_id = request.args.get('area_id', type=int)
        status = request.args.get('status')

        query = ScanSession.query
        if area_id:
            query = query.filter_by(area_id=area_id)
        if status:
            query = query.filter_by(status=status)

        query = query.order_by(ScanSession.started_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'sessions': [s.to_dict() for s in pagination.items],
            'total': pagination.total,
            'page': pagination.page,
            'total_pages': pagination.pages,
        }), 200
    except Exception as e:
        print(f"[Monitoring] Sessions error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
