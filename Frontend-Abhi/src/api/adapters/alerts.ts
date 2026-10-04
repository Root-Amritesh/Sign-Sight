import type { AlertDetail, AlertListItem, AlertStats } from '../schemas/alerts';

export interface UIAlertListItem {
  id: string;
  createdAt: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'new' | 'viewed' | 'escalated' | 'resolved';
  predictedLabel: 'normal' | 'dos' | 'probe' | 'r2l' | 'u2r';
  confidence: number;
  modelVersion: string;
  anomalyScore?: number;
  alertType?: 'known_attack' | 'novel_suspicious' | 'uncertain_normal';
}

export interface UIExplanation {
  method: string;
  predictedClass: string;
  topFeatures: Array<{ feature: string; contribution: number }>;
}

export interface UITrafficRecord {
  id?: string;
  ingestedAt?: string;
  duration?: number;
  protocolType?: string;
  service?: string;
  flag?: string;
  srcBytes?: number;
  dstBytes?: number;
  count?: number;
  srvCount?: number;
}

export interface UIAlertDetail extends UIAlertListItem {
  updatedAt?: string;
  resolution: 'true_positive' | 'false_positive' | null;
  probabilities: Record<string, number>;
  explanation?: UIExplanation;
  mitreTactic?: string;
  mitreTechnique?: string;
  isMitreUnverified: boolean;
  notes?: string;
  resolvedBy?: { id: number; username: string } | string;
  recommendation?: string;
  trafficRecord?: UITrafficRecord;
}

export function adaptAlertListItem(raw: AlertListItem): UIAlertListItem {
  return {
    id: raw.id,
    createdAt: raw.created_at,
    severity: raw.severity,
    status: raw.status,
    predictedLabel: raw.predicted_label,
    confidence: raw.confidence,
    modelVersion: raw.model_version,
    anomalyScore: raw.anomaly_score,
    alertType: raw.alert_type,
  };
}

export function adaptAlertDetail(raw: AlertDetail): UIAlertDetail {
  const isMitreUnverified =
    Boolean(raw.mitre_technique?.includes('(TBD - verify)')) ||
    Boolean(raw.mitre_technique?.includes('TBD'));

  let resolvedBy: { id: number; username: string } | string | undefined = undefined;
  if (raw.resolved_by && typeof raw.resolved_by === 'object' && 'username' in raw.resolved_by) {
    resolvedBy = { id: raw.resolved_by.id, username: raw.resolved_by.username };
  } else if (raw.resolved_by) {
    resolvedBy = String(raw.resolved_by);
  }

  return {
    id: raw.id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    severity: raw.severity,
    status: raw.status,
    resolution: raw.resolution ?? null,
    alertType: raw.alert_type,
    predictedLabel: raw.predicted_label,
    confidence: raw.confidence,
    anomalyScore: raw.anomaly_score,
    probabilities: raw.probabilities || {},
    explanation: raw.explanation
      ? {
          method: raw.explanation.method || 'pred_contrib',
          predictedClass: raw.explanation.predicted_class || raw.predicted_label,
          topFeatures: (raw.explanation.top_features || []).map((f) => ({
            feature: f.feature,
            contribution: f.contribution,
          })),
        }
      : undefined,
    modelVersion: raw.model_version,
    mitreTactic: raw.mitre_tactic ?? undefined,
    mitreTechnique: raw.mitre_technique ?? undefined,
    isMitreUnverified,
    notes: raw.notes ?? undefined,
    resolvedBy,
    recommendation: raw.recommendation ?? undefined,
    trafficRecord: raw.traffic_record
      ? {
          id: raw.traffic_record.id,
          ingestedAt: raw.traffic_record.ingested_at,
          duration: raw.traffic_record.duration,
          protocolType: raw.traffic_record.protocol_type,
          service: raw.traffic_record.service,
          flag: raw.traffic_record.flag,
          srcBytes: raw.traffic_record.src_bytes,
          dstBytes: raw.traffic_record.dst_bytes,
          count: raw.traffic_record.count,
          srvCount: raw.traffic_record.srv_count,
        }
      : undefined,
  };
}

export interface UIAlertStats {
  period?: string;
  totalAlerts: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  byStatus: {
    new: number;
    viewed: number;
    resolved: number;
    escalated: number;
  };
  byAlertType: {
    knownAttack: number;
    novelSuspicious: number;
    uncertainNormal: number;
  };
  byLabel: {
    dos: number;
    probe: number;
    r2l: number;
    u2r: number;
    normal: number;
  };
  resolutionBreakdown: {
    truePositive: number;
    falsePositive: number;
  };
  falsePositiveRate?: number;
  meanTimeToResolveSeconds?: number;
}

export function adaptAlertStats(raw: AlertStats): UIAlertStats {
  return {
    period: raw.period,
    totalAlerts: raw.total_alerts,
    bySeverity: {
      critical: raw.by_severity.critical ?? 0,
      high: raw.by_severity.high ?? 0,
      medium: raw.by_severity.medium ?? 0,
      low: raw.by_severity.low ?? 0,
      info: raw.by_severity.info ?? 0,
    },
    byStatus: {
      new: raw.by_status.new ?? 0,
      viewed: raw.by_status.viewed ?? 0,
      resolved: raw.by_status.resolved ?? 0,
      escalated: raw.by_status.escalated ?? 0,
    },
    byAlertType: {
      knownAttack: raw.by_alert_type?.known_attack ?? 0,
      novelSuspicious: raw.by_alert_type?.novel_suspicious ?? 0,
      uncertainNormal: raw.by_alert_type?.uncertain_normal ?? 0,
    },
    byLabel: {
      dos: raw.by_label?.dos ?? 0,
      probe: raw.by_label?.probe ?? 0,
      r2l: raw.by_label?.r2l ?? 0,
      u2r: raw.by_label?.u2r ?? 0,
      normal: raw.by_label?.normal ?? 0,
    },
    resolutionBreakdown: {
      truePositive: raw.resolution_breakdown?.true_positive ?? 0,
      falsePositive: raw.resolution_breakdown?.false_positive ?? 0,
    },
    falsePositiveRate: raw.false_positive_rate,
    meanTimeToResolveSeconds: raw.mean_time_to_resolve_seconds,
  };
}
