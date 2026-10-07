export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AttackFamily = 'normal' | 'dos' | 'probe' | 'r2l' | 'u2r';

export type AlertStatus = 'new' | 'viewed' | 'escalated' | 'resolved';

export type AlertResolution = 'true_positive' | 'false_positive' | null;

export type AlertType = 'known_attack' | 'novel_suspicious' | 'uncertain_normal';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type {
  UIAlertListItem,
  UIAlertListItem as AlertListItem,
  UIAlertDetail,
  UIAlertDetail as Alert,
  UIAlertStats,
  UIAlertStats as AlertStats,
  UIModelMetrics,
  UIModelMetrics as ModelMetrics,
  UIModelVersion,
  UIModelVersion as ModelVersion,
  UIDriftMetrics,
  UIDriftMetrics as DriftMetrics,
  UIThresholdsConfig,
  UIThresholdsConfig as SystemConfig,
} from '../api/adapters';

export type { AuditRecord } from '../api/schemas/audit';
export type {
  IngestSingleResponse,
  IngestBatchResponse,
  IngestTaskStatusResponse as IngestTask,
  ReplayStartResponse,
  ReplayStopResponse,
} from '../api/schemas/ingest';
