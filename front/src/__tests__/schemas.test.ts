import { describe, it, expect } from 'vitest';
import {
  HealthCheckResponseSchema,
  AlertListItemSchema,
  AlertDetailSchema,
  ModelMetricsResponseSchema,
  DriftMetricsResponseSchema,
  AlertThresholdsConfigSchema,
  AuditRecordSchema,
  IngestSingleResponseSchema,
  IngestTaskStatusResponseSchema,
} from '../api/schemas';

describe('SignSight Zod Schema Contract Validations', () => {
  it('validates HealthCheckResponse 200 and 503 degraded payloads', () => {
    const healthyPayload = {
      status: 'healthy',
      checks: {
        database: { status: 'ok', latency_ms: 2 },
        redis: { status: 'ok', latency_ms: 1 },
        celery: { status: 'ok', active_workers: 4 },
        model: { status: 'ok', version: 'v2' },
      },
      timestamp: '2026-10-03T12:00:00Z',
    };
    expect(HealthCheckResponseSchema.safeParse(healthyPayload).success).toBe(true);

    const degradedPayload = {
      status: 'degraded',
      checks: {
        database: { status: 'ok' },
        redis: { status: 'error', error: 'Connection refused' },
        celery: { status: 'ok' },
        model: { status: 'ok' },
      },
      timestamp: '2026-10-03T12:00:00Z',
    };
    expect(HealthCheckResponseSchema.safeParse(degradedPayload).success).toBe(true);
  });

  it('validates AlertListItemSchema against real NSL-KDD payload', () => {
    const payload = {
      id: 'alt-849204',
      created_at: '2026-10-03T12:30:00Z',
      severity: 'critical',
      status: 'new',
      predicted_label: 'dos',
      confidence: 0.984,
      model_version: 'v2',
      anomaly_score: 0.892,
      alert_type: 'known_attack',
    };
    const parsed = AlertListItemSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates AlertDetailSchema with pred_contrib explanation and traffic_record', () => {
    const payload = {
      id: 'alt-849204',
      created_at: '2026-10-03T12:30:00Z',
      severity: 'critical',
      status: 'new',
      predicted_label: 'dos',
      confidence: 0.984,
      model_version: 'v2',
      anomaly_score: 0.892,
      probabilities: { normal: 0.01, dos: 0.98, probe: 0.01 },
      explanation: {
        method: 'pred_contrib',
        predicted_class: 'dos',
        top_features: [
          { feature: 'count', contribution: 0.45 },
          { feature: 'serror_rate', contribution: 0.32 },
        ],
      },
      traffic_record: {
        duration: 0,
        protocol_type: 'tcp',
        service: 'http',
        flag: 'SF',
        src_bytes: 181,
        dst_bytes: 5450,
      },
      mitre_tactic: 'Impact',
      mitre_technique: 'T1498 (TBD - verify)',
      notes: null,
      resolution: null,
    };
    const parsed = AlertDetailSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates ModelMetricsResponseSchema for 2-stage architecture', () => {
    const payload = {
      active_model: {
        version: 'v2',
        deployed_at: '2026-10-01T00:00:00Z',
        model_type: '2-Stage Cascade (IForest + LightGBM)',
        stages: ['Isolation Forest', 'LightGBM Multi-Class'],
        dataset: 'NSL-KDD',
        training_date: '2026-09-30',
      },
      stage1_metrics: {
        novelty_fpr: 0.024,
        anomaly_auc_attack_vs_normal: 0.942,
        anomaly_score_percentiles: { p50: 0.12, p90: 0.45, p99: 0.88 },
      },
      stage2_metrics: {
        accuracy: 0.981,
        precision_macro: 0.945,
        recall_macro: 0.932,
        f1_macro: 0.938,
        fpr: 0.018,
        auc_macro: 0.988,
        pr_auc_macro: 0.974,
        per_class: {
          dos: { precision: 0.99, recall: 0.98, f1: 0.985, auc: 0.995, pr_auc: 0.992, support: 45927 },
          probe: { precision: 0.94, recall: 0.91, f1: 0.925, auc: 0.975, pr_auc: 0.961, support: 11656 },
        },
        confusion_matrix: {
          labels: ['dos', 'probe'],
          matrix: [[45000, 927], [500, 11156]],
        },
      },
    };
    const parsed = ModelMetricsResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates DriftMetricsResponseSchema with label & anomaly drift', () => {
    const payload = {
      model_version: 'v2',
      drift_status: 'healthy',
      latest_snapshot: {
        timestamp: '2026-10-03T10:00:00Z',
        label_drift: {
          drift_score: 0.042,
          warning_threshold: 0.3,
          critical_threshold: 0.6,
          training_distribution: { dos: 0.38, normal: 0.53 },
          current_distribution: { dos: 0.39, normal: 0.52 },
          deviation: { dos: '+1.0%', normal: '-1.0%' },
        },
        anomaly_score_drift: {
          method: 'PSI',
          training_percentiles: { p50: 0.12, p90: 0.45 },
          current_percentiles: { p50: 0.13, p90: 0.46 },
          psi_score: 0.021,
          status: 'healthy',
        },
      },
      history: [
        { timestamp: '2026-10-02T00:00:00Z', label_drift_score: 0.03, anomaly_psi_score: 0.018, status: 'healthy' },
      ],
      recommendation: null,
    };
    const parsed = DriftMetricsResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates AlertThresholdsConfigSchema for admin config', () => {
    const payload = {
      confidence_threshold: 0.7,
      anomaly_threshold: 0.5,
      critical_severity_min_confidence: 0.85,
      high_severity_min_confidence: 0.65,
      novelty_threshold: 0.65,
      novelty_severity: 'high',
      updated_at: '2026-10-01T12:00:00Z',
      updated_by: 'admin',
    };
    const parsed = AlertThresholdsConfigSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates IngestSingleResponseSchema', () => {
    const payload = {
      record_id: 'rec-1234',
      prediction: {
        label: 'probe',
        confidence: 0.92,
        probabilities: { normal: 0.05, probe: 0.92, dos: 0.03 },
        model_version: 'v2',
        anomaly_score: 0.74,
      },
      alert: {
        id: 'alt-5678',
        severity: 'high',
        status: 'new',
        created_at: '2026-10-03T12:00:00Z',
      },
    };
    const parsed = IngestSingleResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates AuditRecordSchema', () => {
    const payload = {
      id: 1,
      timestamp: '2026-10-03T12:00:00Z',
      actor: 'admin',
      action: 'DEPLOY_MODEL',
      target_type: 'model',
      target_id: 'v2',
      changes: { previous: 'v1', active: 'v2' },
    };
    const parsed = AuditRecordSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates IngestTaskStatusResponseSchema', () => {
    const payload = {
      task_id: 'task-99',
      status: 'completed',
      progress: {
        total_records: 1000,
        processed: 1000,
        alerts_created: 120,
        errors: 0,
        percent_complete: 100,
      },
      started_at: '2026-10-03T12:00:00Z',
      completed_at: '2026-10-03T12:01:00Z',
      duration_seconds: 60,
    };
    const parsed = IngestTaskStatusResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });
});

