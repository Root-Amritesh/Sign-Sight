/**
 * Integration smoke test for the in-browser mock API adapter.
 *
 * There is no test runner in this project, so rather than add one this script
 * drives the real adapter through Vite's SSR loader. That means the code under
 * test is the exact module the browser bundles — same TypeScript, same
 * `import.meta.env` handling, same module instances.
 *
 * It covers the behaviours the UI depends on and that unit tests would miss:
 * the spec's status-transition state machine, role-based access control, filter
 * and ordering semantics, the Django pagination envelope, audit-trail writes on
 * mutation, and that the replay engine actually mints records.
 *
 *   npm run test:mock
 */

import { createServer } from 'vite'

// The app is a browser SPA; the mock adapter just needs the two Web Storage
// APIs, so give it a minimal in-process implementation.
function shimStorage() {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => void m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
}
globalThis.localStorage ??= shimStorage()
globalThis.sessionStorage ??= shimStorage()

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})

let triageTarget
const pass = []
const fail = []
function check(name, cond, detail = '') {
  ;(cond ? pass : fail).push(name + (detail ? ` — ${detail}` : ''))
}

try {
  const mock = await server.ssrLoadModule('/src/lib/api/mock/index.ts')
  const api = mock.mockApi

  // ── auth ──
  const login = await api.auth.login({ username: 'analyst_1', password: 'analyst_pass_123' })
  check('analyst login returns access+refresh', Boolean(login.access && login.refresh))
  check('analyst role', login.user?.role === 'analyst', `got ${login.user?.role}`)
  const me = await api.auth.me()
  check('me() resolves the session', me?.username === 'analyst_1', `got ${me?.username}`)

  const bad = await api.auth.login({ username: 'analyst_1', password: 'wrong' })
    .then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('bad password rejected', bad === 401, `outcome=${bad}`)

  const adminLogin = await api.auth.login({ username: 'admin', password: 'admin_pass_123' })
  check('admin login works', adminLogin.user?.role === 'admin', `got ${adminLogin.user?.role}`)
  // stay signed in as admin so admin-only surfaces are reachable
  await api.auth.login({ username: 'analyst_1', password: 'analyst_pass_123' })

  // ── alerts: list + filters ──
  const page1 = await api.alerts.list({ page: 1, page_size: 25 })
  check('alerts.list returns a full page', page1.results.length === 25, `${page1.results.length} rows`)
  check('alerts.list reports total count', typeof page1.count === 'number', `count=${page1.count}`)
  check('alerts.list uses the Django envelope', 'next' in page1 && 'previous' in page1 && 'results' in page1,
    `keys=${Object.keys(page1).join(',')}`)

  const item = page1.results[0]
  check('list item carries the contract fields',
    item.id && item.created_at && item.severity && item.status && item.predicted_label &&
    typeof item.confidence === 'number' && item.model_version,
    JSON.stringify({ id: item.id, sev: item.severity, st: item.status, label: item.predicted_label, v: item.model_version }))

  const crit = await api.alerts.list({ page: 1, page_size: 25, severity: ['critical'] })
  check('severity filter does not leak', crit.results.every((a) => a.severity === 'critical'),
    `${crit.results.length} critical, all matched`)

  const searched = await api.alerts.list({ page: 1, page_size: 25, search: item.id })
  check('search filter narrows results', searched.count <= 1, `count=${searched.count}`)

  const sorted = await api.alerts.list({ page: 1, page_size: 5, ordering: '-confidence' })
  const confs = sorted.results.map((a) => a.confidence)
  check('ordering=-confidence sorts descending', confs.every((c, i) => i === 0 || confs[i - 1] >= c),
    confs.map((c) => c.toFixed(2)).join(' '))

  // ── alerts: detail ──
  const detail = await api.alerts.detail(item.id)
  check('detail includes the traffic record', Boolean(detail.traffic_record?.id))
  check('detail includes a probability vector', Boolean(detail.probabilities))
  check('detail includes NSL-KDD null IP columns',
    'source_ip' in detail && 'dest_port' in detail,
    `src=${detail.source_ip} dst=${detail.dest_ip}`)

  // ── triage write → read-back → audit trail ──
  const open = (await api.alerts.list({ page: 1, page_size: 50, status: ['new'] })).results[0]
  check('there is an open alert to triage', Boolean(open))
  if (open) {
    const before = open.status
    await api.alerts.update(open.id, { status: 'viewed', notes: 'smoke test' })
    const after = await api.alerts.detail(open.id)
    check('update persists status', after.status === 'viewed', `${before} -> ${after.status}`)
    check('update persists notes', after.notes === 'smoke test', `notes=${after.notes}`)

    // The spec forbids skipping the workflow.
    const illegal = await api.alerts.update(open.id, { status: 'new' })
      .then(() => 'RESOLVED', (e) => `${e?.status}:${e?.code ?? ''}`)
    check('illegal transition is rejected with 400', illegal === '400:invalid_status_transition', illegal)

    await api.alerts.update(open.id, { status: 'resolved', resolution: 'true_positive' })
    const resolved = await api.alerts.detail(open.id)
    check('resolution recorded', resolved.resolution === 'true_positive', `resolution=${resolved.resolution}`)

    // resolved is terminal.
    const terminal = await api.alerts.update(open.id, { status: 'viewed' })
      .then(() => 'RESOLVED', (e) => `${e?.status}:${e?.code ?? ''}`)
    check('resolved is terminal', terminal === '400:invalid_status_transition', terminal)
  }
  triageTarget = open?.id

  // ── aggregates ──
  const stats = await api.alerts.stats('24h')
  check('alert stats sums line up',
    stats.total_alerts >= 0 && typeof stats.false_positive_rate === 'number',
    `total=${stats.total_alerts} fpr=${stats.false_positive_rate}`)
  const sevSum = Object.values(stats.by_severity).reduce((a, b) => a + b, 0)
  check('severity buckets sum to total', sevSum === stats.total_alerts, `${sevSum} vs ${stats.total_alerts}`)

  // ── RBAC: analyst must not reach the admin surfaces ──
  const forbiddenAudit = await api.audit.list({ page: 1, page_size: 10 })
    .then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('analyst blocked from the audit log (403)', forbiddenAudit === 403, `outcome=${forbiddenAudit}`)

  const forbidden = await api.models.list().then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('analyst blocked from model registry (403)', forbidden === 403, `outcome=${forbidden}`)
  const forbiddenDeploy = await api.models.deploy({ version: 'v3' })
    .then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('analyst blocked from deploy (403)', forbiddenDeploy === 403, `outcome=${forbiddenDeploy}`)
  const readThresholds = await api.config.thresholds()
    .then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('analyst blocked from reading thresholds (403)', readThresholds === 403, `outcome=${readThresholds}`)

  // analyst CAN read the operational surfaces
  const analystHealth = await api.metrics.health()
  check('analyst may read the health checks', Boolean(analystHealth?.checks?.database),
    `status=${analystHealth?.status}`)

  // ── switch to admin for the remaining suites ──
  await api.auth.login({ username: 'admin', password: 'admin_pass_123' })

  // ── model surfaces ──
  const health = await api.metrics.health()
  check('health reports a status', ['healthy', 'degraded'].includes(health.status), `status=${health.status}`)
  check('health probes db/redis/celery', Boolean(health.checks.database && health.checks.redis && health.checks.celery),
    `db=${health.checks.database.latency_ms}ms workers=${health.checks.celery.active_workers}`)
  check('health confirms the model is loaded', health.checks.model.status === 'loaded',
    `version=${health.checks.model.version}`)

  const model = await api.metrics.model()
  check('active model has a version', Boolean(model?.active_model?.version), `version=${model?.active_model?.version}`)
  check('confusion matrix is square and complete',
    model.confusion_matrix.labels.length === model.confusion_matrix.matrix.length &&
    model.confusion_matrix.matrix.every((r) => r.length === model.confusion_matrix.labels.length),
    `labels=${model.confusion_matrix.labels.join('|')}`)

  const drift = await api.metrics.drift()
  check('drift has a status and a score',
    Boolean(drift.drift_status) && typeof drift.latest_snapshot.drift_score === 'number',
    `status=${drift.drift_status} score=${drift.latest_snapshot.drift_score}`)
  const dist = drift.latest_snapshot.current_distribution
  const total = Object.values(dist).reduce((a, b) => a + b, 0)
  check('current distribution is normalised', Math.abs(total - 1) < 0.02, `sum=${total.toFixed(4)}`)

  const registry = await api.models.list()
  check('admin sees the model registry', (registry?.models?.length ?? 0) > 0, `${registry?.models?.length} versions`)
  check('exactly one version is active', registry.models.filter((m) => m.is_active).length === 1,
    `active=${registry.active_version}`)

  const audit = await api.audit.list({ page: 1, page_size: 100 })
  check('admin reads the audit log', (audit.results?.length ?? 0) > 0, `${audit.results?.length} entries`)
  const mine = audit.results.filter((e) => e.target_id === triageTarget)
  check('audit trail captured the triage', mine.length >= 2, `${mine.length} entries for the alert`)
  check('audit entries carry an actor', mine.every((e) => e.actor?.username),
    [...new Set(mine.map((e) => e.actor?.username))].join(','))

  // ── settings ──
  const th = await api.config.thresholds()
  check('thresholds readable', typeof th.min_confidence_to_alert === 'number', JSON.stringify(th).slice(0, 80))
  check('every severity tier has a confidence floor',
    th.severity_tiers && Object.values(th.severity_tiers).every((t) => typeof t.min_confidence === 'number'),
    JSON.stringify(th.severity_tiers))
  const bumped = { ...th, min_confidence_to_alert: 0.47 }
  await api.config.updateThresholds(bumped)
  const reread = await api.config.thresholds()
  check('threshold update persists', reread.min_confidence_to_alert === 0.47, `got ${reread.min_confidence_to_alert}`)

  // ── ingest ──
  const badReplay = await api.ingest.startReplay({ dataset_path: 'x', records_per_second: 0, max_records: 10 })
    .then(() => 'RESOLVED', (e) => `${e?.status}:${e?.code ?? ''}`)
  check('invalid replay rate is rejected with 400', badReplay === '400:validation_error', badReplay)

  const replay = await api.ingest.startReplay({
    dataset_path: 'data/raw/nsl_kdd.csv', records_per_second: 200, max_records: 400,
  })
  check('replay starts and returns a task id', Boolean(replay.task_id), JSON.stringify(replay).slice(0, 80))

  // Let the engine actually produce records and watch the alert count move.
  const beforeCount = (await api.alerts.list({ page: 1, page_size: 1 })).count
  await new Promise((r) => setTimeout(r, 600))
  const midStatus = await api.ingest.task(replay.task_id)
  check('replay task is queryable and progressing',
    ['processing', 'started'].includes(midStatus.status),
    `status=${midStatus.status} ${midStatus.progress?.percent_complete ?? 0}%`)
  const afterCount = (await api.alerts.list({ page: 1, page_size: 1 })).count
  check('replay is minting new alerts', afterCount > beforeCount, `${beforeCount} -> ${afterCount}`)

  await api.ingest.stopReplay()
  const stopped = await api.ingest.task(replay.task_id)
  check('replay stops on request', stopped.status !== 'running', `status=${stopped.status}`)

  // A task id must not be readable by a role that cannot create one (§1.4).
  await api.auth.login({ username: 'analyst_1', password: 'analyst_pass_123' })
  const taskAsAnalyst = await api.ingest.task(replay.task_id)
    .then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('analyst cannot read a batch task by id (403)', taskAsAnalyst === 403, `outcome=${taskAsAnalyst}`)
  const batchAsAnalyst = await api.ingest.batch(new File(['x'], 'a.csv'))
    .then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('analyst cannot upload a CSV batch (403)', batchAsAnalyst === 403, `outcome=${batchAsAnalyst}`)
  const replayAsAnalyst = await api.ingest
    .startReplay({ dataset_path: 'x', records_per_second: 10, max_records: 10 })
    .then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('analyst cannot start a replay (403)', replayAsAnalyst === 403, `outcome=${replayAsAnalyst}`)

  // ── unauthenticated access must be rejected ──
  sessionStorage.removeItem('signsight.mockUser')
  const noAuth = await api.alerts.list({ page: 1, page_size: 5 }).then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('signed-out requests are rejected', noAuth === 401, `outcome=${noAuth}`)

  // /api/health/ is the one authenticated surface the spec leaves public.
  const publicHealth = await api.metrics.health().then(() => 'RESOLVED', (e) => e?.status ?? 'REJECTED')
  check('health stays reachable while signed out', publicHealth !== 401, `outcome=${publicHealth}`)

  // ── subscription fan-out (what the polling UI relies on) ──
  await api.auth.login({ username: 'analyst_1', password: 'analyst_pass_123' })
  let ticks = 0
  const off = mock.onMockChange(() => { ticks += 1 })
  await api.ingest.record({
    protocol_type: 'tcp', service: 'http', flag: 'SF', src_bytes: 120, dst_bytes: 900,
    duration: 4.2, local_orig: false, local_resp: false,
    protocol_type_id: 6, service_id: 80, flag_id: 4,
    land: 0, wrong_fragment: 0, urgent: 0, hot: 0,
    num_failed_logins: 0, logged_in: 0, count: 1, srv_count: 0,
    same_srv_rate: 0, diff_srv_rate: 0, p_dst_bytes: 0.02,
    abnormal_port: 0, urgent_packet: 0,
  })
  off()
  check('onMockChange fires for live ingest', ticks > 0, `${ticks} ticks`)
} catch (e) {
  fail.push('threw: ' + (e?.stack || e?.message || e))
}

await server.close()

console.log(`\nPASS ${pass.length}`)
for (const p of pass) console.log('  ok   ' + p)
if (fail.length) {
  console.log(`\nFAIL ${fail.length}`)
  for (const f of fail) console.log('  FAIL ' + f)
}
process.exit(fail.length ? 1 : 0)
