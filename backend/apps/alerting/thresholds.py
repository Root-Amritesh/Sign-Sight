"""Configurable threshold definitions for alert severity.

Thresholds can be loaded from the database (AlertThresholdConfig) or
fall back to the defaults defined in services.py.
"""
from .services import DEFAULT_THRESHOLDS, get_thresholds  # noqa: F401
