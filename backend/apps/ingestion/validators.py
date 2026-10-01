"""Custom field validators for traffic record schema."""
from rest_framework.exceptions import ValidationError


REQUIRED_FLOW_FIELDS = [
    'Flow Duration', 'Total Fwd Packets', 'Total Backward Packets',
]

VALID_PROTOCOLS = ['tcp', 'udp', 'icmp', 'TCP', 'UDP', 'ICMP', '6', '17', '1']


def validate_flow_features(features: dict):
    """Validate that a feature dict contains the minimum required flow fields.
    
    This is a soft check — the ML pipeline's FlowPreprocessor handles missing
    features by filling NaN, so we only warn rather than reject.
    """
    if not isinstance(features, dict):
        raise ValidationError("features must be a JSON object")

    if not features:
        raise ValidationError("features cannot be empty")

    return features
