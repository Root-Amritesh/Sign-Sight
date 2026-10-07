
from rest_framework import viewsets
from apps.common.permissions import IsAdmin
from apps.common.pagination import StandardPagination
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    pagination_class = StandardPagination
