"""Inference service layer — load, predict, hot-swap logic.

This module re-exports the singleton ``registry`` from the registry module
and provides higher-level service functions for the views layer.
"""
from .registry import registry  # noqa: F401 — re-export for backward compat
from .models import ModelVersion
from apps.audit.services import log_event


def deploy_model(version: str, user) -> ModelVersion:
    """Load a new model version and record it in the database."""
    registry.load(version)

    ModelVersion.objects.update(is_active=False)
    model_obj, _ = ModelVersion.objects.update_or_create(
        version=version,
        defaults={
            'model_type': 'HybridNIDSModel',
            'artifact_path': f"ml_artifacts/models/{version}",
            'is_active': True,
            'deployed_by': user,
            'metadata': registry.metadata or {},
        }
    )
    log_event(user, 'model.deployed', 'model', version, notes=f"Deployed {version}")
    return model_obj


def rollback_model(version: str, user) -> ModelVersion:
    """Roll back to a previously deployed model version."""
    registry.load(version)

    ModelVersion.objects.update(is_active=False)
    model_obj = ModelVersion.objects.get(version=version)
    model_obj.is_active = True
    model_obj.deployed_by = user
    model_obj.save(update_fields=['is_active', 'deployed_by'])

    log_event(user, 'model.rollback', 'model', version, notes=f"Rolled back to {version}")
    return model_obj
