"""Ingestion business logic — validation, queueing for inference."""
import logging
import pandas as pd
from apps.inference.services import registry
from apps.alerting.models import Alert
from .models import TrafficRecord

logger = logging.getLogger(__name__)


def ingest_single(features: dict) -> dict:
    """Validate and process a single traffic record through the inference pipeline.

    Returns a result dict with keys: id, status, and optionally alert_id.
    """
    record = TrafficRecord.objects.create(
        raw_features=features,
        protocol_type=features.get('protocol_type'),
        service=features.get('service'),
        flag=features.get('flag'),
        src_bytes=features.get('src_bytes'),
        dst_bytes=features.get('dst_bytes'),
        source_ip=features.get('src_ip'),
        dest_ip=features.get('dst_ip'),
    )

    if not registry.is_loaded:
        return {'id': str(record.id), 'status': 'new', 'detail': 'Model not loaded'}

    try:
        df = pd.DataFrame([features])
        alerts = registry.triage(df)
        result = {'id': str(record.id), 'status': 'processed'}

        if alerts:
            pred = alerts[0]
            alert = Alert.objects.create(
                traffic_record=record,
                predicted_label=pred['triage'].get('predicted_family', 'Unknown'),
                confidence=pred['scores'].get('attack_probability', 0.0),
                probabilities=pred['scores'],
                anomaly_score=pred['scores'].get('stage1_anomaly_score', 0.0),
                alert_type=pred['verdict'].lower(),
                severity=pred['severity'].lower(),
                model_version=pred['model']['version'],
                source_ip=features.get('src_ip'),
                dest_ip=features.get('dst_ip'),
            )
            result['alert_id'] = str(alert.id)

        record.status = 'processed'
        record.save(update_fields=['status'])
        return result
    except Exception as exc:
        logger.error("Inference failed for record %s: %s", record.id, exc)
        record.status = 'error'
        record.save(update_fields=['status'])
        raise
