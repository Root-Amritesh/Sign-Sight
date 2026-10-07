/**
 * The complete SignSight API surface, one function per endpoint in
 * API_SPEC.md §4. React components only ever import from `../api` (which
 * re-exports either these functions or the mock), so swapping backends is a
 * one-line env change.
 */

import { http, qs } from './client'
import type {
  Alert,
  AlertFilters,
  AlertListItem,
  AlertStats,
  AlertThresholdConfig,
  AlertUpdateRequest,
  AuditFilters,
  AuditResponse,
  BatchAccepted,
  BatchTask,
  DeployRequest,
  DeployResponse,
  DriftResponse,
  HealthResponse,
  IngestResponse,
  LoginRequest,
  LoginResponse,
  ModelListResponse,
  ModelMetricsResponse,
  Paginated,
  ReplayRequest,
  ReplayStarted,
  ReplayStopped,
  RollbackResponse,
  TrafficRecordInput,
  User,
} from './types'

/* ── 1.1 Auth ─────────────────────────────────────────────────────── */

export const auth = {
  login: (body: LoginRequest) => http.post<LoginResponse>('/auth/login/', body, { anonymous: true }),
  refresh: (refresh: string) =>
    http.post<{ access: string }>('/auth/refresh/', { refresh }, { anonymous: true }),
  me: (signal?: AbortSignal) => http.get<User>('/auth/me/', signal),
}

/* ── 1.2 Ingestion ────────────────────────────────────────────────── */

export const ingest = {
  record: (body: TrafficRecordInput) => http.post<IngestResponse>('/ingest/', body),
  batch: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.postForm<BatchAccepted>('/ingest/batch/', form)
  },
  task: (taskId: string, signal?: AbortSignal) =>
    http.get<BatchTask>(`/ingest/tasks/${taskId}/`, signal),
  startReplay: (body: ReplayRequest) => http.post<ReplayStarted>('/ingest/replay/', body),
  stopReplay: () => http.post<ReplayStopped>('/ingest/replay/stop/'),
}

/* ── 1.3 Alerts ───────────────────────────────────────────────────── */

export const alerts = {
  list: (filters: AlertFilters = {}, signal?: AbortSignal) =>
    http.get<Paginated<AlertListItem>>(`/alerts/${qs(filters as Record<string, unknown>)}`, signal),
  detail: (id: string, signal?: AbortSignal) => http.get<Alert>(`/alerts/${id}/`, signal),
  update: (id: string, body: AlertUpdateRequest) => http.patch<Alert>(`/alerts/${id}/`, body),
  stats: (period = '24h', signal?: AbortSignal) =>
    http.get<AlertStats>(`/alerts/stats/${qs({ period })}`, signal),
}

/* ── 1.4 Model management (admin) ─────────────────────────────────── */

export const models = {
  list: (signal?: AbortSignal) => http.get<ModelListResponse>('/models/', signal),
  deploy: (body: DeployRequest) => http.post<DeployResponse>('/models/deploy/', body),
  rollback: (version: string) => http.post<RollbackResponse>('/models/rollback/', { version }),
}

/* ── 1.5 Metrics & monitoring ─────────────────────────────────────── */

export const metrics = {
  model: (signal?: AbortSignal) => http.get<ModelMetricsResponse>('/metrics/model/', signal),
  drift: (signal?: AbortSignal) => http.get<DriftResponse>('/metrics/drift/', signal),
  health: (signal?: AbortSignal) => http.get<HealthResponse>('/health/', signal),
}

/* ── 1.6 Audit (admin) ────────────────────────────────────────────── */

export const audit = {
  list: (filters: AuditFilters = {}, signal?: AbortSignal) =>
    http.get<AuditResponse>(`/audit/${qs(filters as Record<string, unknown>)}`, signal),
}

/* ── 1.7 Threshold configuration (admin) ──────────────────────────── */

export const config = {
  thresholds: (signal?: AbortSignal) =>
    http.get<AlertThresholdConfig>('/config/alert-thresholds/', signal),
  updateThresholds: (body: AlertThresholdConfig) =>
    http.put<AlertThresholdConfig>('/config/alert-thresholds/', body),
}

export type SignSightApi = {
  auth: typeof auth
  ingest: typeof ingest
  alerts: typeof alerts
  models: typeof models
  metrics: typeof metrics
  audit: typeof audit
  config: typeof config
}

export const httpApi: SignSightApi = { auth, ingest, alerts, models, metrics, audit, config }

export type { Alert, AlertListItem }
