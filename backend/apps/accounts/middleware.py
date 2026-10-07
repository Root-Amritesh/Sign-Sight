"""Audit logging middleware for auth events."""
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class AuthAuditMiddleware(MiddlewareMixin):
    """Log authentication-related events (login success/failure)."""

    AUTH_PATHS = ['/api/auth/login/', '/api/auth/google/']

    def process_response(self, request, response):
        if request.path in self.AUTH_PATHS:
            status = 'success' if response.status_code < 400 else 'failure'
            logger.info(
                "Auth event",
                extra={
                    'path': request.path,
                    'method': request.method,
                    'status_code': response.status_code,
                    'auth_result': status,
                    'ip': request.META.get('REMOTE_ADDR'),
                }
            )
        return response
