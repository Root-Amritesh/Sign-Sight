import pytest
from django.utils import timezone
from alerts.models import Alert, ModelMetadata
from alerts.inference import compute_severity

@pytest.mark.django_db
class TestAlertModel:
    def test_create_alert(self):
        alert = Alert.objects.create(
            source_ip="192.168.1.100",
            dest_ip="10.0.0.5",
            source_port=12345,
            dest_port=80,
            protocol="TCP",
            attack_category="DOS",
            confidence=0.95,
            severity="CRITICAL",
            model_version="v1.0"
        )
        assert alert.id is not None
        assert alert.analyst_verdict == "PENDING"
        assert alert.severity == "CRITICAL"
        assert str(alert) == f"Alert {alert.id}: DOS from 192.168.1.100 to 10.0.0.5 (CRITICAL)"

    def test_alert_from_prediction(self):
        pred_data = {
            'source_ip': '1.1.1.1',
            'dest_ip': '2.2.2.2',
            'source_port': 4444,
            'dest_port': 22,
            'protocol': 'TCP',
            'attack_category': 'PROBE',
            'confidence': 0.8,
            'severity': 'MEDIUM',
            'raw_features': {'feature1': 1.0},
            'model_version': 'v1.1'
        }
        alert = Alert.from_prediction(pred_data)
        assert alert.source_ip == '1.1.1.1'
        assert alert.severity == 'MEDIUM'
        alert.save()
        assert alert.id is not None

@pytest.mark.django_db
class TestModelMetadataModel:
    def test_create_metadata(self):
        meta = ModelMetadata.objects.create(
            version="v1.0",
            dataset="NSL-KDD",
            trained_at=timezone.now(),
            artifact_path="artifacts/model_v1.pkl",
            is_active=True
        )
        assert meta.id is not None
        assert "v1.0" in str(meta)

def test_compute_severity():
    assert compute_severity("NORMAL", 0.99) == "LOW"
    assert compute_severity("DOS", 0.95) == "CRITICAL"
    assert compute_severity("PROBE", 0.95) == "HIGH"
    assert compute_severity("DOS", 0.8) == "HIGH"
    assert compute_severity("PROBE", 0.8) == "MEDIUM"
    assert compute_severity("DOS", 0.5) == "LOW"
