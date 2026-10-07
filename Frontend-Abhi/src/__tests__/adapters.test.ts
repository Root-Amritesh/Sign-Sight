import { describe, it, expect } from 'vitest';
import {
  adaptAlertListItem,
  adaptAlertDetail,
  adaptDriftMetrics,
  adaptThresholdsConfig,
} from '../api/adapters';

describe('SignSight Data Adapter Tests', () => {
  it('correctly adapts raw alert list item into UI format', () => {
    const raw = {
      id: 'alt-500',
      created_at: '2026-10-03T12:00:00Z',
      severity: 'critical' as const,
      status: 'new' as const,
      predicted_label: 'dos' as const,
      confidence: 0.98,
      model_version: 'v2',
      anomaly_score: 0.91,
      alert_type: 'known_attack' as const,
    };
    const adapted = adaptAlertListItem(raw);
    expect(adapted.id).toBe('alt-500');
    expect(adapted.createdAt).toBe('2026-10-03T12:00:00Z');
    expect(adapted.predictedLabel).toBe('dos');
    expect(adapted.confidence).toBe(0.98);
    expect(adapted.anomalyScore).toBe(0.91);
  });

  it('correctly adapts raw alert detail and identifies unverified MITRE tag', () => {
    const raw = {
      id: 'alt-100',
      created_at: '2026-10-03T12:00:00Z',
      severity: 'critical' as const,
      status: 'new' as const,
      predicted_label: 'dos' as const,
      confidence: 0.95,
      model_version: 'v2',
      anomaly_score: 0.88,
      mitre_tactic: 'Impact',
      mitre_technique: 'T1498 (TBD - verify)',
      explanation: {
        method: 'pred_contrib',
        top_features: [{ feature: 'serror_rate', contribution: 0.5 }],
      },
    };
    const adapted = adaptAlertDetail(raw);
    expect(adapted.id).toBe('alt-100');
    expect(adapted.isMitreUnverified).toBe(true);
    expect(adapted.explanation?.topFeatures[0].feature).toBe('serror_rate');
  });

  it('correctly adapts drift metrics and extracts PSI & deviation map', () => {
    const raw = {
      model_version: 'v2',
      drift_status: 'healthy',
      latest_snapshot: {
        timestamp: '2026-10-03T10:00:00Z',
        label_drift: {
          drift_score: 0.05,
          warning_threshold: 0.3,
          critical_threshold: 0.6,
          training_distribution: { dos: 0.4 },
          current_distribution: { dos: 0.41 },
          deviation: { dos: '+1.0%' },
        },
        anomaly_score_drift: {
          method: 'PSI',
          training_percentiles: { p50: 0.1 },
          current_percentiles: { p50: 0.11 },
          psi_score: 0.02,
          status: 'healthy',
        },
      },
      history: [],
    };
    const adapted = adaptDriftMetrics(raw);
    expect(adapted.driftStatus).toBe('healthy');
    expect(adapted.latestSnapshot?.anomalyScoreDrift?.psiScore).toBe(0.02);
    expect(adapted.latestSnapshot?.labelDrift?.deviation.dos).toBe('+1.0%');
  });

  it('correctly adapts thresholds config with novelty thresholds', () => {
    const raw = {
      novelty_threshold: 0.65,
      novelty_severity: 'high' as const,
      min_confidence_to_alert: 0.45,
    };
    const adapted = adaptThresholdsConfig(raw);
    expect(adapted.minConfidenceToAlert).toBe(0.45);
    expect(adapted.noveltyThreshold).toBe(0.65);
    expect(adapted.noveltySeverity).toBe('high');
  });
});
