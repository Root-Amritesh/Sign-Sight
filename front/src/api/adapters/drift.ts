import type { DriftMetricsResponse } from '../schemas/drift';

export interface UIDriftSnapshot {
  timestamp?: string;
  labelDrift?: {
    driftScore: number;
    warningThreshold: number;
    criticalThreshold: number;
    trainingDistribution: Record<string, number>;
    currentDistribution: Record<string, number>;
    deviation: Record<string, string>;
  };
  anomalyScoreDrift?: {
    method: string;
    trainingPercentiles: Record<string, number>;
    currentPercentiles: Record<string, number>;
    psiScore: number;
    status: string;
    note?: string;
  };
}

export interface UIDriftMetrics {
  modelVersion?: string;
  driftStatus: 'healthy' | 'warning' | 'critical' | string;
  latestSnapshot?: UIDriftSnapshot;
  history: Array<{
    timestamp: string;
    labelDriftScore?: number;
    anomalyPsiScore?: number;
    status?: string;
  }>;
  recommendation?: string;
}

export function adaptDriftMetrics(raw: DriftMetricsResponse): UIDriftMetrics {
  return {
    modelVersion: raw.model_version,
    driftStatus: raw.drift_status || 'healthy',
    latestSnapshot: raw.latest_snapshot
      ? {
          timestamp: raw.latest_snapshot.timestamp,
          labelDrift: raw.latest_snapshot.label_drift
            ? {
                driftScore: raw.latest_snapshot.label_drift.drift_score ?? 0,
                warningThreshold: raw.latest_snapshot.label_drift.warning_threshold ?? 0.3,
                criticalThreshold: raw.latest_snapshot.label_drift.critical_threshold ?? 0.6,
                trainingDistribution: raw.latest_snapshot.label_drift.training_distribution || {},
                currentDistribution: raw.latest_snapshot.label_drift.current_distribution || {},
                deviation: raw.latest_snapshot.label_drift.deviation || {},
              }
            : undefined,
          anomalyScoreDrift: raw.latest_snapshot.anomaly_score_drift
            ? {
                method: raw.latest_snapshot.anomaly_score_drift.method || 'PSI',
                trainingPercentiles: raw.latest_snapshot.anomaly_score_drift.training_percentiles || {},
                currentPercentiles: raw.latest_snapshot.anomaly_score_drift.current_percentiles || {},
                psiScore: raw.latest_snapshot.anomaly_score_drift.psi_score ?? 0,
                status: raw.latest_snapshot.anomaly_score_drift.status || 'healthy',
                note: raw.latest_snapshot.anomaly_score_drift.note,
              }
            : undefined,
        }
      : undefined,
    history: (raw.history || []).map((h) => ({
      timestamp: h.timestamp,
      labelDriftScore: h.label_drift_score,
      anomalyPsiScore: h.anomaly_psi_score,
      status: h.status,
    })),
    recommendation: raw.recommendation ?? undefined,
  };
}
