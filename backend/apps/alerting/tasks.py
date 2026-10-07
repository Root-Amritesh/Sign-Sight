"""Celery tasks for async alert notification dispatch."""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_task(self, alert_id):
    """Send webhook notifications for a given alert."""
    from .models import Alert
    from .notifications import notify

    try:
        alert = Alert.objects.get(id=alert_id)
        notify(alert)
    except Alert.DoesNotExist:
        logger.error("Alert %s not found for notification", alert_id)
    except Exception as exc:
        logger.error("Notification dispatch failed: %s", exc)
        raise self.retry(exc=exc)
