"""Inference views — model management API (deploy, rollback, status).

Views are kept thin; business logic lives in services.py.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsAdmin
from apps.common.pagination import StandardPagination
from .models import ModelVersion
from .serializers import ModelVersionSerializer, ModelDeploySerializer
from .services import deploy_model, rollback_model, registry


class ModelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModelVersion.objects.all().order_by('-deployed_at')
    serializer_class = ModelVersionSerializer
    permission_classes = [IsAdmin]
    pagination_class = StandardPagination

    @action(detail=False, methods=['post'])
    def deploy(self, request):
        serializer = ModelDeploySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version = serializer.validated_data['version']
        try:
            model_obj = deploy_model(version, request.user)
            return Response(ModelVersionSerializer(model_obj).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def rollback(self, request):
        serializer = ModelDeploySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version = serializer.validated_data['version']
        try:
            model_obj = rollback_model(version, request.user)
            return Response(ModelVersionSerializer(model_obj).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Return the currently active model info."""
        if not registry.is_loaded:
            return Response({"detail": "No active model"}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "version": registry.version,
            "metadata": registry.metadata,
        })
