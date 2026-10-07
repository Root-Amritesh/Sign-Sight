/** Formatting helpers. All dates render in the viewer's local zone; the API is UTC. */

const NF = new Intl.NumberFormat('en-US')
const NF1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return NF.format(n)
}

/** 12_544 → "12.5k". Used where exact counts would crowd the layout. */
export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  if (Math.abs(n) < 1000) return NF.format(n)
  if (Math.abs(n) < 1_000_000) return `${NF1.format(n / 1000)}k`
  return `${NF1.format(n / 1_000_000)}M`
}

/** 0.8694 → "86.9%". Metrics are stored as fractions, not percentages. */
export function pct(fraction: number | null | undefined, dp = 1): string {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return '—'
  return `${(fraction * 100).toFixed(dp)}%`
}

/** Raw float, trimmed. For precision/recall/F1 columns where % is redundant. */
export function ratio(fraction: number | null | undefined, dp = 3): string {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return '—'
  return fraction.toFixed(dp)
}

export function dt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function timeOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(undefined, { hour12: false })
}

export function dayMonth(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1_000],
]

const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' })

/** "4m ago" / "in 12s". */
export function relTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = then - now
  const abs = Math.abs(diff)
  if (abs < 5_000) return 'just now'
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms || unit === 'second') {
      return RTF.format(Math.round(diff / ms), unit)
    }
  }
  return '—'
}

/** 180 → "3m 00s". Used for MTTR and task durations. */
export function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—'
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m < 60) return `${m}m ${String(rem).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, '0')}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

/** "a1b2c3d4-e5f6-…" → "a1b2c3d4". Keeps tables readable. */
export function shortId(id: string | null | undefined, len = 8): string {
  if (!id) return '—'
  return id.length <= len ? id : id.slice(0, len)
}

export function initials(name: string | null | undefined): string {
  if (!name) return '??'
  return name
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Converts a local `datetime-local` value to the ISO the API expects. */
export function localToIso(value: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** ISO → value for an `<input type="datetime-local">`. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}
