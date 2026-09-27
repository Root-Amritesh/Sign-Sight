/**
 * SVG chart kit.
 *
 * Hand-rolled rather than a charting library: the shapes needed are few
 * (gauge, area, radar, donut), the aesthetic is custom, and the payload is
 * small. All of them are pure SVG driven by CSS custom properties, so they
 * inherit the theme and cost no runtime.
 */

import { useId, type ReactNode } from 'react'

/* ═══════════════════════════════════════════════════════════════════════
   Arc gauge — drift score, FPR, precision
   ═══════════════════════════════════════════════════════════════════════ */

interface GaugeProps {
  value: number
  min?: number
  max?: number
  size?: number
  label?: string
  valueLabel?: string
  /** Optional threshold ticks drawn along the arc. */
  thresholds?: Array<{ at: number; label?: string; color: string }>
  color?: string
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string {
  const start = polar(cx, cy, r, toDeg)
  const end = polar(cx, cy, r, fromDeg)
  const large = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

export function Gauge({
  value,
  min = 0,
  max = 1,
  size = 168,
  label,
  valueLabel,
  thresholds = [],
  color = 'var(--cyan)',
}: GaugeProps) {
  const id = useId()
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 16
  const stroke = 9
  const span = (v: number) => ((v - min) / (max - min)) * 180

  const clamped = Math.max(min, Math.min(max, value))
  const pctDeg = span(clamped)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
      <svg width={size} height={size * 0.68} viewBox={`0 0 ${size} ${size * 0.68}`} role="img" aria-label={`${label ?? 'gauge'} ${valueLabel ?? clamped}`}>
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>

        {/* track */}
        <path
          d={arcPath(cx, cy, r, 0, 180)}
          fill="none"
          stroke="rgba(120,160,200,0.13)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* value */}
        {pctDeg > 0.5 && (
          <path
            d={arcPath(cx, cy, r, 0, pctDeg)}
            fill="none"
            stroke={`url(#g-${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        )}

        {/* threshold ticks */}
        {thresholds.map((t, i) => {
          const deg = span(t.at)
          const outer = polar(cx, cy, r + stroke / 2 + 2, deg)
          const inner = polar(cx, cy, r + stroke / 2 + 7, deg)
          return (
            <line
              key={i}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              stroke={t.color}
              strokeWidth={1.5}
              opacity={0.85}
            />
          )
        })}

        {/* needle */}
        {pctDeg > 0.5 && (
          <line
            x1={cx}
            y1={cy}
            x2={polar(cx, cy, r - 2, pctDeg).x}
            y2={polar(cx, cy, r - 2, pctDeg).y}
            stroke={color}
            strokeWidth={1.5}
            opacity={0.9}
          />
        )}
        <circle cx={cx} cy={cy} r={2.5} fill={color} />

        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="var(--ink)"
          style={{ font: '600 22px var(--font-mono)', letterSpacing: '-0.02em' }}
        >
          {valueLabel ?? clamped.toFixed(2)}
        </text>
        {label && (
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill="var(--ink-faint)"
            style={{ font: '500 8px var(--font-mono)', letterSpacing: '0.16em' }}
          >
            {label.toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Area chart with threshold bands — drift history
   ═══════════════════════════════════════════════════════════════════════ */

export interface AreaPoint {
  label: string
  value: number
  sublabel?: string
}

interface AreaChartProps {
  data: AreaPoint[]
  height?: number
  min?: number
  max?: number
  color?: string
  /** Horizontal reference lines, e.g. warning / critical drift thresholds. */
  bands?: Array<{ at: number; color: string; label?: string }>
  yFormat?: (v: number) => string
}

export function AreaChart({
  data,
  height = 180,
  min,
  max,
  color = 'var(--cyan)',
  bands = [],
  yFormat = (v) => v.toFixed(2),
}: AreaChartProps) {
  const id = useId()
  if (data.length === 0) return null

  const W = 640
  const H = height
  const padL = 34
  const padR = 10
  const padT = 12
  const padB = 22

  const values = data.map((d) => d.value)
  const lo = min ?? Math.min(0, ...values)
  const hi = max ?? Math.max(...values, 0.7)
  const span = hi - lo || 1

  const x = (i: number) => padL + (i / Math.max(1, data.length - 1)) * (W - padL - padR)
  const y = (v: number) => padT + (1 - (v - lo) / span) * (H - padT - padB)

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${H - padB} L ${x(0).toFixed(1)} ${H - padB} Z`

  const ticks = [lo, lo + span / 2, hi]

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ overflow: 'visible' }} role="img" aria-label="trend">
        <defs>
          <linearGradient id={`a-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.34" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* threshold bands sit behind everything */}
        {bands.map((b, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(b.at)}
              y2={y(b.at)}
              stroke={b.color}
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.6}
            />
            {b.label && (
              <text x={padL + 2} y={y(b.at) - 4} fill={b.color} opacity={0.9} style={{ font: '500 8px var(--font-mono)', letterSpacing: '0.12em' }}>
                {b.label.toUpperCase()}
              </text>
            )}
          </g>
        ))}

        {/* horizontal grid */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(120,160,200,0.1)" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fill="var(--ink-ghost)" style={{ font: '400 8px var(--font-mono)' }}>
              {yFormat(t)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#a-${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />

        {/* points + labels, thinned out so they never collide */}
        {data.map((d, i) => {
          const thin = data.length > 9 && i % 2 === 1 && i !== data.length - 1
          return (
            <g key={i}>
              <circle cx={x(i)} cy={y(d.value)} r={2} fill={color} />
              {!thin && (
                <text
                  x={x(i)}
                  y={H - 6}
                  textAnchor="middle"
                  fill="var(--ink-ghost)"
                  style={{ font: '400 8px var(--font-mono)' }}
                >
                  {d.sublabel ?? d.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Radar — per-class precision / recall / F1
   ═══════════════════════════════════════════════════════════════════════ */

export interface RadarSeries {
  label: string
  color: string
  values: number[]
}

interface RadarProps {
  axes: string[]
  series: RadarSeries[]
  size?: number
  min?: number
  max?: number
}

export function Radar({ axes, series, size = 300, min = 0, max = 1 }: RadarProps) {
  const id = useId()
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 38
  const n = axes.length
  if (n < 3) return null

  const pointAt = (i: number, v: number) => {
    const deg = (i / n) * 360
    const norm = (v - min) / (max - min || 1)
    const clamped = Math.max(0, Math.min(1, norm))
    return polar(cx, cy, r * clamped, deg)
  }

  const ringPath = (frac: number) =>
    axes
      .map((_, i) => {
        const p = polar(cx, cy, r * frac, (i / n) * 360)
        return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      })
      .join(' ') + ' Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="per-class performance">
      <defs>
        <radialGradient id={`r-${id}`}>
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <path key={f} d={ringPath(f)} fill="none" stroke="rgba(120,160,200,0.12)" strokeWidth={1} />
      ))}

      {/* spokes */}
      {axes.map((_, i) => {
        const p = polar(cx, cy, r, (i / n) * 360)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(120,160,200,0.1)" strokeWidth={1} />
      })}

      {/* axis labels */}
      {axes.map((a, i) => {
        const p = polar(cx, cy, r + 22, (i / n) * 360)
        return (
          <text
            key={a}
            x={p.x}
            y={p.y + 3}
            textAnchor={Math.abs(p.x - cx) < 6 ? 'middle' : p.x > cx ? 'start' : 'end'}
            fill="var(--ink-faint)"
            style={{ font: '500 9px var(--font-mono)', letterSpacing: '0.1em' }}
          >
            {a.toUpperCase()}
          </text>
        )
      })}

      {/* series */}
      {series.map((s) => (
        <g key={s.label}>
          <path
            d={
              s.values
                .map((v, i) => {
                  const p = pointAt(i, v)
                  return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
                })
                .join(' ') + ' Z'
            }
            fill={s.color}
            fillOpacity={0.1}
            stroke={s.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          {s.values.map((v, i) => {
            const p = pointAt(i, v)
            return <circle key={i} cx={p.x} cy={p.y} r={2} fill={s.color} />
          })}
        </g>
      ))}

      {/* centre bloom */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#r-${id})`} pointerEvents="none" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Donut — resolution breakdown / severity mix
   ═══════════════════════════════════════════════════════════════════════ */

export interface DonutSlice {
  label: string
  value: number
  color: string
}

export function Donut({
  slices,
  size = 148,
  thickness = 14,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = size / 2 - thickness / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="distribution">
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(120,160,200,0.1)" strokeWidth={thickness} />
      {total > 0 &&
        slices.map((s) => {
          const frac = s.value / total
          const dash = frac * circumference
          const el = (
            <circle
              key={s.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${c} ${c})`}
              style={{ transition: 'stroke-dasharray var(--t-slow) var(--ease-out-expo)' }}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          )
          offset += dash
          return el
        })}
      {centerValue && (
        <>
          <text x={c} y={c - 2} textAnchor="middle" fill="var(--ink)" style={{ font: '600 20px var(--font-mono)', letterSpacing: '-0.02em' }}>
            {centerValue}
          </text>
          {centerLabel && (
            <text x={c} y={c + 14} textAnchor="middle" fill="var(--ink-faint)" style={{ font: '500 8px var(--font-mono)', letterSpacing: '0.14em' }}>
              {centerLabel.toUpperCase()}
            </text>
          )}
        </>
      )}
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Mini bars — the HUD signal strip
   ═══════════════════════════════════════════════════════════════════════ */

export function MiniBars({
  values,
  height = 34,
  color = 'var(--cyan)',
  spikeColor = 'var(--danger)',
  spikeAt = 0.9,
}: {
  values: number[]
  height?: number
  color?: string
  spikeColor?: string
  spikeAt?: number
}) {
  const max = Math.max(...values, 0.0001)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
      {values.map((v, i) => {
        const h = Math.max(1, (v / max) * height)
        const spike = v / max >= spikeAt
        return (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 2,
              height: h,
              borderRadius: '1px 1px 0 0',
              background: spike
                ? `linear-gradient(to top, ${spikeColor}22, ${spikeColor})`
                : `linear-gradient(to top, ${color}22, ${color})`,
              transition: 'height var(--t-med) var(--ease)',
            }}
          />
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Horizontal bar list (shared by several panels)
   ═══════════════════════════════════════════════════════════════════════ */

export function BarList({
  items,
  format = (v: number) => v.toLocaleString(),
}: {
  items: Array<{ label: string; value: number; color: string }>
  format?: (v: number) => string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="hbars">
      {items.map((it) => (
        <div className="hbar" key={it.label}>
          <span className="hbar-label" title={it.label}>
            {it.label}
          </span>
          <div className="hbar-track">
            <div
              className="hbar-fill"
              style={{ width: `${(it.value / max) * 100}%`, background: it.color, opacity: 0.85 }}
            />
          </div>
          <span className="hbar-value">{format(it.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Confusion matrix
   ═══════════════════════════════════════════════════════════════════════ */

export function ConfusionMatrixGrid({
  labels,
  matrix,
  labelFor,
}: {
  labels: string[]
  matrix: number[][]
  labelFor: (l: string) => { label: string; color: string }
}) {
  const max = Math.max(...matrix.flat(), 1)
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="matrix">
        <thead>
          <tr>
            <th scope="col" />
            {labels.map((l) => (
              <th scope="col" key={l} style={{ color: labelFor(l).color }}>
                {labelFor(l).label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, ri) => (
            <tr key={labels[ri]}>
              <th scope="row" style={{ color: labelFor(labels[ri]).color }}>
                {labelFor(labels[ri]).label}
              </th>
              {row.map((cell, ci) => {
                const t = cell / max
                const diag = ri === ci
                return (
                  <td
                    key={ci}
                    className={diag ? 'matrix td-diag' : `matrix ${cell / max < 0.06 ? 'td-off' : 'td-off'}`}
                    style={{
                      background: diag
                        ? `color-mix(in srgb, ${labelFor(labels[ri]).color} ${8 + t * 46}%, transparent)`
                        : `rgba(244, 63, 94, ${Math.min(0.42, t * 0.62)})`,
                    }}
                    title={`actual ${labels[ri]} → predicted ${labels[ci]}: ${cell.toLocaleString()}`}
                  >
                    {cell.toLocaleString()}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Probability vector
   ═══════════════════════════════════════════════════════════════════════ */

export function ProbabilityBars({
  entries,
}: {
  entries: Array<{ label: string; value: number; color: string; top?: boolean }>
}) {
  return (
    <div className="probs">
      {entries.map((e) => (
        <div className={`prob ${e.top ? 'prob-top' : ''}`} key={e.label}>
          <span className="prob-label">
            {e.label}
            {e.top && <span style={{ color: e.color }}>▲</span>}
          </span>
          <div className="prob-track">
            <div
              className="prob-fill"
              style={{ width: `${Math.max(0.6, e.value * 100)}%`, background: e.color, opacity: e.top ? 1 : 0.55 }}
            />
          </div>
          <span className="prob-value">{(e.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

/** Generic labelled figure, used inside chart panels. */
export function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="row wrap gap-3" style={{ marginTop: '0.625rem' }}>
      {items.map((i) => (
        <span className="legend-item" key={i.label}>
          <span className="legend-swatch" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** Wraps a chart with a consistent label + value header. */
export function ChartFrame({
  title,
  value,
  children,
}: {
  title: string
  value?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="row-between" style={{ marginBottom: '0.75rem' }}>
        <span className="micro">{title}</span>
        {value !== undefined && (
          <span className="num" style={{ fontSize: 'var(--fs-md)', fontWeight: 600 }}>
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
