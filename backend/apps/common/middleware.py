
import uuid
import time
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('apps')

class RequestIDMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
    def process_response(self, request, response):
        if hasattr(request, 'id'):
            response['X-Request-ID'] = request.id
        return response

class StructuredLoggingMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.start_time = time.time()
        
    def process_response(self, request, response):
        if request.path == '/api/health/':
            return response
            
        duration = time.time() - getattr(request, 'start_time', time.time())
        logger.info(
            "API Request",
            extra={
                'method': request.method,
                'path': request.path,
                'status': response.status_code,
                'duration': round(duration * 1000, 2),
                'request_id': getattr(request, 'id', None),
                'user': request.user.username if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
            }
        )
        return response
