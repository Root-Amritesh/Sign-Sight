"""Notification dispatcher — Teams, Slack, email webhooks.

All dispatches are fire-and-forget from the caller's perspective;
the Celery task layer handles retries.
"""
import logging
import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


def send_teams_notification(alert) -> bool:
    """Post an alert card to Microsoft Teams via incoming webhook."""
    url = getattr(settings, 'TEAMS_WEBHOOK_URL', None)
    if not url:
        logger.debug("TEAMS_WEBHOOK_URL not configured, skipping")
        return False

    payload = {
        "@type": "MessageCard",
        "summary": f"SignSight Alert: {alert.predicted_label}",
        "themeColor": _severity_colour(alert.severity),
        "sections": [{
            "activityTitle": f"[{alert.severity.upper()}] {alert.predicted_label}",
            "facts": [
                {"name": "Alert ID", "value": str(alert.id)},
                {"name": "Type", "value": alert.alert_type},
                {"name": "Confidence", "value": f"{alert.confidence:.2%}"},
                {"name": "Source IP", "value": alert.source_ip or "N/A"},
                {"name": "Dest IP", "value": alert.dest_ip or "N/A"},
            ],
        }],
    }

    try:
        resp = httpx.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        logger.error("Teams notification failed: %s", exc)
        return False


def send_slack_notification(alert) -> bool:
    """Post an alert message to Slack via incoming webhook."""
    url = getattr(settings, 'SLACK_WEBHOOK_URL', None)
    if not url:
        logger.debug("SLACK_WEBHOOK_URL not configured, skipping")
        return False

    payload = {
        "text": (
            f":rotating_light: *SignSight Alert* [{alert.severity.upper()}]\n"
            f"*{alert.predicted_label}* — confidence {alert.confidence:.2%}\n"
            f"Source: {alert.source_ip or 'N/A'} → Dest: {alert.dest_ip or 'N/A'}\n"
            f"Alert ID: `{alert.id}`"
        ),
    }

    try:
        resp = httpx.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        logger.error("Slack notification failed: %s", exc)
        return False


def notify(alert) -> None:
    """Dispatch notifications to all configured channels."""
    send_teams_notification(alert)
    send_slack_notification(alert)


def _severity_colour(severity: str) -> str:
    return {
        'critical': 'FF0000',
        'high': 'FF8C00',
        'medium': 'FFD700',
        'low': '1E90FF',
        'info': '808080',
    }.get(severity, '808080')
