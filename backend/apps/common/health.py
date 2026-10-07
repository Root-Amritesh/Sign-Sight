"""Health check utilities."""
from django.db import connection


def check_database():
    """Return database connectivity status."""
    try:
        connection.ensure_connection()
        return {'status': 'up'}
    except Exception as e:
        return {'status': 'down', 'error': str(e)}


def get_health_status():
    """Aggregate all system health checks."""
    db = check_database()
    overall = 'healthy' if db['status'] == 'up' else 'degraded'
    return {
        'status': overall,
        'checks': {
            'database': db,
        }
    }
