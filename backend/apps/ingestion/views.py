"""Ingestion API views — batch upload, single record.

Views are kept thin; business logic lives in services.py.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.permissions import IsAnalyst, IsAdmin
from .serializers import IngestRecordSerializer, BatchIngestSerializer
from .services import ingest_single
from .tasks import process_batch_records_task, replay_traffic_task
from .models import TrafficRecord


class IngestionViewSet(viewsets.ViewSet):
    permission_classes = [IsAnalyst]

    def create(self, request):
        """Single record ingest."""
        serializer = IngestRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        features = serializer.validated_data['features']

        try:
            result = ingest_single(features)
            http_status = (
                status.HTTP_201_CREATED if result['status'] == 'processed'
                else status.HTTP_202_ACCEPTED
            )
            return Response(result, status=http_status)
        except Exception:
            return Response(
                {"detail": "Inference failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def batch(self, request):
        """Batch ingest — creates records and queues async processing."""
        serializer = BatchIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        records_data = serializer.validated_data['records']

        to_create = [
            TrafficRecord(
                raw_features=f,
                protocol_type=f.get('protocol_type'),
                service=f.get('service'),
                flag=f.get('flag'),
                src_bytes=f.get('src_bytes'),
                dst_bytes=f.get('dst_bytes'),
            )
            for f in records_data
        ]
        created = TrafficRecord.objects.bulk_create(to_create)
        record_ids = [str(r.id) for r in created]

        task = process_batch_records_task.delay(record_ids)
        return Response(
            {"task_id": task.id, "records_received": len(record_ids), "status": "queued"},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def replay(self, request):
        """Replay traffic from a CSV dataset."""
        dataset = request.data.get('dataset_path')
        limit = request.data.get('limit')
        delay = request.data.get('delay_ms', 0)

        task = replay_traffic_task.delay(dataset_path=dataset, limit=limit, delay_ms=delay)
        return Response(
            {"task_id": task.id, "status": "replay_started"},
            status=status.HTTP_202_ACCEPTED,
        )
