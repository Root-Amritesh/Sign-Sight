/**
 * In-browser mock of the SignSight API.
 *
 * Implements the exact `SignSightApi` surface from `./endpoints`, returning
 * the response shapes documented in API_SPEC.md. It keeps mutable state so
 * resolving an alert, deploying a model, or starting a replay behaves like the
 * real thing — including a replay that actually streams new alerts.
 *
 * Enabled with VITE_USE_MOCK=true. No backend required.
 */

import { ApiError, tokenStore } from '../client'
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
  ProbabilityVector,
  ReplayRequest,
  ReplayStarted,
  ReplayStopped,
  Severity,
  TrafficRecordInput,
  User,
} from '../types'
import {
  CLASS_ORDER,
  DEFAULT_THRESHOLD_CONFIG,
  DEMO_USERS,
  MODEL_LIST,
  MODEL_METRICS,
  STATUS_ORDER,
  computeSeverity,
  rng,
  seedAlerts,
  seedAudit,
  seedDriftHistory,
  type SeedAuditEntry,
} from './seed'

/* ═══════════════════════════════════════════════════════════════════════
   Mutable state
   ═══════════════════════════════════════════════════════════════════════ */

interface MockState {
  alerts: Alert[]
  audit: SeedAuditEntry[]
  models: ModelListResponse
  thresholds: AlertThresholdConfig
  drift: DriftResponse
  tasks: Map<string, BatchTask>
  replay: {
    active: boolean
    taskId: string | null
    processed: number
    /** ReturnType so the field works under both DOM and Node timer types. */
    timer: ReturnType<typeof globalThis.setInterval> | null
    config: ReplayRequest | null
  }
  auditSeq: number
}

const state: MockState = {
  alerts: seedAlerts(),
  audit: seedAudit(),
  models: structuredClone(MODEL_LIST),
  thresholds: structuredClone(DEFAULT_THRESHOLD_CONFIG),
  drift: seedDriftHistory(),
  tasks: new Map(),
  replay: { active: false, taskId: null, processed: 0, timer: null, config: null },
  auditSeq: 10_000,
}

/** Subscribers notified whenever alerts change, so queries can invalidate. */
const listeners = new Set<() => void>()

export function onMockChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit(): void {
  listeners.forEach((fn) => fn())
}

function logAudit(
  action: string,
  targetType: string,
  targetId: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  notes: string | null = null,
  actor: { id: number; username: string } | null = currentUser(),
): void {
  state.auditSeq += 1
  state.audit.unshift({
    id: state.auditSeq,
    timestamp: new Date().toISOString(),
    actor,
    action,
    target_type: targetType,
    target_id: targetId,
    changes,
    notes,
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   Fake latency — 90–260ms reads, 180–420ms writes
   ═══════════════════════════════════════════════════════════════════════ */

function delay(signal?: AbortSignal): Promise<void> {
  const ms = rng.intBetween(90, 260)
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function currentUser(): User | null {
  const id = sessionStorage.getItem('signsight.mockUser')
  if (!id) return null
  return DEMO_USERS[id as keyof typeof DEMO_USERS]?.user ?? null
}

function requireUser(): User {
  const user = currentUser()
  if (!user) throw new ApiError(401, { detail: 'Authentication credentials were not provided.' }, 'Unauthorized')
  return user
}

function requireAdmin(): User {
  const user = requireUser()
  if (user.role !== 'admin') {
    throw new ApiError(403, { detail: 'You do not have permission to perform this action.' }, 'Forbidden')
  }
  return user
}

/* ═══════════════════════════════════════════════════════════════════════
   Inference simulation — mirrors the decision engine in D6 §7
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Heuristic stand-in for the RandomForest. It reads the features a real model
 * would lean on (connection burst, SYN-error rate, port-scan signatures,
 * failed logins) and produces a probability vector. Not a classifier — a
 * plausibility engine for the demo.
 */
function predict(record: TrafficRecordInput): ProbabilityVector {
  const scores: Record<string, number> = { normal: 1, dos: 0, probe: 0, r2l: 0, u2r: 0 }

  const burst = record.count + record.srv_count * 0.5
  if (burst > 100) scores.dos += 2.6
  else if (burst > 50) scores.dos += 1.5
  if (record.serror_rate > 0.25 || record.dst_host_serror_rate > 0.3) scores.dos += 1.2
  if (record.duration < 0.5 && record.dst_bytes < 400) scores.dos += 0.7
  if (record.protocol_type === 'icmp') scores.dos += 0.5

  if (record.rerror_rate > 0.4 || record.srv_rerror_rate > 0.3) scores.probe += 2.2
  if (record.diff_srv_rate > 0.5 && record.srv_diff_host_rate > 0.4) scores.probe += 1.3
  if (record.dst_host_srv_count > 20 && record.count < 20) scores.probe += 0.9

  if (record.num_failed_logins > 2) scores.r2l += 2.1
  if (record.logged_in === 0 && record.num_root > 0) scores.r2l += 1.4
  if (record.is_guest_login === 1) scores.r2l += 0.8
  if (record.flag === 'RSTR' && record.src_bytes < 100) scores.r2l += 0.4

  if (record.num_compromised > 0) scores.u2r += 2.7
  if (record.root_shell === 1) scores.u2r += 1.8
  if (record.su_attempted === 1) scores.u2r += 0.9
  if (record.hot > 4) scores.u2r += 0.8

  // Softmax over the scores, with a little noise so repeated ingests differ.
  const temp = 1.35
  const exps = CLASS_ORDER.map((c) => Math.exp(scores[c] / temp) * (0.85 + rng.next() * 0.3))
  const sum = exps.reduce((a, b) => a + b, 0)
  const out = {} as ProbabilityVector
  CLASS_ORDER.forEach((c, i) => {
    out[c] = Number((exps[i] / sum).toFixed(4))
  })
  return out
}

function topOf(probs: ProbabilityVector) {
  return CLASS_ORDER.reduce((best, c) => (probs[c] > probs[best] ? c : best), 'normal' as const)
}

function mintAlert(record: TrafficRecordInput, recordId: string): Alert {
  const probabilities = predict(record)
  const label = topOf(probabilities)
  const confidence = probabilities[label]
  const active = state.models.active_version
  const severity = computeSeverity(label, confidence) ?? 'info'
  const at = new Date().toISOString()

  const alert: Alert = {
    id: rng.uuid(),
    created_at: at,
    updated_at: at,
    severity,
    status: 'new',
    resolution: null,
    predicted_label: label,
    confidence,
    probabilities,
    model_version: active,
    notes: null,
    resolved_by: null,
    recommendation: `Investigate — predicted ${label === 'normal' ? 'normal traffic' : label.toUpperCase()} at ${Math.round(confidence * 100)}% confidence. No enforcement action is taken automatically.`,
    traffic_record: { ...record, id: recordId, ingested_at: at },
    source_ip: null,
    dest_ip: null,
    source_port: null,
    dest_port: null,
  }
  return alert
}

/** A synthetic record shaped like a specific class — used by replay mode. */
function syntheticRecord(label: string): TrafficRecordInput {
  const b = rng.intBetween
  const f = () => Number(rng.round(rng.next(), 3))
  const base: TrafficRecordInput = {
    duration: 0, protocol_type: 'tcp', service: 'http', flag: 'SF',
    src_bytes: 240, dst_bytes: 4200, land: 0, wrong_fragment: 0, urgent: 0,
    hot: 0, num_failed_logins: 0, logged_in: 1, num_compromised: 0, root_shell: 0,
    su_attempted: 0, num_root: 0, num_file_creations: 0, num_shells: 0,
    num_access_files: 0, num_outbound_cmds: 0, is_host_login: 0, is_guest_login: 0,
    count: 4, srv_count: 4, serror_rate: 0, srv_serror_rate: 0, rerror_rate: 0,
    srv_rerror_rate: 0, same_srv_rate: 0.5, diff_srv_rate: 0.2, srv_diff_host_rate: 0.1,
    dst_host_count: 9, dst_host_srv_count: 8, dst_host_same_srv_rate: 0.6,
    dst_host_diff_srv_rate: 0.2, dst_host_same_src_port_rate: 0.1,
    dst_host_srv_diff_host_rate: 0.1, dst_host_serror_rate: 0, dst_host_srv_serror_rate: 0,
    dst_host_rerror_rate: 0, dst_host_srv_rerror_rate: 0,
  }
  if (label === 'dos') {
    return { ...base, duration: 0, service: 'http', flag: 'S0', src_bytes: b(0, 30), dst_bytes: b(0, 200), count: b(120, 240), srv_count: b(80, 180), serror_rate: f() * 0.3, logged_in: 0, num_failed_logins: b(3, 10) }
  }
  if (label === 'probe') {
    return { ...base, service: 'other', flag: 'REJ', src_bytes: b(0, 220), dst_bytes: b(0, 60), count: b(1, 20), rerror_rate: 0.5 + f() * 0.4, srv_rerror_rate: f() * 0.4, dst_host_srv_count: b(25, 55) }
  }
  if (label === 'r2l') {
    return { ...base, duration: b(40, 280), service: 'telnet', logged_in: 0, num_failed_logins: b(3, 9), num_root: b(2, 11), is_guest_login: 1, flag: 'SF' }
  }
  if (label === 'u2r') {
    return { ...base, service: 'ftp_data', num_compromised: b(1, 3), root_shell: 1, su_attempted: 1, hot: b(3, 9), num_shells: b(1, 3), num_access_files: b(1, 5) }
  }
  return base
}

/* ═══════════════════════════════════════════════════════════════════════
   Replay engine
   ═══════════════════════════════════════════════════════════════════════ */

function stopReplayEngine(): void {
  if (state.replay.timer !== null) {
    globalThis.clearInterval(state.replay.timer)
    state.replay.timer = null
  }
  state.replay.active = false
}

/** Replay rates the engine will honour, mirroring the server-side limits. */
const REPLAY_MIN_RPS = 1
const REPLAY_MAX_RPS = 500
const REPLAY_MAX_RECORDS = 100_000

/**
 * Normalise a replay request, rejecting values the server would refuse.
 *
 * Without this, a non-numeric `records_per_second` makes `perTick` NaN and
 * `periodMs` NaN, so `setInterval(fn, NaN)` fires as fast as the event loop
 * allows while the inner `for` loop never executes — a hot loop that burns CPU
 * and reports 0% forever instead of failing loudly.
 */
function normaliseReplayConfig(body: ReplayRequest): ReplayRequest {
  const problems: Record<string, string[]> = {}

  if (typeof body.records_per_second !== 'number' || !Number.isFinite(body.records_per_second)) {
    problems.records_per_second = ['A number is required.']
  } else if (body.records_per_second < REPLAY_MIN_RPS || body.records_per_second > REPLAY_MAX_RPS) {
    problems.records_per_second = [
      `Must be between ${REPLAY_MIN_RPS} and ${REPLAY_MAX_RPS}.`,
    ]
  }

  if (typeof body.max_records !== 'number' || !Number.isInteger(body.max_records) || body.max_records < 1) {
    problems.max_records = ['A positive integer is required.']
  } else if (body.max_records > REPLAY_MAX_RECORDS) {
    problems.max_records = [`Must not exceed ${REPLAY_MAX_RECORDS}.`]
  }

  if (!body.dataset_path) problems.dataset_path = ['This field is required.']

  if (Object.keys(problems).length) {
    throw new ApiError(
      400,
      { detail: 'Invalid replay configuration.', code: 'validation_error', errors: problems },
      'Invalid replay configuration.',
    )
  }

  return { ...body }
}

function startReplayEngine(config: ReplayRequest): void {
  stopReplayEngine()
  state.replay.active = true
  state.replay.processed = 0
  state.replay.config = config
  // One batch per tick; the tick period is the inverse of the requested rate.
  // Both operands are validated above, so neither can go NaN.
  const perTick = Math.max(1, Math.round(config.records_per_second / 4))
  const periodMs = Math.max(16, (perTick / config.records_per_second) * 1000)

  state.replay.timer = globalThis.setInterval(() => {
    for (let i = 0; i < perTick; i += 1) {
      if (state.replay.processed >= config.max_records) {
        stopReplayEngine()
        const task = state.tasks.get(state.replay.taskId ?? '')
        if (task) {
          task.status = 'completed'
          task.progress.percent_complete = 100
          task.completed_at = new Date().toISOString()
          task.duration_seconds = Math.round(state.replay.processed / config.records_per_second)
        }
        return
      }
      state.replay.processed += 1
      const weights: Array<[string, number]> = [
        ['normal', 0.42], ['dos', 0.3], ['probe', 0.14], ['r2l', 0.09], ['u2r', 0.05],
      ]
      const roll = rng.next()
      let acc = 0
      let label = 'normal'
      for (const [name, w] of weights) {
        acc += w
        if (roll <= acc) {
          label = name
          break
        }
      }
      const record = syntheticRecord(label)
      const alert = mintAlert(record, rng.uuid())
      state.alerts.unshift(alert)
    }
    emit()
  }, Math.max(60, periodMs))
}

/* ═══════════════════════════════════════════════════════════════════════
   Filtering / ordering / pagination
   ═══════════════════════════════════════════════════════════════════════ */

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
}

function applyFilters(filters: AlertFilters): Alert[] {
  let out = state.alerts

  if (filters.status?.length) {
    const set = new Set(filters.status)
    out = out.filter((a) => set.has(a.status))
  }
  if (filters.severity?.length) {
    const set = new Set(filters.severity)
    out = out.filter((a) => set.has(a.severity))
  }
  if (filters.predicted_label) {
    out = out.filter((a) => a.predicted_label === filters.predicted_label)
  }
  if (filters.model_version) {
    out = out.filter((a) => a.model_version === filters.model_version)
  }
  if (filters.min_confidence !== undefined) {
    out = out.filter((a) => a.confidence >= (filters.min_confidence as number))
  }
  if (filters.created_after) {
    const t = Date.parse(filters.created_after)
    out = out.filter((a) => Date.parse(a.created_at) >= t)
  }
  if (filters.created_before) {
    const t = Date.parse(filters.created_before)
    out = out.filter((a) => Date.parse(a.created_at) <= t)
  }
  if (filters.resolved_by !== undefined) {
    out = out.filter((a) => a.resolved_by?.id === filters.resolved_by)
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    out = out.filter(
      (a) =>
        a.predicted_label.includes(q) ||
        (a.notes ?? '').toLowerCase().includes(q) ||
        a.model_version.toLowerCase().includes(q) ||
        (a.source_ip ?? '').includes(q) ||
        (a.resolved_by?.username ?? '').toLowerCase().includes(q) ||
        (a.traffic_record.service ?? '').toLowerCase().includes(q) ||
        (a.traffic_record.protocol_type ?? '').toLowerCase().includes(q),
    )
  }
  return out
}

function applyOrdering(list: Alert[], ordering?: string): Alert[] {
  const specs = (ordering ?? '-created_at').split(',').map((s) => {
    const desc = s.startsWith('-')
    return { field: desc ? s.slice(1) : s, desc }
  })
  return [...list].sort((a, b) => {
    for (const { field, desc } of specs) {
      const dir = desc ? -1 : 1
      if (field === 'severity') {
        const diff = (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) * dir
        if (diff) return diff
      } else if (field === 'confidence') {
        const diff = (a.confidence - b.confidence) * dir
        if (diff) return diff
      } else if (field === 'status') {
        const diff = (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) * dir
        if (diff) return diff
      } else {
        const av = Date.parse(a.created_at)
        const bv = Date.parse(b.created_at)
        if (av !== bv) return (av - bv) * dir
      }
    }
    return 0
  })
}

function toListItem(a: Alert): AlertListItem {
  return {
    id: a.id,
    created_at: a.created_at,
    severity: a.severity,
    status: a.status,
    predicted_label: a.predicted_label,
    confidence: a.confidence,
    model_version: a.model_version,
  }
}

function paginate<T>(list: T[], page = 1, pageSize = 25): Paginated<T> {
  const size = Math.min(Math.max(1, pageSize), 100)
  const start = (page - 1) * size
  const slice = list.slice(start, start + size)
  const hasNext = start + size < list.length
  const hasPrev = page > 1
  return {
    count: list.length,
    next: hasNext ? `/api/alerts/?page=${page + 1}&page_size=${size}` : null,
    previous: hasPrev ? `/api/alerts/?page=${page - 1}&page_size=${size}` : null,
    results: slice,
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Status transition rules — API_SPEC.md "Allowed status transitions"
   ═══════════════════════════════════════════════════════════════════════ */

const TRANSITIONS: Record<Alert['status'], Alert['status'][]> = {
  new: ['viewed', 'resolved', 'escalated'],
  viewed: ['resolved', 'escalated'],
  escalated: ['resolved'],
  resolved: [],
}

function assertTransition(from: Alert['status'], to: Alert['status']): void {
  if (from === to) return
  if (!TRANSITIONS[from].includes(to)) {
    throw new ApiError(
      400,
      { detail: `Cannot transition from '${from}' to '${to}'.`, code: 'invalid_status_transition' },
      'Invalid transition',
    )
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   The API implementation
   ═══════════════════════════════════════════════════════════════════════ */

export const mockApi = {
  auth: {
    async login(body: LoginRequest, _signal?: AbortSignal): Promise<LoginResponse> {
      await delay()
      const entry = DEMO_USERS[body.username as keyof typeof DEMO_USERS]
      if (!entry || entry.password !== body.password) {
        throw new ApiError(
          401,
          { detail: 'Invalid credentials.', code: 'authentication_failed' },
          'Invalid credentials.',
        )
      }
      sessionStorage.setItem('signsight.mockUser', entry.user.username)
      // Not real JWTs — opaque placeholders that satisfy the client's shape.
      return {
        access: `mock.${btoa(JSON.stringify({ sub: entry.user.id, role: entry.user.role, exp: Date.now() + 1_800_000 }))}.sig`,
        refresh: `mock-refresh.${entry.user.username}`,
        user: entry.user,
      }
    },

    async refresh(_refresh: string, _signal?: AbortSignal) {
      await delay()
      const user = currentUser()
      if (!user) throw new ApiError(401, { detail: 'Invalid refresh token.' }, 'Invalid refresh token.')
      return { access: tokenStore.access ?? 'mock.access.regenerated' }
    },

    async me(_signal?: AbortSignal): Promise<User> {
      await delay()
      const user = currentUser()
      if (!user) throw new ApiError(401, { detail: 'Not authenticated.' }, 'Not authenticated.')
      return {
        ...user,
        date_joined: '2026-09-20T09:15:00Z',
        last_login: new Date(Date.now() - rng.intBetween(5, 200) * 60_000).toISOString(),
      }
    },
  },

  ingest: {
    async record(body: TrafficRecordInput): Promise<IngestResponse> {
      await delay()
      requireUser()
      const recordId = rng.uuid()
      const alert = mintAlert(body, recordId)
      const shouldAlert = alert.predicted_label !== 'normal' || alert.severity === 'info'
      if (shouldAlert) {
        state.alerts.unshift(alert)
        logAudit('alert.created', 'alert', alert.id, {
          severity: { old: null, new: alert.severity },
          predicted_label: { old: null, new: alert.predicted_label },
        }, null, { id: 0, username: 'system' })
        emit()
      }
      return {
        record_id: recordId,
        prediction: {
          label: alert.predicted_label,
          confidence: alert.confidence,
          probabilities: alert.probabilities,
          model_version: alert.model_version,
        },
        alert: shouldAlert
          ? { id: alert.id, severity: alert.severity, status: alert.status, created_at: alert.created_at }
          : null,
      }
    },

    async batch(file: File): Promise<BatchAccepted> {
      await delay()
      requireAdmin()
      const taskId = rng.uuid()
      const total = 22_544
      state.tasks.set(taskId, {
        task_id: taskId,
        status: 'queued',
        progress: { total_records: total, processed: 0, alerts_created: 0, errors: 0, percent_complete: 0 },
        started_at: new Date().toISOString(),
      })
      // Drive the task forward on a timer, the way Celery would.
      const fileName = file.name
      let processed = 0
      const tick = globalThis.setInterval(() => {
        processed = Math.min(total, processed + rng.intBetween(900, 2_400))
        const alertsCreated = Math.round(processed * 0.42)
        const task = state.tasks.get(taskId)
        if (!task) {
          globalThis.clearInterval(tick)
          return
        }
        task.status = processed >= total ? 'completed' : 'processing'
        task.progress = {
          total_records: total,
          processed,
          alerts_created: alertsCreated,
          errors: rng.intBetween(2, 26),
          percent_complete: Number(((processed / total) * 100).toFixed(1)),
        }
        if (processed >= total) {
          task.completed_at = new Date().toISOString()
          task.duration_seconds = 271
          globalThis.clearInterval(tick)
          logAudit('ingest.batch_completed', 'task', taskId, {
            source: { old: null, new: fileName },
            records: { old: null, new: total },
          })
          emit()
        }
      }, 1_100)
      return {
        task_id: taskId,
        status: 'queued',
        message: 'Batch processing started. Poll task status for progress.',
        status_url: `/api/ingest/tasks/${taskId}/`,
      }
    },

    async task(taskId: string, signal?: AbortSignal): Promise<BatchTask> {
      await delay(signal)
      // Admin only per API_SPEC.md §1.4. Task results carry ingested record
      // counts and failures, so this must not be readable by any caller who
      // happens to know the id.
      requireAdmin()
      const task = state.tasks.get(taskId)
      if (!task) throw new ApiError(404, { detail: 'Task not found.' }, 'Task not found.')
      return structuredClone(task)
    },

    async startReplay(body: ReplayRequest): Promise<ReplayStarted> {
      await delay()
      requireAdmin()
      // Validate before touching any state, so a bad request cannot leave a
      // half-initialised task behind.
      const config = normaliseReplayConfig(body)
      if (state.replay.active) stopReplayEngine()
      const taskId = rng.uuid()
      state.replay.taskId = taskId
      state.tasks.set(taskId, {
        task_id: taskId,
        status: 'processing',
        progress: {
          total_records: config.max_records,
          processed: 0,
          alerts_created: 0,
          errors: 0,
          percent_complete: 0,
        },
        started_at: new Date().toISOString(),
      })
      startReplayEngine(config)
      logAudit('ingest.replay_started', 'task', taskId, { config: { old: null, new: config } })
      emit()
      return { task_id: taskId, status: 'started', config }
    },

    async stopReplay(): Promise<ReplayStopped> {
      await delay()
      requireAdmin()
      const taskId = state.replay.taskId ?? 'unknown'
      const processed = state.replay.processed
      stopReplayEngine()
      const task = state.tasks.get(taskId)
      if (task) {
        task.status = 'stopped'
        task.progress.processed = processed
        task.progress.percent_complete = Number(
          ((processed / task.progress.total_records) * 100).toFixed(1),
        )
      }
      logAudit('ingest.replay_stopped', 'task', taskId, { records: { old: null, new: processed } })
      emit()
      return { task_id: taskId, status: 'stopped', records_processed: processed }
    },
  },

  alerts: {
    async list(filters: AlertFilters = {}, signal?: AbortSignal): Promise<Paginated<AlertListItem>> {
      await delay(signal)
      requireUser()
      const filtered = applyFilters(filters)
      const ordered = applyOrdering(filtered, filters.ordering)
      const page = paginate(ordered.map(toListItem), filters.page ?? 1, filters.page_size ?? 25)
      return page
    },

    async detail(id: string, signal?: AbortSignal): Promise<Alert> {
      await delay(signal)
      requireUser()
      const alert = state.alerts.find((a) => a.id === id)
      if (!alert) throw new ApiError(404, { detail: 'Alert not found.' }, 'Alert not found.')
      // Auto-advance new → viewed on open, per WORKFLOWS.md §4.2 step 3.
      if (alert.status === 'new') {
        alert.status = 'viewed'
        alert.updated_at = new Date().toISOString()
        logAudit('alert.viewed', 'alert', alert.id, { status: { old: 'new', new: 'viewed' } })
        emit()
      }
      return structuredClone(alert)
    },

    async update(id: string, body: AlertUpdateRequest): Promise<Alert> {
      await delay()
      const user = requireUser()
      const alert = state.alerts.find((a) => a.id === id)
      if (!alert) throw new ApiError(404, { detail: 'Alert not found.' }, 'Alert not found.')

      if (body.status) assertTransition(alert.status, body.status)
      if (alert.status === 'resolved' && body.status && body.status !== 'resolved') {
        throw new ApiError(
          400,
          { detail: `Cannot transition from 'resolved' to '${body.status}'.`, code: 'invalid_status_transition' },
          'Invalid transition',
        )
      }

      const changes: Record<string, { old: unknown; new: unknown }> = {}
      if (body.status && body.status !== alert.status) {
        changes.status = { old: alert.status, new: body.status }
        alert.status = body.status
      }
      if (body.resolution !== undefined && body.resolution !== alert.resolution) {
        changes.resolution = { old: alert.resolution, new: body.resolution }
        alert.resolution = body.resolution
      }
      if (body.notes !== undefined && body.notes !== alert.notes) {
        changes.notes = { old: alert.notes, new: body.notes }
        alert.notes = body.notes
      }
      if (body.status === 'resolved') {
        alert.resolved_by = { id: user.id, username: user.username }
      }
      alert.updated_at = new Date().toISOString()

      logAudit(
        body.status === 'resolved' ? 'alert.resolved' : body.status === 'escalated' ? 'alert.escalated' : 'alert.updated',
        'alert',
        alert.id,
        changes,
        body.notes ?? null,
      )
      emit()
      return structuredClone(alert)
    },

    async stats(period = '24h', signal?: AbortSignal): Promise<AlertStats> {
      await delay(signal)
      requireUser()
      const hours = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 }[period] ?? 24
      const cutoff = Date.now() - hours * 3600_000
      const window = state.alerts.filter((a) => Date.parse(a.created_at) >= cutoff)

      const by_severity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 } as AlertStats['by_severity']
      const by_status = { new: 0, viewed: 0, resolved: 0, escalated: 0 } as AlertStats['by_status']
      const by_label: Record<string, number> = { dos: 0, probe: 0, r2l: 0, u2r: 0 }
      let resolveSecondsTotal = 0
      let resolveCount = 0

      for (const a of window) {
        by_severity[a.severity] += 1
        by_status[a.status] += 1
        if (a.predicted_label !== 'normal') by_label[a.predicted_label] += 1
        if (a.resolution) {
          resolveSecondsTotal += (Date.parse(a.updated_at) - Date.parse(a.created_at)) / 1000
          resolveCount += 1
        }
      }

      const resolved = window.filter((a) => a.resolution)
      const fp = resolved.filter((a) => a.resolution === 'false_positive').length

      return {
        period,
        total_alerts: window.length,
        by_severity,
        by_status,
        by_label,
        resolution_breakdown: {
          true_positive: resolved.length - fp,
          false_positive: fp,
        },
        false_positive_rate: resolved.length ? Number((fp / resolved.length).toFixed(2)) : 0,
        mean_time_to_resolve_seconds: resolveCount ? Math.round(resolveSecondsTotal / resolveCount) : 0,
      }
    },
  },

  models: {
    async list(signal?: AbortSignal): Promise<ModelListResponse> {
      await delay(signal)
      requireAdmin()
      return structuredClone(state.models)
    },

    async deploy(body: DeployRequest): Promise<DeployResponse> {
      await delay()
      requireAdmin()
      const existing = state.models.models.find((m) => m.version === body.version)
      const previous = state.models.active_version
      const summary = {
        accuracy: 0.902,
        precision_macro: 0.868,
        recall_macro: 0.881,
        auc_macro: 0.951,
      }
      if (existing) {
        existing.is_active = true
        existing.accuracy = summary.accuracy
        existing.auc_macro = summary.auc_macro
        existing.deployed_at = new Date().toISOString()
        existing.deployed_by = currentUser()?.username ?? 'admin'
      } else {
        state.models.models.unshift({
          version: body.version,
          is_active: true,
          model_type: 'RandomForestClassifier',
          deployed_at: new Date().toISOString(),
          deployed_by: currentUser()?.username ?? 'admin',
          dataset: 'NSL-KDD',
          accuracy: summary.accuracy,
          auc_macro: summary.auc_macro,
        })
      }
      state.models.models.forEach((m) => {
        if (m.version !== body.version) m.is_active = false
      })
      state.models.active_version = body.version
      state.drift.model_version = body.version

      logAudit('model.deployed', 'model_version', body.version, {
        active_version: { old: previous, new: body.version },
      })
      emit()

      return {
        version: body.version,
        status: 'deployed',
        previous_version: previous,
        deployed_at: new Date().toISOString(),
        metrics_summary: summary,
        message: `Model ${body.version} deployed successfully. Previous version ${previous} is available for rollback.`,
      }
    },

    async rollback(version: string) {
      await delay()
      requireAdmin()
      const target = state.models.models.find((m) => m.version === version)
      if (!target) {
        throw new ApiError(404, { detail: `Model version '${version}' not found.`, code: 'not_found' }, 'Not found')
      }
      const previous = state.models.active_version
      state.models.models.forEach((m) => {
        m.is_active = m.version === version
      })
      state.models.active_version = version
      state.drift.model_version = version
      logAudit('model.rolled_back', 'model_version', version, {
        active_version: { old: previous, new: version },
      })
      emit()
      return {
        version,
        status: 'deployed',
        previous_version: previous,
        message: `Rolled back to model ${version}.`,
      }
    },
  },

  metrics: {
    async model(signal?: AbortSignal): Promise<ModelMetricsResponse> {
      await delay(signal)
      requireUser()
      return structuredClone({
        ...MODEL_METRICS,
        confusion_matrix: { ...MODEL_METRICS.confusion_matrix, labels: [...MODEL_METRICS.confusion_matrix.labels] },
        active_model: { ...MODEL_METRICS.active_model, version: state.models.active_version },
      })
    },

    async drift(signal?: AbortSignal): Promise<DriftResponse> {
      await delay(signal)
      requireUser()
      // Nudge the live distribution as the feed keeps flowing, so the drift
      // page visibly responds to the replay running on the dashboard.
      const current = { ...state.drift.latest_snapshot.current_distribution }
      const normalDelta = rng.round((rng.next() - 0.45) * 0.004, 4)
      current.normal = Number(Math.min(0.9, Math.max(0.2, current.normal + normalDelta)).toFixed(3))
      const totalRest = 1 - current.normal
      const restTotal = CLASS_ORDER.filter((c) => c !== 'normal').reduce((s, c) => s + current[c], 0) || 1
      CLASS_ORDER.filter((c) => c !== 'normal').forEach((c) => {
        current[c] = Number(((current[c] / restTotal) * totalRest).toFixed(3))
      })
      const train = state.drift.latest_snapshot.training_distribution
      state.drift.latest_snapshot.current_distribution = current
      state.drift.latest_snapshot.deviation = Object.fromEntries(
        CLASS_ORDER.map((c) => [
          c,
          `${current[c] >= train[c] ? '+' : '-'}${Math.abs((current[c] - train[c]) * 100).toFixed(1)}%`,
        ]),
      ) as DriftResponse['latest_snapshot']['deviation']
      const score = Number(
        Math.min(
          1,
          CLASS_ORDER.reduce((s, c) => s + Math.abs(current[c] - train[c]), 0) / 2,
        ).toFixed(2),
      )
      state.drift.latest_snapshot.drift_score = score
      state.drift.drift_status = score >= 0.6 ? 'critical' : score >= 0.3 ? 'warning' : 'healthy'
      return structuredClone(state.drift)
    },

    async health(signal?: AbortSignal): Promise<HealthResponse> {
      await delay(signal)
      const active = state.models.models.find((m) => m.is_active)
      const degraded = state.replay.active && rng.next() > 0.7
      return {
        status: degraded ? 'degraded' : 'healthy',
        checks: {
          database: { status: 'up', latency_ms: rng.intBetween(1, 6) },
          redis: { status: 'up', latency_ms: rng.intBetween(0, 3) },
          celery: { status: 'up', active_workers: 2 },
          model: active
            ? { status: 'loaded', version: active.version, loaded_at: active.deployed_at }
            : { status: 'unavailable', error: 'No model loaded' },
        },
        timestamp: new Date().toISOString(),
      }
    },
  },

  audit: {
    async list(filters: AuditFilters = {}, signal?: AbortSignal): Promise<AuditResponse> {
      await delay(signal)
      requireAdmin()
      let out = state.audit
      if (filters.actor) out = out.filter((e) => e.actor?.id === filters.actor)
      if (filters.action) out = out.filter((e) => e.action.includes(filters.action as string))
      if (filters.target_type) out = out.filter((e) => e.target_type === filters.target_type)
      if (filters.created_after) {
        const t = Date.parse(filters.created_after)
        out = out.filter((e) => Date.parse(e.timestamp) >= t)
      }
      if (filters.created_before) {
        const t = Date.parse(filters.created_before)
        out = out.filter((e) => Date.parse(e.timestamp) <= t)
      }
      return { count: out.length, results: structuredClone(out.slice(0, 200)) }
    },
  },

  config: {
    async thresholds(signal?: AbortSignal): Promise<AlertThresholdConfig> {
      await delay(signal)
      requireAdmin()
      return structuredClone(state.thresholds)
    },

    async updateThresholds(body: AlertThresholdConfig) {
      await delay()
      requireAdmin()
      const before = structuredClone(state.thresholds)
      state.thresholds = structuredClone(body)
      const changes: Record<string, { old: unknown; new: unknown }> = {}
      for (const tier of Object.keys(body.severity_tiers) as Severity[]) {
        const o = before.severity_tiers[tier].min_confidence
        const n = body.severity_tiers[tier].min_confidence
        if (o !== n) changes[`severity_tiers.${tier}.min_confidence`] = { old: o, new: n }
      }
      if (before.min_confidence_to_alert !== body.min_confidence_to_alert) {
        changes.min_confidence_to_alert = {
          old: before.min_confidence_to_alert,
          new: body.min_confidence_to_alert,
        }
      }
      if (Object.keys(changes).length) {
        logAudit('config.thresholds_updated', 'config', 'alert-thresholds', changes, 'Threshold configuration updated.')
        emit()
      }
      return structuredClone(state.thresholds)
    },
  },
}

/** Wipe all mock state back to the seed (used by the "reset demo" button). */
export function resetMock(): void {
  stopReplayEngine()
  state.alerts = seedAlerts()
  state.audit = seedAudit()
  state.models = structuredClone(MODEL_LIST)
  state.thresholds = structuredClone(DEFAULT_THRESHOLD_CONFIG)
  state.drift = seedDriftHistory()
  state.tasks.clear()
  state.replay = { active: false, taskId: null, processed: 0, timer: null, config: null }
  emit()
}

export { stopReplayEngine }
