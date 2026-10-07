"""Alert severity engine — threshold logic, severity assignment.

This module implements the 3-way decision tree from the system overview:
  - known_attack: stage 2 fires above threshold → grade by probability tier
  - novel_suspicious: stage 1 outlier + stage 2 lukewarm → novel threat
  - uncertain_normal: low confidence normal → flag for review

The backend NEVER auto-blocks. It only alerts (``blocking: false``).
"""
from apps.alerting.models import AlertThresholdConfig

# Default thresholds — overridable via the admin config API
DEFAULT_THRESHOLDS = {
    'high_confidence_attack': 0.85,
    'medium_confidence_attack': 0.50,
    'novel_anomaly_score': -0.45,
    'severity_boost_types': ['u2r', 'r2l'],
}

# Valid alert status transitions
VALID_TRANSITIONS = {
    'new': ['viewed', 'escalated', 'resolved'],
    'viewed': ['escalated', 'resolved'],
    'escalated': ['resolved'],
    'resolved': [],
}


def get_thresholds() -> dict:
    """Load thresholds from DB, falling back to defaults."""
    config = AlertThresholdConfig.objects.order_by('-updated_at').first()
    if config:
        return config.config
    return DEFAULT_THRESHOLDS


def classify_alert(soc_alert: dict) -> dict:
    """Classify a raw SOC alert dict into alert_type, severity, and explanation.

    Consumes the ``signsight.soc-alert/v1`` format produced by the ML pipeline.
    """
    thresholds = get_thresholds()
    verdict = soc_alert.get('verdict', '')
    scores = soc_alert.get('scores', {})
    probability = scores.get('attack_probability', 0.0)
    anomaly = scores.get('stage1_anomaly_score', 0.0)
    family = soc_alert.get('triage', {}).get('predicted_family', 'Unknown')

    # Determine alert_type
    if verdict in ('ATTACK', 'ATTACK_NOVEL'):
        alert_type = 'known_attack'
    elif verdict == 'NOVEL_SUSPICIOUS':
        alert_type = 'novel_suspicious'
    else:
        alert_type = 'uncertain_normal'

    # Determine severity
    if probability >= thresholds.get('high_confidence_attack', 0.85):
        severity = 'critical'
    elif probability >= thresholds.get('medium_confidence_attack', 0.50):
        severity = 'high'
    else:
        severity = 'medium'

    # Boost severity for dangerous attack families
    if family.lower() in [t.lower() for t in thresholds.get('severity_boost_types', [])]:
        if severity == 'high':
            severity = 'critical'
        elif severity == 'medium':
            severity = 'high'

    return {
        'alert_type': alert_type,
        'severity': severity,
    }


def is_valid_transition(current: str, target: str) -> bool:
    """Check if an alert status transition is allowed."""
    return target in VALID_TRANSITIONS.get(current, [])
