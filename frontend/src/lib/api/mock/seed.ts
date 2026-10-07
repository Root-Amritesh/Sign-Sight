/**
 * Deterministic seed data for the mock adapter.
 *
 * Everything here is derived from the documented pipeline: alert severities
 * are produced by the exact algorithm in ML_DATA_PIPELINE.md §7.3, and the
 * model metrics are the reference numbers from §6.3 / §9.1. So the mock is not
 * "some made up numbers" — it is the spec, executed.
 */

import type {
  Alert,
  AlertStatus,
  ClassLabel,
  ConfusionMatrix,
  DriftHistoryEntry,
  ModelListResponse,
  ProbabilityVector,
  Resolution,
  Severity,
} from '../types'

/* ═══════════════════════════════════════════════════════════════════════
   PRNG — seeded so every reload tells the same story
   ═══════════════════════════════════════════════════════════════════════ */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(0x516e47)
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]
const between = (lo: number, hi: number): number => lo + rand() * (hi - lo)
const intBetween = (lo: number, hi: number): number => Math.floor(between(lo, hi + 1))
const round = (n: number, dp = 3): number => Number(n.toFixed(dp))

/* ═══════════════════════════════════════════════════════════════════════
   Constants lifted from the docs
   ═══════════════════════════════════════════════════════════════════════ */

export const SEVERITY_ORDER: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info']
export const STATUS_ORDER: readonly AlertStatus[] = ['new', 'viewed', 'escalated', 'resolved']
export const CLASS_ORDER: readonly ClassLabel[] = ['normal', 'dos', 'probe', 'r2l', 'u2r']

/** Attack-class prior from metadata.json `training_distribution`. */
export const CLASS_PRIOR: Record<ClassLabel, number> = {
  normal: 0.533,
  dos: 0.368,
  probe: 0.074,
  r2l: 0.017,
  u2r: 0.008,
}

/** Per-class precision from §9.1 — used to shape the confidence distribution. */
const CLASS_CONFIDENCE_BAND: Record<ClassLabel, [number, number]> = {
  normal: [0.82, 0.99],
  dos: [0.68, 0.99],
  probe: [0.55, 0.95],
  r2l: [0.42, 0.9],
  u2r: [0.38, 0.86],
}

const THRESHOLDS = {
  min_confidence_to_alert: 0.4,
  normal_uncertainty_threshold: 0.7,
  severity_tiers: {
    critical: 0.95,
    high: 0.85,
    medium: 0.7,
    low: 0.5,
    info: 0.4,
  },
  attack_type_severity_boost: { u2r: 1, r2l: 1, dos: 0, probe: 0 },
} as const

/** Default threshold config served by `GET /api/config/alert-thresholds/`. */
export const DEFAULT_THRESHOLD_CONFIG = {
  min_confidence_to_alert: THRESHOLDS.min_confidence_to_alert,
  normal_uncertainty_threshold: THRESHOLDS.normal_uncertainty_threshold,
  severity_tiers: {
    critical: { min_confidence: THRESHOLDS.severity_tiers.critical },
    high: { min_confidence: THRESHOLDS.severity_tiers.high },
    medium: { min_confidence: THRESHOLDS.severity_tiers.medium },
    low: { min_confidence: THRESHOLDS.severity_tiers.low },
    info: { min_confidence: THRESHOLDS.severity_tiers.info },
  },
  attack_type_severity_boost: { ...THRESHOLDS.attack_type_severity_boost },
  notification_severities: ['critical', 'high'] as Severity[],
}

/* ═══════════════════════════════════════════════════════════════════════
   Severity engine — ML_DATA_PIPELINE.md §7.3, verbatim
   ═══════════════════════════════════════════════════════════════════════ */

export function computeSeverity(label: ClassLabel, confidence: number): Severity | null {
  // Below the alerting floor: no alert at all.
  if (confidence < THRESHOLDS.min_confidence_to_alert) return null

  // Confidently normal → not an alert at all.
  if (label === 'normal' && confidence >= THRESHOLDS.normal_uncertainty_threshold) return null

  // Uncertain "normal" → informational only.
  if (label === 'normal') return 'info'

  const tiers = SEVERITY_ORDER
  let index = tiers.findIndex((t) => confidence >= THRESHOLDS.severity_tiers[t])
  if (index === -1) index = tiers.length - 1

  // Attack-type boost moves *up* the ramp (SEVERITY_ORDER is most→least
  // severe, so a smaller index is more severe), then clamps at critical.
  index -= THRESHOLDS.attack_type_severity_boost[label] ?? 0
  index = Math.max(index, 0)

  return tiers[index]
}

/* ═══════════════════════════════════════════════════════════════════════
   Model metrics — the reference figures from §6.3
   ═══════════════════════════════════════════════════════════════════════ */

export const MODEL_METRICS = {
  active_model: {
    version: 'v3',
    deployed_at: '2026-09-26T14:00:00Z',
    model_type: 'RandomForestClassifier',
    dataset: 'NSL-KDD',
    training_date: '2026-09-26T12:00:00Z',
  },
  overall_metrics: {
    accuracy: 0.891,
    precision_macro: 0.856,
    recall_macro: 0.872,
    f1_macro: 0.858,
    fpr: 0.038,
    auc_macro: 0.945,
  },
  per_class_metrics: {
    normal: { precision: 0.958, recall: 0.941, f1: 0.949, auc: 0.972, support: 9711 },
    dos: { precision: 0.934, recall: 0.968, f1: 0.951, auc: 0.984, support: 7458 },
    probe: { precision: 0.801, recall: 0.838, f1: 0.819, auc: 0.921, support: 2421 },
    r2l: { precision: 0.478, recall: 0.531, f1: 0.503, auc: 0.769, support: 2754 },
    u2r: { precision: 0.324, recall: 0.379, f1: 0.349, auc: 0.694, support: 200 },
  },
  confusion_matrix: {
    labels: [...CLASS_ORDER],
    matrix: [
      [9127, 187, 172, 181, 44],
      [74, 7221, 88, 61, 14],
      [129, 88, 2029, 149, 26],
      [362, 178, 214, 1402, 598],
      [33, 11, 24, 47, 85],
    ],
  } satisfies ConfusionMatrix,
  class_imbalance_note:
    "R2L and U2R are severely underrepresented in NSL-KDD (2% and 1% of training data). " +
    'Per-class metrics for these classes are expectedly lower — U2R precision of 32% means roughly ' +
    'two in three U2R alerts are noise. The model trains with class_weight="balanced" to partly ' +
    'offset this, but the fundamental limit is data scarcity, not model capacity. ' +
    'Class-level precision is surfaced on every alert so analysts can calibrate their trust.',
}

export const MODEL_LIST: ModelListResponse = {
  active_version: 'v3',
  models: [
    {
      version: 'v3',
      is_active: true,
      model_type: 'RandomForestClassifier',
      deployed_at: '2026-09-26T14:00:00Z',
      deployed_by: 'admin',
      dataset: 'NSL-KDD',
      accuracy: 0.891,
      auc_macro: 0.945,
    },
    {
      version: 'v2',
      is_active: false,
      model_type: 'RandomForestClassifier',
      deployed_at: '2026-09-26T10:12:00Z',
      deployed_by: 'admin',
      dataset: 'NSL-KDD',
      accuracy: 0.869,
      auc_macro: 0.932,
    },
    {
      version: 'v1',
      is_active: false,
      model_type: 'RandomForestClassifier',
      deployed_at: '2026-09-25T19:40:00Z',
      deployed_by: 'admin',
      dataset: 'NSL-KDD',
      accuracy: 0.823,
      auc_macro: 0.891,
    },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════
   Traffic record synthesis
   ═══════════════════════════════════════════════════════════════════════ */

const SERVICES = [
  'http', 'https', 'ftp_data', 'smtp', 'ssh', 'domain_u', 'private', 'ftp', 'telnet',
  'pop_3', 'imap', 'other', 'uucp', 'bgp', 'netbios_ssn', 'irc', 'ntp', 'echo',
] as const
const FLAGS = ['SF', 'S0', 'REJ', 'RSTR', 'RSTO', 'RSTRH', 'SH', 'S1', 'S2', 'SF1', 'NONE'] as const

/** A plausible record for a given class, so the detail view reads sensibly. */
function makeTrafficRecord(label: ClassLabel, id: string, at: string) {
  const flood = label === 'dos'
  const scan = label === 'probe'
  const priv = label === 'r2l'
  const privEsc = label === 'u2r'

  return {
    id,
    ingested_at: at,
    duration: flood ? round(between(0, 0.4), 2) : priv ? round(between(38, 300), 2) : round(between(0, 12), 2),
    protocol_type: label === 'probe' ? pick(['tcp', 'udp'] as const) : label === 'dos' && rand() > 0.7 ? 'udp' : 'tcp',
    service: flood ? pick(['http', 'private', 'other'] as const)
      : scan ? pick(['other', 'private'] as const)
      : privEsc ? pick(['telnet', 'ftp', 'ssh'] as const)
      : priv ? pick(['ftp_data', 'http', 'telnet', 'other'] as const)
      : pick(SERVICES),
    flag: flood ? pick(['S0', 'REJ'] as const)
      : scan ? pick(['S0', 'REJ', 'RSTR'] as const)
      : privEsc ? pick(['SF', 'SH'] as const)
      : pick(FLAGS),
    src_bytes: flood ? intBetween(0, 40) : scan ? intBetween(0, 260) : priv ? intBetween(120, 5200) : intBetween(120, 90000),
    dst_bytes: flood ? intBetween(0, 320) : scan ? intBetween(0, 90) : privEsc ? intBetween(200, 3000) : intBetween(300, 60000),
    land: 0,
    wrong_fragment: 0,
    urgent: 0,
    hot: flood ? intBetween(0, 6) : privEsc ? intBetween(2, 10) : 0,
    num_failed_logins: priv ? intBetween(1, 9) : flood ? intBetween(2, 12) : 0,
    logged_in: priv || flood ? 0 : 1,
    num_compromised: privEsc ? intBetween(1, 4) : 0,
    root_shell: privEsc && rand() > 0.6 ? 1 : 0,
    su_attempted: privEsc && rand() > 0.5 ? 1 : 0,
    num_root: priv ? intBetween(1, 12) : 0,
    num_file_creations: privEsc ? intBetween(1, 5) : 0,
    num_shells: privEsc ? intBetween(1, 3) : 0,
    num_access_files: privEsc ? intBetween(0, 6) : 0,
    num_outbound_cmds: 0,
    is_host_login: 0,
    is_guest_login: priv ? intBetween(0, 1) : 0,
    count: flood ? intBetween(60, 260) : scan ? intBetween(1, 60) : intBetween(1, 30),
    srv_count: flood ? intBetween(40, 200) : intBetween(1, 24),
    serror_rate: flood ? round(between(0, 0.35), 3) : scan ? round(between(0.1, 0.9), 3) : round(between(0, 0.12), 3),
    srv_serror_rate: flood ? round(between(0, 0.4), 3) : round(between(0, 0.2), 3),
    rerror_rate: scan ? round(between(0.2, 0.95), 3) : round(between(0, 0.1), 3),
    srv_rerror_rate: round(between(0, 0.25), 3),
    same_srv_rate: round(rand(), 3),
    diff_srv_rate: round(rand() * (scan ? 0.9 : 0.4), 3),
    srv_diff_host_rate: round(rand() * 0.5, 3),
    dst_host_count: intBetween(1, 60),
    dst_host_srv_count: intBetween(1, 45),
    dst_host_same_srv_rate: round(rand(), 3),
    dst_host_diff_srv_rate: round(rand(), 3),
    dst_host_same_src_port_rate: round(rand() * 0.6, 3),
    dst_host_srv_diff_host_rate: round(rand() * 0.5, 3),
    dst_host_serror_rate: round(between(0, 0.4), 3),
    dst_host_srv_serror_rate: round(between(0, 0.35), 3),
    dst_host_rerror_rate: round(between(0, 0.3), 3),
    dst_host_srv_rerror_rate: round(between(0, 0.25), 3),
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Alert generation
   ═══════════════════════════════════════════════════════════════════════ */

const uuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (rand() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

function sampleClass(): ClassLabel {
  const r = rand()
  let acc = 0
  for (const cls of CLASS_ORDER) {
    acc += CLASS_PRIOR[cls]
    if (r <= acc) return cls
  }
  return 'normal'
}

const RESOLUTION_NOTES: Record<Resolution, string[]> = {
  true_positive: [
    'Confirmed SYN flood against the edge firewall. Escalated to netops for rate-limit tuning.',
    'Matched a known sweep pattern across three hosts. Blocked at the switch by the on-call engineer.',
    'Successful privilege escalation on the jump box. Host isolated and reimaged.',
    'Credential stuffing burst from a single ASN. WAF rule pushed, passwords rotated.',
    'Confirmed buffer overflow attempt against the legacy service. Patch scheduled.',
  ],
  false_positive: [
    'Legitimate nightly backup job. Whitelisted the source host.',
    'Vulnerability scanner runbook — approved monthly scan, not an incident.',
    'Monitoring probe from the internal collector. Added to allowlist.',
    'Load test from the performance team. Confirmed against the change calendar.',
    'Service mesh sidecar health check traffic. No action required.',
  ],
}

const ESCALATION_NOTES = [
  'Pattern is consistent with lateral movement. Handing to the incident response team.',
  'Second occurrence in 30 minutes from the same subnet. Possible persistent access.',
  'Model confidence is high but the vector looks novel — needs a human signature write-up.',
  'Possible APT activity. Escalating for out-of-band review.',
]

/** Status mix for already-triaged history: mostly resolved, a live tail of new. */
function sampleStatus(ageHours: number): AlertStatus {
  if (ageHours < 0.5) return rand() > 0.35 ? 'new' : 'viewed'
  if (ageHours < 2) {
    const r = rand()
    if (r < 0.42) return 'new'
    if (r < 0.72) return 'viewed'
    if (r < 0.9) return 'resolved'
    return 'escalated'
  }
  const r = rand()
  if (r < 0.08) return 'viewed'
  if (r < 0.14) return 'escalated'
  return 'resolved'
}

function buildProbabilities(label: ClassLabel, top: number): ProbabilityVector {
  const rest = CLASS_ORDER.filter((c) => c !== label)
  const remaining = Math.max(0, 1 - top)
  // Dirichlet-ish: random weights over the remaining mass, normalised.
  const weights = rest.map(() => rand() ** 1.6)
  const total = weights.reduce((a, b) => a + b, 0) || 1
  const out = {} as ProbabilityVector
  out[label] = top
  rest.forEach((c, i) => {
    out[c] = round((weights[i] / total) * remaining, 4)
  })
  return out
}

function makeAlert(now: number, index: number): Alert {
  // Newest first: spread across the last 24h with a mild density curve.
  const ageHours = 24 * (1 - Math.pow(index / 640, 0.72))
  const created = new Date(now - ageHours * 3600_000 - intBetween(0, 90_000))
  const label = sampleClass()
  const [lo, hi] = CLASS_CONFIDENCE_BAND[label]
  const confidence = round(between(lo, hi), 3)
  const severity = computeSeverity(label, confidence) ?? 'info'
  const status = sampleStatus(ageHours)
  const resolved = status === 'resolved'
  const escalated = status === 'escalated'
  // False positives concentrate in the classes the model is weakest on.
  const fpBias = label === 'u2r' ? 0.62 : label === 'r2l' ? 0.44 : label === 'probe' ? 0.18 : 0.09
  const resolution: Resolution | null = resolved ? (rand() < fpBias ? 'false_positive' : 'true_positive') : null
  const id = uuid()
  const modelVersion = rand() < 0.82 ? 'v3' : rand() < 0.6 ? 'v2' : 'v1'

  const notes = resolution
    ? pick(RESOLUTION_NOTES[resolution])
    : escalated
      ? pick(ESCALATION_NOTES)
      : null

  const humanLabel = label === 'normal' ? 'normal traffic' : label.toUpperCase()
  return {
    id,
    created_at: created.toISOString(),
    updated_at: resolved || escalated
      ? new Date(created.getTime() + intBetween(45, 900) * 1000).toISOString()
      : created.toISOString(),
    severity,
    status,
    resolution,
    predicted_label: label,
    confidence,
    probabilities: buildProbabilities(label, confidence),
    model_version: modelVersion,
    notes,
    resolved_by: resolved ? { id: 1, username: 'analyst_1' } : null,
    recommendation: `Investigate — predicted ${humanLabel} at ${Math.round(confidence * 100)}% confidence. No enforcement action is taken automatically.`,
    traffic_record: makeTrafficRecord(label, uuid(), created.toISOString()),
    // NSL-KDD carries no addressing; these stay null by design (D6 §8.1).
    source_ip: null,
    dest_ip: null,
    source_port: null,
    dest_port: null,
  }
}

export function seedAlerts(count = 640, now = Date.now()): Alert[] {
  return Array.from({ length: count }, (_, i) => makeAlert(now, i))
}

/* ═══════════════════════════════════════════════════════════════════════
   Drift history — ML_DATA_PIPELINE.md §9.2
   ═══════════════════════════════════════════════════════════════════════ */

const HOURS_24 = 3600_000

export function seedDriftHistory(now = Date.now()) {
  const history: DriftHistoryEntry[] = Array.from({ length: 13 }, (_, i) => {
    const t = new Date(now - (12 - i) * 2 * HOURS_24)
    // A slow upward creep that crosses the warning threshold about 2h ago.
    const score = round(Math.max(0.04, 0.09 + i * 0.022 + rand() * 0.03), 2)
    const status: DriftHistoryEntry['status'] = score >= 0.6 ? 'critical' : score >= 0.3 ? 'warning' : 'healthy'
    return { timestamp: t.toISOString(), drift_score: score, status }
  })

  const last = history[history.length - 1]

  return {
    model_version: 'v3',
    drift_status: last.status,
    latest_snapshot: {
      timestamp: new Date(now).toISOString(),
      drift_score: last.drift_score,
      warning_threshold: 0.3,
      critical_threshold: 0.6,
      training_distribution: { ...CLASS_PRIOR },
      current_distribution: {
        normal: 0.612,
        dos: 0.298,
        probe: 0.055,
        r2l: 0.025,
        u2r: 0.01,
      },
      deviation: {
        normal: '+7.9%',
        dos: '-7.0%',
        probe: '-1.9%',
        r2l: '+0.8%',
        u2r: '+0.2%',
      },
    },
    history,
    recommendation:
      'Prediction distribution has shifted from the training baseline. Normal traffic share is up 7.9% and DoS is down 7.0% — consistent with a change in mix rather than a change in behaviour. Continue serving predictions and monitor for two more cycles before retraining. This signal is a distribution comparison only; it cannot prove the model is making more mistakes.',
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Audit trail
   ═══════════════════════════════════════════════════════════════════════ */

export interface SeedAuditEntry {
  id: number
  timestamp: string
  actor: { id: number; username: string } | null
  action: string
  target_type: string
  target_id: string
  changes: Record<string, { old: unknown; new: unknown }>
  notes: string | null
}

const ACTORS = [
  { id: 1, username: 'analyst_1' },
  { id: 2, username: 'analyst_2' },
  { id: 3, username: 'admin' },
]

export function seedAudit(count = 220, now = Date.now()): SeedAuditEntry[] {
  const kinds: Array<{ action: string; target: string; changes: (i: number) => Record<string, { old: unknown; new: unknown }>; notes: string[] }> = [
    {
      action: 'alert.resolved',
      target: 'alert',
      changes: (i) => ({
        status: { old: 'viewed', new: 'resolved' },
        resolution: { old: null, new: i % 4 === 0 ? 'false_positive' : 'true_positive' },
      }),
      notes: [
        'Confirmed SYN flood. Source appears to be a botnet C2 node.',
        'Scanner runbook. Approved activity, not an incident.',
        'Privilege escalation confirmed. Host isolated and queued for reimage.',
        'Backup job misclassified. Whitelisted source host in the allowlist.',
        null as unknown as string,
      ],
    },
    {
      action: 'alert.escalated',
      target: 'alert',
      changes: () => ({ status: { old: 'viewed', new: 'escalated' } }),
      notes: ['Possible lateral movement. Handing to incident response.', 'Novel vector — needs signature write-up.'],
    },
    {
      action: 'alert.viewed',
      target: 'alert',
      changes: () => ({ status: { old: 'new', new: 'viewed' } }),
      notes: [null as unknown as string],
    },
    {
      action: 'model.deployed',
      target: 'model_version',
      changes: (i) => ({ active_version: { old: i % 2 ? 'v2' : 'v1', new: 'v3' } }),
      notes: ['Model v3 deployed successfully. Previous version is available for rollback.'],
    },
    {
      action: 'config.thresholds_updated',
      target: 'config',
      changes: () => ({
        'severity_tiers.critical.min_confidence': { old: 0.94, new: 0.95 },
        'severity_tiers.high.min_confidence': { old: 0.84, new: 0.85 },
      }),
      notes: ['Tightened critical/high thresholds after analyst feedback on alert volume.'],
    },
    {
      action: 'auth.login',
      target: 'user',
      changes: () => ({}),
      notes: [null as unknown as string],
    },
  ]

  return Array.from({ length: count }, (_, i) => {
    const kind = kinds[Math.floor(Math.pow(rand(), 1.7) * kinds.length)]
    const actor = pick(ACTORS)
    const at = new Date(now - i * intBetween(90, 900) * 1000 - intBetween(0, 60_000))
    return {
      id: count - i,
      timestamp: at.toISOString(),
      actor: kind.action.startsWith('auth.') ? actor : kind.target === 'config' || kind.target === 'model_version' ? { id: 3, username: 'admin' } : actor,
      action: kind.action,
      target_type: kind.target,
      target_id: kind.target === 'user' ? String(actor.id) : uuid(),
      changes: kind.changes(i),
      notes: kind.notes[Math.floor(rand() * kind.notes.length)] ?? null,
    }
  })
}

/* ═══════════════════════════════════════════════════════════════════════
   Demo users
   ═══════════════════════════════════════════════════════════════════════ */

export const DEMO_USERS = {
  analyst_1: { password: 'analyst_pass_123', user: { id: 1, username: 'analyst_1', email: 'analyst1@example.com', role: 'analyst' as const } },
  admin: { password: 'admin_pass_123', user: { id: 3, username: 'admin', email: 'admin@example.com', role: 'admin' as const } },
}

/** Exports for the mock module to mint fresh alerts during a replay. */
export const rng = { next: rand, between, intBetween, pick, round, uuid, sampleClass, CLASS_CONFIDENCE_BAND }
