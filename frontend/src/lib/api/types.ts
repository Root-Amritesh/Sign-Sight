/**
 * SignSight API types.
 *
 * These are a 1:1 transcription of the response/request shapes in
 * `docs/API_SPEC.md` (D9) and `docs/ML_DATA_PIPELINE.md` (D6). If the backend
 * changes, change it here first — the TypeScript compiler will point at every
 * call site that needs updating. That is the whole point of this file.
 */

/* ═══════════════════════════════════════════════════════════════════════
   Shared primitives
   ═══════════════════════════════════════════════════════════════════════ */

/** ISO 8601, UTC. */
export type IsoDateTime = string

export type Role = 'analyst' | 'admin'

/** Alert severity, ordered most→least severe. Order is load-bearing. */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

/** Alert lifecycle status. See WORKFLOWS.md §4.1. */
export type AlertStatus = 'new' | 'viewed' | 'escalated' | 'resolved'

/** How an analyst dispositioned an alert. */
export type Resolution = 'true_positive' | 'false_positive'

/** The 5 NSL-KDD classes the model predicts. */
export type ClassLabel = 'normal' | 'dos' | 'probe' | 'r2l' | 'u2r'

/** Per-class probability vector, keyed by class label. */
export type ProbabilityVector = Record<ClassLabel, number>

/** DRF offset pagination envelope. */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** The documented error envelope: `{"detail", "code", "errors"}`. */
export interface ApiErrorBody {
  detail: string
  code?: string
  errors?: Record<string, string[]>
  [key: string]: unknown
}

/* ═══════════════════════════════════════════════════════════════════════
   1.1 Authentication
   ═══════════════════════════════════════════════════════════════════════ */

export interface User {
  id: number
  username: string
  email?: string
  role: Role
  date_joined?: IsoDateTime
  last_login?: IsoDateTime | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

/* ═══════════════════════════════════════════════════════════════════════
   1.2 Ingestion
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * A single NSL-KDD traffic record — all 41 features from
 * ML_DATA_PIPELINE.md §2. This is exactly the `POST /api/ingest/` body.
 */
export interface TrafficRecordInput {
  // §2.1 Basic TCP connection
  duration: number
  protocol_type: string
  service: string
  flag: string
  src_bytes: number
  dst_bytes: number
  land: number
  wrong_fragment: number
  urgent: number
  // §2.2 Content-based
  hot: number
  num_failed_logins: number
  logged_in: number
  num_compromised: number
  root_shell: number
  su_attempted: number
  num_root: number
  num_file_creations: number
  num_shells: number
  num_access_files: number
  num_outbound_cmds: number
  is_host_login: number
  is_guest_login: number
  // §2.3 Traffic-based
  count: number
  srv_count: number
  serror_rate: number
  srv_serror_rate: number
  rerror_rate: number
  srv_rerror_rate: number
  same_srv_rate: number
  diff_srv_rate: number
  srv_diff_host_rate: number
  dst_host_count: number
  dst_host_srv_count: number
  dst_host_same_srv_rate: number
  dst_host_diff_srv_rate: number
  dst_host_same_src_port_rate: number
  dst_host_srv_diff_host_rate: number
  dst_host_serror_rate: number
  dst_host_srv_serror_rate: number
  dst_host_rerror_rate: number
  dst_host_srv_rerror_rate: number
}

export interface Prediction {
  label: ClassLabel
  confidence: number
  probabilities: ProbabilityVector
  model_version: string
}

export interface IngestAlertStub {
  id: string
  severity: Severity
  status: AlertStatus
  created_at: IsoDateTime
}

export interface IngestResponse {
  record_id: string
  prediction: Prediction
  alert: IngestAlertStub | null
}

export interface BatchAccepted {
  task_id: string
  status: 'queued' | string
  message: string
  status_url: string
}

export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'stopped'

export interface TaskProgress {
  total_records: number
  processed: number
  alerts_created: number
  errors: number
  percent_complete: number
}

export interface BatchTask {
  task_id: string
  status: TaskStatus
  progress: TaskProgress
  started_at: IsoDateTime
  completed_at?: IsoDateTime
  duration_seconds?: number
}

export interface ReplayRequest {
  dataset_path: string
  records_per_second: number
  max_records: number
}

export interface ReplayStarted {
  task_id: string
  status: string
  config: ReplayRequest
}

export interface ReplayStopped {
  task_id: string
  status: string
  records_processed: number
}

/* ═══════════════════════════════════════════════════════════════════════
   1.3 Alerts
   ═══════════════════════════════════════════════════════════════════════ */

/** Compact row shape from `GET /api/alerts/`. */
export interface AlertListItem {
  id: string
  created_at: IsoDateTime
  severity: Severity
  status: AlertStatus
  predicted_label: ClassLabel
  confidence: number
  model_version: string
}

/** Full shape from `GET /api/alerts/{id}/`. */
export interface Alert extends AlertListItem {
  updated_at: IsoDateTime
  resolution: Resolution | null
  probabilities: ProbabilityVector
  notes: string | null
  resolved_by: { id: number; username: string } | null
  recommendation: string
  traffic_record: Partial<TrafficRecordInput> & {
    id: string
    ingested_at: IsoDateTime
  }
  /** NSL-KDD has no IP/port columns; present for forward compatibility. */
  source_ip: string | null
  dest_ip: string | null
  source_port: number | null
  dest_port: number | null
}

export interface AlertUpdateRequest {
  status?: AlertStatus
  resolution?: Resolution
  notes?: string | null
}

export interface AlertStats {
  period: string
  total_alerts: number
  by_severity: Record<Severity, number>
  by_status: Record<AlertStatus, number>
  by_label: Record<string, number>
  resolution_breakdown: {
    true_positive: number
    false_positive: number
  }
  false_positive_rate: number
  mean_time_to_resolve_seconds: number
}

/** Every filter `GET /api/alerts/` accepts (API_SPEC.md §1.3). */
export interface AlertFilters {
  status?: AlertStatus[]
  severity?: Severity[]
  predicted_label?: ClassLabel | ''
  model_version?: string
  min_confidence?: number
  created_after?: string
  created_before?: string
  resolved_by?: number
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}

/* ═══════════════════════════════════════════════════════════════════════
   1.4 Model management
   ═══════════════════════════════════════════════════════════════════════ */

export interface ModelVersionSummary {
  version: string
  is_active: boolean
  model_type: string
  deployed_at: IsoDateTime
  deployed_by: string
  dataset: string
  accuracy: number
  auc_macro: number
}

export interface ModelListResponse {
  active_version: string
  models: ModelVersionSummary[]
}

export interface DeployRequest {
  version: string
  artifact_path: string
}

export interface DeployResponse {
  version: string
  status: string
  previous_version: string | null
  deployed_at: IsoDateTime
  metrics_summary: {
    accuracy: number
    precision_macro: number
    recall_macro: number
    auc_macro: number
  }
  message: string
}

export interface RollbackResponse {
  version: string
  status: string
  previous_version: string | null
  message: string
}

/* ═══════════════════════════════════════════════════════════════════════
   1.5 Metrics & monitoring
   ═══════════════════════════════════════════════════════════════════════ */

export interface ActiveModelInfo {
  version: string
  deployed_at: IsoDateTime
  model_type: string
  dataset: string
  training_date: IsoDateTime
}

export interface OverallMetrics {
  accuracy: number
  precision_macro: number
  recall_macro: number
  f1_macro: number
  fpr: number
  auc_macro: number
}

export interface PerClassMetrics {
  precision: number
  recall: number
  f1: number
  auc: number
  support: number
}

export interface ConfusionMatrix {
  labels: ClassLabel[]
  matrix: number[][]
}

export interface ModelMetricsResponse {
  active_model: ActiveModelInfo
  overall_metrics: OverallMetrics
  per_class_metrics: Record<ClassLabel, PerClassMetrics>
  confusion_matrix: ConfusionMatrix
  class_imbalance_note: string
}

export type DriftStatus = 'healthy' | 'warning' | 'critical'

export interface DriftSnapshot {
  timestamp: IsoDateTime
  drift_score: number
  warning_threshold: number
  critical_threshold: number
  training_distribution: Record<ClassLabel, number>
  current_distribution: Record<ClassLabel, number>
  /** Pre-formatted signed strings, e.g. `"+7.9%"`. */
  deviation: Record<ClassLabel, string>
}

export interface DriftHistoryEntry {
  timestamp: IsoDateTime
  drift_score: number
  status: DriftStatus
}

export interface DriftResponse {
  model_version: string
  drift_status: DriftStatus
  latest_snapshot: DriftSnapshot
  history: DriftHistoryEntry[]
  recommendation: string
}

export type CheckStatus = 'up' | 'down' | 'loaded' | 'unavailable' | 'degraded' | string

export interface HealthCheck {
  status: string
  latency_ms?: number
  error?: string
  active_workers?: number
  version?: string
  loaded_at?: IsoDateTime
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'down' | string
  checks: {
    database: HealthCheck
    redis: HealthCheck
    celery: HealthCheck
    model: HealthCheck
  }
  timestamp: IsoDateTime
}

/* ═══════════════════════════════════════════════════════════════════════
   1.6 Audit
   ═══════════════════════════════════════════════════════════════════════ */

export interface AuditEntry {
  id: number
  timestamp: IsoDateTime
  actor: { id: number; username: string } | null
  action: string
  target_type: string
  target_id: string
  changes: Record<string, { old: unknown; new: unknown }>
  notes: string | null
}

export interface AuditResponse {
  count: number
  results: AuditEntry[]
}

export interface AuditFilters {
  actor?: number
  action?: string
  target_type?: string
  created_after?: string
  created_before?: string
}

/* ═══════════════════════════════════════════════════════════════════════
   1.7 Configuration
   ═══════════════════════════════════════════════════════════════════════ */

export interface SeverityTier {
  min_confidence: number
}

export interface AlertThresholdConfig {
  min_confidence_to_alert: number
  normal_uncertainty_threshold: number
  severity_tiers: Record<Severity, SeverityTier>
  attack_type_severity_boost: Record<string, number>
  notification_severities: Severity[]
}
