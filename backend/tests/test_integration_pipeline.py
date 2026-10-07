"""End-to-end integration: ingest -> predict -> alert -> API response."""
import pytest
from django.urls import reverse
from rest_framework import status
from apps.ingestion.models import TrafficRecord
from apps.alerting.models import Alert
from apps.inference.services import registry


@pytest.mark.django_db
def test_ingestion_without_model(analyst_client):
    """Test that ingestion gracefully accepts records even if no model is loaded."""
    url = reverse('ingest-list')
    payload = {
        "features": {
            "protocol_type": "tcp",
            "service": "http",
            "flag": "SF",
            "src_bytes": 215,
            "dst_bytes": 456,
            "Flow Duration": 1000,
            "Total Fwd Packets": 2,
            "Total Backward Packets": 2
        }
    }
    
    response = analyst_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.data['status'] == 'new'
    assert response.data['detail'] == 'Model not loaded'
    
    assert TrafficRecord.objects.count() == 1


@pytest.mark.django_db
def test_full_pipeline_with_mock_triage(analyst_client, monkeypatch):
    """Test ingest -> mock predict -> alert creation."""
    # Mock the registry to pretend it's loaded and return a mock alert
    monkeypatch.setattr(registry, '_model', True)
    
    def mock_triage(df):
        return [{
            'verdict': 'ATTACK',
            'severity': 'high',
            'scores': {'attack_probability': 0.88, 'stage1_anomaly_score': -0.6},
            'triage': {'predicted_family': 'Dos'},
            'model': {'version': 'v1-mock'}
        }]
    
    monkeypatch.setattr(registry, 'triage', mock_triage)

    url = reverse('ingest-list')
    payload = {
        "features": {
            "protocol_type": "tcp",
            "src_ip": "10.0.0.5",
            "dst_ip": "192.168.1.100"
        }
    }
    
    response = analyst_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['status'] == 'processed'
    assert 'alert_id' in response.data
    
    assert TrafficRecord.objects.count() == 1
    assert Alert.objects.count() == 1
    
    alert = Alert.objects.first()
    assert alert.alert_type == 'attack'
    assert alert.severity == 'high'
    assert alert.source_ip == '10.0.0.5'
