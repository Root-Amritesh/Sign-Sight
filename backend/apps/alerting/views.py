
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
import django_filters.rest_framework

from apps.common.permissions import IsAnalyst, IsAdmin
from apps.common.pagination import StandardPagination
from apps.audit.services import log_event
from .models import Alert, AlertThresholdConfig
from .serializers import AlertSerializer, AlertUpdateSerializer, AlertThresholdConfigSerializer
from .filters import AlertFilter

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all().select_related('traffic_record', 'resolved_by').order_by('-created_at')
    permission_classes = [IsAnalyst]
    pagination_class = StandardPagination
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_class = AlertFilter

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return AlertUpdateSerializer
        return AlertSerializer

    def perform_update(self, serializer):
        alert = self.get_object()
        old_status = alert.status
        instance = serializer.save()
        if old_status != instance.status:
            log_event(self.request.user, 'alert.status_updated', 'alert', instance.id, 
                      changes={'status': {'old': old_status, 'new': instance.status}}, notes=instance.notes)
            if instance.status == 'resolved':
                instance.resolved_by = self.request.user
                instance.save(update_fields=['resolved_by'])

    @action(detail=False, methods=['get'])
    def stats(self, request):
        hours = int(request.query_params.get('hours', 24))
        since = timezone.now() - timedelta(hours=hours)
        qs = Alert.objects.filter(created_at__gte=since)
        
        return Response({
            "period_hours": hours,
            "total_alerts": qs.count(),
            "by_severity": list(qs.values('severity').annotate(count=Count('id'))),
            "by_status": list(qs.values('status').annotate(count=Count('id'))),
            "by_type": list(qs.values('alert_type').annotate(count=Count('id')))
        })

class ConfigViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    @action(detail=False, methods=['get', 'put'])
    def alert_thresholds(self, request):
        if request.method == 'GET':
            config = AlertThresholdConfig.objects.order_by('-updated_at').first()
            if not config:
                return Response({"config": {}})
            return Response(AlertThresholdConfigSerializer(config).data)
        elif request.method == 'PUT':
            config_data = request.data.get('config')
            if not config_data:
                return Response({"detail": "config field required"}, status=status.HTTP_400_BAD_REQUEST)
            config = AlertThresholdConfig.objects.create(config=config_data, updated_by=request.user)
            log_event(request.user, 'config.thresholds_updated', 'config', config.id)
            return Response(AlertThresholdConfigSerializer(config).data)
