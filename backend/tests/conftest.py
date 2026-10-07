"""Shared pytest fixtures."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username='test_admin', email='admin@test.com', password='testpass', role='admin'
    )


@pytest.fixture
def analyst_user(db):
    return User.objects.create_user(
        username='test_analyst', email='analyst@test.com', password='testpass', role='analyst'
    )


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def analyst_client(api_client, analyst_user):
    api_client.force_authenticate(user=analyst_user)
    return api_client
