/**
 * Display metadata for the three enums that drive every visual decision:
 * severity, alert status, and model class. Keeping the colour mapping in one
 * place is what stops the dashboard from drifting into seven different reds.
 */

import type { AlertStatus, ClassLabel, Resolution, Severity } from './api'

/* ── Severity ─────────────────────────────────────────────────────── */

export interface Tone {
  label: string
  color: string
  /** CSS custom property for the soft background wash. */
  wash: string
}

export const SEVERITY_ORDER: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info']

export const SEVERITY: Record<Severity, Tone & { short: string; rank: number; notify: boolean }> = {
  critical: {
    label: 'Critical',
    short: 'CRIT',
    color: 'var(--sev-critical)',
    wash: 'var(--sev-critical-soft)',
    rank: 0,
    notify: true,
  },
  high: {
    label: 'High',
    short: 'HIGH',
    color: 'var(--sev-high)',
    wash: 'var(--sev-high-soft)',
    rank: 1,
    notify: true,
  },
  medium: {
    label: 'Medium',
    short: 'MED',
    color: 'var(--sev-medium)',
    wash: 'var(--sev-medium-soft)',
    rank: 2,
    notify: false,
  },
  low: {
    label: 'Low',
    short: 'LOW',
    color: 'var(--sev-low)',
    wash: 'var(--sev-low-soft)',
    rank: 3,
    notify: false,
  },
  info: {
    label: 'Info',
    short: 'INFO',
    color: 'var(--sev-info)',
    wash: 'var(--sev-info-soft)',
    rank: 4,
    notify: false,
  },
}

export const severityTone = (s: Severity) => SEVERITY[s] ?? SEVERITY.info

/* ── Status ───────────────────────────────────────────────────────── */

export const STATUS_ORDER: readonly AlertStatus[] = ['new', 'viewed', 'escalated', 'resolved']

export const STATUS: Record<AlertStatus, Tone> = {
  new: { label: 'New', color: 'var(--cyan)', wash: 'var(--cyan-soft)' },
  viewed: { label: 'Viewed', color: 'var(--violet)', wash: 'var(--violet-soft)' },
  escalated: { label: 'Escalated', color: 'var(--sev-high)', wash: 'var(--sev-high-soft)' },
  resolved: { label: 'Resolved', color: 'var(--ok)', wash: 'var(--ok-soft)' },
}

export const statusTone = (s: AlertStatus) => STATUS[s] ?? STATUS.new

/** Allowed transitions — API_SPEC.md, "Allowed status transitions". */
export const TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  new: ['viewed', 'resolved', 'escalated'],
  viewed: ['resolved', 'escalated'],
  escalated: ['resolved'],
  resolved: [],
}

export const RESOLUTION: Record<Resolution, { label: string; tone: Tone; glyph: string }> = {
  true_positive: {
    label: 'True positive',
    glyph: '✓',
    tone: { label: 'TP', color: 'var(--danger)', wash: 'var(--sev-critical-soft)' },
  },
  false_positive: {
    label: 'False positive',
    glyph: '✕',
    tone: { label: 'FP', color: 'var(--ink-faint)', wash: 'var(--sev-info-soft)' },
  },
}

/* ── Model classes ────────────────────────────────────────────────── */

export const CLASS_ORDER: readonly ClassLabel[] = ['normal', 'dos', 'probe', 'r2l', 'u2r']

export interface ClassInfo {
  label: string
  color: string
  /** What this class actually is, in SOC language. */
  blurb: string
  /** Plain-language examples from ML_DATA_PIPELINE.md §2.4. */
  examples: string
}

export const CLASS: Record<ClassLabel, ClassInfo> = {
  normal: {
    label: 'Normal',
    color: 'var(--class-normal)',
    blurb: 'Baseline traffic that matches the learned profile.',
    examples: 'regular browsing, mail, DNS, authenticated logins',
  },
  dos: {
    label: 'DoS',
    color: 'var(--class-dos)',
    blurb: 'Denial of service — connection floods and volumetric abuse.',
    examples: 'neptune, smurf, back, teardrop, pod',
  },
  probe: {
    label: 'Probe',
    color: 'var(--class-probe)',
    blurb: 'Reconnaissance — port and host sweeps from outside.',
    examples: 'portsweep, satan, ipsweep, nmap',
  },
  r2l: {
    label: 'R2L',
    color: 'var(--class-r2l)',
    blurb: 'Remote-to-local — credential theft and remote shell access.',
    examples: 'warezclient, guess_passwd, warezmaster',
  },
  u2r: {
    label: 'U2R',
    color: 'var(--class-u2r)',
    blurb: 'User-to-root — privilege escalation on a foothold.',
    examples: 'buffer_overflow, rootkit, loadmodule, perl',
  },
}

export const classInfo = (c: string) =>
  CLASS[c as ClassLabel] ?? { label: c, color: 'var(--ink-faint)', blurb: '', examples: '' }

/* ── Ordering options for the alerts table ────────────────────────── */

export interface OrderingOption {
  value: string
  label: string
}

export const ORDERINGS: OrderingOption[] = [
  { value: '-severity,-created_at', label: 'Severity, newest first' },
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: '-confidence', label: 'Highest confidence' },
  { value: 'confidence', label: 'Lowest confidence' },
  { value: 'status,-created_at', label: 'Status, then newest' },
]
