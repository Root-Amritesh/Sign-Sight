
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "detail": response.data.get("detail", str(exc)),
            "code": getattr(exc, "default_code", "error"),
            "errors": response.data
        }
    else:
        logger.error(f"Unhandled Exception: {exc}", exc_info=True)
        return Response({
            "detail": "Internal server error",
            "code": "internal_error",
            "errors": {}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return response
