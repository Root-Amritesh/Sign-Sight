from typing import Any
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.db.models import Count

from .models import Alert, ModelMetadata
from .serializers import (
    AlertSerializer, AlertCreateSerializer, AlertVerdictSerializer, ModelMetadataSerializer
)
from .inference import compute_severity, predict, load_model
from django.conf import settings

class AlertViewSet(mixins.CreateModelMixin,
                   mixins.RetrieveModelMixin,
                   mixins.UpdateModelMixin,
                   mixins.ListModelMixin,
                   viewsets.GenericViewSet):
    queryset = Alert.objects.all()
    filterset_fields = ['severity', 'attack_category', 'analyst_verdict']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AlertCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AlertVerdictSerializer
        return AlertSerializer

    @action(detail=False, methods=['get'])
    def stats(self, request):
        category_counts = Alert.objects.values('attack_category').annotate(count=Count('id'))
        severity_counts = Alert.objects.values('severity').annotate(count=Count('id'))
        return Response({
            'by_category': category_counts,
            'by_severity': severity_counts,
        })

class ModelMetadataViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModelMetadata.objects.all()
    serializer_class = ModelMetadataSerializer


@api_view(["POST"])
def predict_view(request: Any) -> Response:
    """Accept a feature vector, run inference, create an Alert if attack detected.

    Request body:
        features: dict — NSL-KDD feature names to values
        source_ip: str — source IP address
        dest_ip: str — destination IP address
        source_port: int — source port
        dest_port: int — destination port

    Returns 503 if no active model is registered.
    Does NOT block or take any enforcement action.
    """
    features = request.data.get("features", {})
    source_ip = request.data.get("source_ip", "0.0.0.0")
    dest_ip = request.data.get("dest_ip", "0.0.0.0")
    source_port = request.data.get("source_port", 0)
    dest_port = request.data.get("dest_port", 80)

    # 1. Load active model
    active_model_meta = ModelMetadata.objects.filter(is_active=True).first()
    if not active_model_meta:
        return Response(
            {"error": "No active model. Train and register a model first."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    model = load_model(active_model_meta.artifact_path)
    model_version = active_model_meta.version

    # 2. Predict
    prediction_result = predict(features, model)
    category = prediction_result["category"]
    confidence = prediction_result["confidence"]
    severity = compute_severity(category, confidence)

    prediction_result["severity"] = severity

    # 3. Create Alert if attack (NO enforcement — alert only)
    alert = None
    if prediction_result["is_attack"]:
        alert = Alert.from_prediction({
            "source_ip": source_ip,
            "dest_ip": dest_ip,
            "source_port": source_port,
            "dest_port": dest_port,
            "protocol": features.get("protocol_type", "tcp").upper(),
            "attack_category": category,
            "confidence": confidence,
            "severity": severity,
            "raw_features": features,
            "model_version": model_version,
        })
        alert.save()

    return Response(
        {
            "prediction": prediction_result,
            "alert_id": alert.id if alert else None,
            "alert_url": f"/api/v1/alerts/{alert.id}/" if alert else None,
        },
        status=status.HTTP_200_OK,
    )
