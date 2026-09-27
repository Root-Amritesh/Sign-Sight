import pytest
from alerts.serializers import AlertSerializer, AlertCreateSerializer, AlertVerdictSerializer
from alerts.models import Alert

@pytest.mark.django_db
class TestSerializers:
    def test_alert_create_serializer(self):
        data = {
            'source_ip': '1.1.1.1',
            'dest_ip': '2.2.2.2',
            'source_port': 1234,
            'dest_port': 80,
            'protocol': 'TCP',
            'attack_category': 'DOS',
            'confidence': 0.95,
            'raw_features': {},
            'model_version': 'v1'
        }
        serializer = AlertCreateSerializer(data=data)
        assert serializer.is_valid()
        
    def test_alert_verdict_serializer(self):
        data = {
            'analyst_verdict': 'TRUE_POSITIVE',
            'analyst_notes': 'Checked logs'
        }
        serializer = AlertVerdictSerializer(data=data)
        assert serializer.is_valid()
        
        # Ensure it doesn't accept other fields
        data_invalid = {
            'analyst_verdict': 'TRUE_POSITIVE',
            'severity': 'LOW' # Should be ignored/read-only
        }
        serializer_invalid = AlertVerdictSerializer(data=data_invalid)
        assert serializer_invalid.is_valid()
        assert 'severity' not in serializer_invalid.validated_data
