"""Development settings for Sign-Sight.

Extends base.py with development-friendly defaults:
  - DEBUG=True
  - SQLite database (no PostgreSQL required for local dev)
  - Static files served by Django
"""
from .base import *  # noqa: F401, F403

DEBUG = True

# Use SQLite for local development (no Docker/PostgreSQL required)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

if "django.contrib.staticfiles" not in INSTALLED_APPS:
    INSTALLED_APPS.append("django.contrib.staticfiles")

STATIC_URL = "static/"
