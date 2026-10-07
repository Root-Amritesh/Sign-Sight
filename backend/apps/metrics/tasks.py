"""Celery tasks for periodic drift computation."""
import logging
from celery import shared_task
from django.db.models import Count
from apps.alerting.models import Alert
from .services import record_drift_snapshot

logger = logging.getLogger(__name__)


@shared_task
def compute_drift_task(model_version: str, training_dist: dict, threshold: float = 0.1):
    """Compute current prediction distribution and record a drift snapshot."""
    # Build current distribution from recent alerts
    recent = Alert.objects.filter(model_version=model_version).values(
        'predicted_label'
    ).annotate(count=Count('id'))

    total = sum(r['count'] for r in recent)
    if total == 0:
        logger.info("No predictions found for model %s, skipping drift", model_version)
        return

    current_dist = {r['predicted_label']: r['count'] / total for r in recent}
    snapshot = record_drift_snapshot(model_version, training_dist, current_dist, threshold)
    return {'drift_score': snapshot.drift_score, 'model_version': model_version}
