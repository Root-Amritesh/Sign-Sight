from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True

# Disable password validators for local dev
AUTH_PASSWORD_VALIDATORS = []

# Email backend for dev
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
