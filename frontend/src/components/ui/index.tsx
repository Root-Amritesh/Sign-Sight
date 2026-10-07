/** Panel, badge, button, field, and the small primitives the pages compose. */

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { classInfo, severityTone, statusTone } from '../../lib/meta'
import type { AlertStatus, ClassLabel, Severity } from '../../lib/api'

/* ═══════════════════════════════════════════════════════════════════════
   Panel
   ═══════════════════════════════════════════════════════════════════════ */

interface PanelProps {
  children: ReactNode
  className?: string
  /** Adds the cyan corner brackets. Use sparingly — hero panels only. */
  bracketed?: boolean
  flush?: boolean
  style?: React.CSSProperties
}

export function Panel({ children, className = '', bracketed, flush, style }: PanelProps) {
  return (
    <section
      className={`panel ${flush ? 'panel-flush' : ''} ${bracketed ? 'bracketed' : ''} ${className}`}
      style={style}
    >
      {children}
    </section>
  )
}

interface PanelHeadProps {
  title: string
  /** Section index like "01" or a short qualifier. */
  kicker?: string
  actions?: ReactNode
  children?: ReactNode
}

export function PanelHead({ title, kicker, actions, children }: PanelHeadProps) {
  return (
    <header className="panel-head">
      <h3 className="panel-title">
        {kicker && <span className="micro">{kicker}</span>}
        {title}
      </h3>
      {actions ?? children}
    </header>
  )
}

export function PanelBody({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`panel-body ${className}`} style={style}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Badges
   ═══════════════════════════════════════════════════════════════════════ */

export function SeverityBadge({ severity, size }: { severity: Severity; size?: 'lg' }) {
  const tone = severityTone(severity)
  return (
    <span className={`badge badge-${severity} ${size === 'lg' ? 'badge-lg' : ''}`}>{tone.label}</span>
  )
}

export function StatusBadge({ status }: { status: AlertStatus }) {
  const tone = statusTone(status)
  return (
    <span
      className="badge"
      style={{ borderColor: `color-mix(in srgb, ${tone.color} 45%, transparent)`, color: tone.color }}
    >
      {status === 'new' && <span className="pulse-dot" style={{ color: tone.color }} />}
      {tone.label}
    </span>
  )
}

export function ClassChip({ label, strong }: { label: ClassLabel | string; strong?: boolean }) {
  const info = classInfo(label)
  return (
    <span
      className="badge"
      style={{
        borderColor: `color-mix(in srgb, ${info.color} 42%, transparent)`,
        color: info.color,
        background: `color-mix(in srgb, ${info.color} 10%, transparent)`,
        fontWeight: strong ? 700 : 500,
      }}
    >
      {info.label}
    </span>
  )
}

export function Badge({
  children,
  tone = 'default',
  icon,
}: {
  children: ReactNode
  tone?: 'default' | 'ok' | 'warn' | 'danger' | 'cyan' | 'violet'
  icon?: IconName
}) {
  return (
    <span className={`badge ${tone !== 'default' ? `badge-${tone}` : ''}`}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Buttons
   ═══════════════════════════════════════════════════════════════════════ */

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  block?: boolean
}

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  block,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    variant !== 'default' ? `btn-${variant}` : '',
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} />}
      {children}
    </button>
  )
}

interface LinkButtonProps {
  to: string
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  children: ReactNode
  className?: string
}

export function LinkButton({ to, variant = 'default', size = 'md', icon, children, className = '' }: LinkButtonProps) {
  return (
    <Link to={to} className={`btn ${variant !== 'default' ? `btn-${variant}` : ''} ${size === 'lg' ? 'btn-lg' : ''} ${className}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Fields
   ═══════════════════════════════════════════════════════════════════════ */

interface FieldProps {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  htmlFor?: string
}

export function Field({ label, children, hint, error, htmlFor }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? (
        <span className="field-error">{error}</span>
      ) : hint ? (
        <span className="micro" style={{ letterSpacing: '0.06em', textTransform: 'none' }}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...rest} />
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`select ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`textarea ${className}`} {...rest} />
}

export function Checkbox({
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="check">
      <input type="checkbox" {...rest} />
      {label}
    </label>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Feedback
   ═══════════════════════════════════════════════════════════════════════ */

export function Skeleton({ height = 16, width = '100%', radius }: { height?: number | string; width?: number | string; radius?: number }) {
  return <div className="skel" style={{ height, width, borderRadius: radius }} />
}

export function EmptyState({
  glyph = '—',
  title,
  body,
  action,
}: {
  glyph?: string
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-glyph">{glyph}</div>
      <div className="mono" style={{ color: 'var(--ink-dim)', fontSize: 'var(--fs-sm)' }}>
        {title}
      </div>
      {body && <div style={{ fontSize: 'var(--fs-xs)', maxWidth: '38ch' }}>{body}</div>}
      {action}
    </div>
  )
}

export function Note({
  kind = 'info',
  icon = 'info',
  children,
}: {
  kind?: 'info' | 'warn' | 'danger' | 'ok' | 'violet'
  icon?: IconName
  children: ReactNode
}) {
  return (
    <div className={`note note-${kind}`}>
      <Icon name={icon} size={14} />
      <div className="grow">{children}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Meter + Tabs + KeyValue
   ═══════════════════════════════════════════════════════════════════════ */

export function Meter({
  value,
  max = 1,
  color = 'var(--cyan)',
  striped,
  height,
}: {
  value: number
  max?: number
  color?: string
  striped?: boolean
  height?: number
}) {
  const pctWidth = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="meter" style={height ? { height } : undefined}>
      <div
        className={`meter-fill ${striped ? 'meter-fill-striped' : ''}`}
        style={{ width: `${pctWidth}%`, background: color }}
      />
    </div>
  )
}

export interface TabItem {
  id: string
  label: string
  count?: number
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className="tab"
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span className="faint"> ({t.count})</span>}
        </button>
      ))}
    </div>
  )
}

export function KeyValue({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="kv">
      {items.map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Section index label, e.g. "03 / MODEL HEALTH". */
export function Kicker({ children }: { children: ReactNode }) {
  return <span className="micro">{children}</span>
}
