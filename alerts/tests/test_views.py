import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from alerts.models import Alert, ModelMetadata
from django.utils import timezone

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def sample_alert(db):
    return Alert.objects.create(
        source_ip="192.168.1.1",
        dest_ip="10.0.0.1",
        source_port=1234,
        dest_port=80,
        protocol="TCP",
        attack_category="DOS",
        confidence=0.9,
        severity="CRITICAL",
        model_version="v1"
    )

@pytest.fixture
def sample_model_meta(db):
    return ModelMetadata.objects.create(
        version="v1.0",
        dataset="NSL-KDD",
        trained_at=timezone.now(),
        artifact_path="fake/path.pkl",
        is_active=True
    )

@pytest.mark.django_db
class TestAlertViews:
    def test_list_alerts(self, api_client, sample_alert):
        url = reverse('alerts:alert-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_filter_alerts_severity(self, api_client, sample_alert):
        url = reverse('alerts:alert-list')
        response = api_client.get(f"{url}?severity=CRITICAL")
        assert len(response.data['results']) == 1
        
        response = api_client.get(f"{url}?severity=LOW")
        assert len(response.data['results']) == 0

    def test_update_alert_verdict(self, api_client, sample_alert):
        url = reverse('alerts:alert-detail', args=[sample_alert.id])
        data = {'analyst_verdict': 'TRUE_POSITIVE', 'analyst_notes': 'Confirmed'}
        response = api_client.patch(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        sample_alert.refresh_from_db()
        assert sample_alert.analyst_verdict == 'TRUE_POSITIVE'
        assert sample_alert.analyst_notes == 'Confirmed'

@pytest.mark.django_db
class TestPredictView:
    def test_predict_endpoint(self, api_client, sample_model_meta):
        url = reverse('alerts:predict')
        payload = {
            "features": {
                "source_ip": "1.2.3.4",
                "dest_ip": "5.6.7.8",
                "source_port": 1234,
                "dest_port": 80,
                "protocol": "TCP"
            }
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'prediction' in response.data
        assert response.data['alert_created'] is True
        assert Alert.objects.count() == 1

@pytest.mark.django_db
class TestModelMetadataViews:
    def test_list_metadata(self, api_client, sample_model_meta):
        url = reverse('alerts:model-metadata-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
