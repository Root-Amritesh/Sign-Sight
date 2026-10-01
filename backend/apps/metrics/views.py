
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsAnalyst
from apps.inference.services import registry
from .models import DriftSnapshot

class MetricsViewSet(viewsets.ViewSet):
    permission_classes = [IsAnalyst]

    @action(detail=False, methods=['get'])
    def model(self, request):
        if not registry.is_loaded:
            return Response({"detail": "No active model"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            "model_version": registry.version,
            "metrics": registry.metadata
        })

    @action(detail=False, methods=['get'])
    def drift(self, request):
        latest_drift = DriftSnapshot.objects.order_by('-timestamp').first()
        if not latest_drift:
            return Response({"detail": "No drift data available"}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "timestamp": latest_drift.timestamp,
            "drift_score": latest_drift.drift_score,
            "training_distribution": latest_drift.training_distribution,
            "current_distribution": latest_drift.current_distribution,
            "threshold_used": latest_drift.threshold_used,
            "model_version": latest_drift.model_version
        })
