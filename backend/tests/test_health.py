"""Health check integration test."""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient


class HealthCheckTest(TestCase):
    def test_health_endpoint_returns_200(self):
        client = APIClient()
        response = client.get('/api/auth/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'healthy')
