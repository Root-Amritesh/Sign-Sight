import type { AlertThresholdsConfig } from '../schemas/config';
import { diagnostics } from './diagnostics';

export interface UIThresholdsConfig {
  minConfidenceToAlert: number;
  normalUncertaintyThreshold: number;
  noveltyThreshold: number;
  noveltySeverity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  severityTiers: {
    critical: { minConfidence: number };
    high: { minConfidence: number };
    medium: { minConfidence: number };
    low: { minConfidence: number };
    info: { minConfidence: number };
  };
  attackTypeSeverityBoost: {
    u2r: number;
    r2l: number;
    dos: number;
    probe: number;
  };
  notificationSeverities: string[];
  detectedKey: 'novelty_threshold' | 'anomaly_score_novelty_threshold';
}

export function adaptThresholdsConfig(raw: Partial<AlertThresholdsConfig>): UIThresholdsConfig {
  // Detect which field name was returned by backend
  let detectedKey: 'novelty_threshold' | 'anomaly_score_novelty_threshold' = 'novelty_threshold';
  let noveltyThreshold = 0.65;

  if (raw.anomaly_score_novelty_threshold !== undefined && raw.anomaly_score_novelty_threshold !== null) {
    detectedKey = 'anomaly_score_novelty_threshold';
    noveltyThreshold = raw.anomaly_score_novelty_threshold;
    diagnostics.setDifference('thresholdField', 'anomaly_score_novelty_threshold');
  } else if (raw.novelty_threshold !== undefined && raw.novelty_threshold !== null) {
    detectedKey = 'novelty_threshold';
    noveltyThreshold = raw.novelty_threshold;
    diagnostics.setDifference('thresholdField', 'novelty_threshold');
  }

  const noveltySeverity = raw.novel_suspicious_max_severity || raw.novelty_severity || 'high';

  return {
    minConfidenceToAlert: raw.min_confidence_to_alert ?? 0.4,
    normalUncertaintyThreshold: raw.normal_uncertainty_threshold ?? 0.7,
    noveltyThreshold,
    noveltySeverity,
    severityTiers: {
      critical: { minConfidence: raw.severity_tiers?.critical?.min_confidence ?? 0.95 },
      high: { minConfidence: raw.severity_tiers?.high?.min_confidence ?? 0.85 },
      medium: { minConfidence: raw.severity_tiers?.medium?.min_confidence ?? 0.7 },
      low: { minConfidence: raw.severity_tiers?.low?.min_confidence ?? 0.5 },
      info: { minConfidence: raw.severity_tiers?.info?.min_confidence ?? 0.4 },
    },
    attackTypeSeverityBoost: {
      u2r: raw.attack_type_severity_boost?.u2r ?? 1,
      r2l: raw.attack_type_severity_boost?.r2l ?? 1,
      dos: raw.attack_type_severity_boost?.dos ?? 0,
      probe: raw.attack_type_severity_boost?.probe ?? 0,
    },
    notificationSeverities: raw.notification_severities ?? ['critical', 'high'],
    detectedKey,
  };
}

export function serializeThresholdsConfig(
  ui: UIThresholdsConfig,
  keyVariant: 'novelty_threshold' | 'anomaly_score_novelty_threshold' = 'novelty_threshold'
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    min_confidence_to_alert: ui.minConfidenceToAlert,
    normal_uncertainty_threshold: ui.normalUncertaintyThreshold,
    novelty_severity: ui.noveltySeverity,
    novel_suspicious_max_severity: ui.noveltySeverity,
    severity_tiers: {
      critical: { min_confidence: ui.severityTiers.critical.minConfidence },
      high: { min_confidence: ui.severityTiers.high.minConfidence },
      medium: { min_confidence: ui.severityTiers.medium.minConfidence },
      low: { min_confidence: ui.severityTiers.low.minConfidence },
      info: { min_confidence: ui.severityTiers.info.minConfidence },
    },
    attack_type_severity_boost: {
      u2r: ui.attackTypeSeverityBoost.u2r,
      r2l: ui.attackTypeSeverityBoost.r2l,
      dos: ui.attackTypeSeverityBoost.dos,
      probe: ui.attackTypeSeverityBoost.probe,
    },
    notification_severities: ui.notificationSeverities,
  };

  if (keyVariant === 'anomaly_score_novelty_threshold') {
    base.anomaly_score_novelty_threshold = ui.noveltyThreshold;
  } else {
    base.novelty_threshold = ui.noveltyThreshold;
  }

  return base;
}
