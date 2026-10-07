"""Celery tasks for async ingestion processing."""
import logging
import pandas as pd
from celery import shared_task
from apps.inference.services import registry

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_batch_records_task(self, record_ids):
    """Process a batch of TrafficRecord IDs through the inference pipeline."""
    from .models import TrafficRecord
    from apps.alerting.models import Alert

    records = TrafficRecord.objects.filter(id__in=record_ids)
    if not records.exists():
        return {'processed': 0, 'errors': 0}

    features_list = [r.raw_features for r in records]
    df = pd.DataFrame(features_list)

    processed, errors = 0, 0
    try:
        alerts = registry.triage(df)
        for record, alert_data in zip(records, alerts):
            try:
                Alert.objects.create(
                    traffic_record=record,
                    predicted_label=alert_data['triage'].get('predicted_family', 'Unknown'),
                    confidence=alert_data['scores'].get('attack_probability', 0.0),
                    probabilities=alert_data['scores'],
                    anomaly_score=alert_data['scores'].get('stage1_anomaly_score', 0.0),
                    alert_type=alert_data['verdict'].lower(),
                    severity=alert_data['severity'].lower(),
                    model_version=alert_data['model']['version'],
                )
                record.status = 'processed'
                record.save(update_fields=['status'])
                processed += 1
            except Exception as e:
                logger.error("Failed to process record %s: %s", record.id, e)
                record.status = 'error'
                record.save(update_fields=['status'])
                errors += 1
    except Exception as e:
        logger.error("Batch inference failed: %s", e)
        records.update(status='error')
        errors = len(record_ids)

    return {'processed': processed, 'errors': errors}


@shared_task(bind=True)
def replay_traffic_task(self, dataset_path, limit=None, delay_ms=0):
    """Replay traffic from a CSV file through the ingestion pipeline."""
    from .services import ingest_single
    import time

    chunk_size = 500
    total = 0
    for chunk in pd.read_csv(dataset_path, chunksize=chunk_size):
        for _, row in chunk.iterrows():
            if limit and total >= limit:
                return {'total_replayed': total}
            try:
                ingest_single(row.to_dict())
                total += 1
                if delay_ms:
                    time.sleep(delay_ms / 1000.0)
            except Exception as e:
                logger.warning("Replay failed for row: %s", e)
    return {'total_replayed': total}
