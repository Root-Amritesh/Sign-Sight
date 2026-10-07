/**
 * Marketing landing page.
 *
 * The hero is a live WebGL threat globe. Its attack events feed the HUD
 * readouts, so the numbers on the page are the numbers animating behind them
 * rather than a separate, decorative animation.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LazyGlobe, type AttackEvent } from '../components/three/LazyGlobe'
import { BrandMark, Icon, type IconName } from '../components/ui/Icon'
import { LinkButton, Panel } from '../components/ui'
import { pct } from '../lib/format'
import { CLASS, CLASS_ORDER, SEVERITY_ORDER, severityTone } from '../lib/meta'
import { useNearViewport, usePageVisible, usePrefersReducedMotion } from '../lib/motion'

/* ═══════════════════════════════════════════════════════════════════════
   Hero
   ═══════════════════════════════════════════════════════════════════════ */

const PIPELINE_STAGES = [
  {
    title: 'Ingest',
    body: 'Live scoring endpoint plus CSV batch uploads. Each record is normalised, then queued for inference.',
    io: 'POST /api/ingest/  ·  POST /api/ingest/batch/',
  },
  {
    title: 'Score',
    body: 'The active model returns calibrated per-class probabilities alongside the predicted label and confidence.',
    io: 'probabilities · predicted_label · confidence',
  },
  {
    title: 'Route',
    body: 'Confidence above the alerting floor becomes an alert. Severity follows the configured tier thresholds.',
    io: 'min_confidence_to_alert  →  severity_tiers',
  },
  {
    title: 'Detect',
    body: 'Analysts triage, escalate, and resolve. Every action is written to an append-only audit trail.',
    io: 'new → viewed → escalated → resolved',
  },
  {
    title: 'Monitor',
    body: 'Live quality metrics, confusion matrix, and population-stability drift on the served distribution.',
    io: 'GET /api/metrics/model/  ·  GET /api/metrics/drift/',
  },
]

const FEATURES: Array<{ icon: IconName; title: string; body: string; tag: string }> = [
  {
    icon: 'pulse',
    title: 'Per-class quality, not one number',
    body: 'Macro-averaged F1 hides the failure that matters. Precision, recall, AUC, and support for every class, with the confusion matrix underneath.',
    tag: 'metrics/model',
  },
  {
    icon: 'drift',
    title: 'Drift you can act on',
    body: 'Population stability between the training distribution and what is arriving now, per class, with the deviation in plain signed percentages.',
    tag: 'metrics/drift',
  },
  {
    icon: 'target',
    title: 'Configurable severity logic',
    body: 'Tiers, the alerting floor, and per-class severity boosts are runtime configuration — tune detection without redeploying the model.',
    tag: 'config/alert-thresholds',
  },
  {
    icon: 'branch',
    title: 'Reversible deployments',
    body: 'Every trained version stays in the registry. Roll back to a known-good artifact in one call, with the change audited.',
    tag: 'models/rollback',
  },
  {
    icon: 'audit',
    title: 'Append-only audit trail',
    body: 'Who changed which alert, from what to what, and when. Old and new values are both recorded, so triage is reconstructable.',
    tag: 'audit',
  },
  {
    icon: 'lock',
    title: 'Analysts and admins, separated',
    body: 'Triage is open to every analyst. Model deployment, threshold edits, and the audit log require the administrator role.',
    tag: 'role-based access',
  },
]

const PROBLEMS = {
  bad: [
    'One accuracy number for a five-class imbalanced problem.',
    'Alerts fire on every low-confidence record, so real ones get ignored.',
    'A retrained model silently replaces the one that was working.',
    'No record of who changed a verdict or when.',
    'Alert rules buried in code, changed by redeploying.',
  ],
  good: [
    'Per-class precision, recall, F1, AUC, and support.',
    'A confidence floor plus severity tiers you tune at runtime.',
    'A version registry with one-call rollback.',
    'Every triage action captured with old and new values.',
    'Thresholds as configuration, not as a code change.',
  ],
}

function Hero() {
  const reduced = usePrefersReducedMotion()
  const hostRef = useRef<HTMLElement>(null)
  const near = useNearViewport(hostRef, '120px')
  const visible = usePageVisible()
  const [events, setEvents] = useState<AttackEvent[]>([])
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 24 }, () => 18 + Math.random() * 30))
  const live = !reduced && near && visible

  // Rolling window of the most recent simulated detections.
  const onEvent = useMemo(
    () => (e: AttackEvent) => {
      setEvents((prev) => [e, ...prev].slice(0, 5))
      setBars((prev) => {
        const next = [...prev.slice(1), 22 + Math.random() * 74]
        return next
      })
    },
    [],
  )

  const counts = useMemo(() => {
    const bySeverity: Record<string, number> = {}
    for (const e of events) bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1
    return bySeverity
  }, [events])

  const total = events.length
  const criticalCount = counts.critical ?? 0

  return (
    <section className="hero" ref={hostRef}>
      <div className="hero-canvas">
        <LazyGlobe variant="hero" motion={live} onEvent={onEvent} />
      </div>
      <div className="hero-veil" />

      <div className="wrap-x hero-inner">
        <span className="hero-eyebrow">
          <span className="pulse-dot" style={{ color: 'var(--cyan)' }} />
          Threat detection · NSL-KDD
        </span>

        <h1>Network intrusion detection that shows its reasoning.</h1>

        <p className="hero-lede">
          SignSight scores every connection, routes what matters into a triage queue, and keeps
          the model honest — <strong>per-class metrics, drift, and an audit trail</strong> on the
          same screen as the alerts.
        </p>

        <div className="hero-cta">
          <LinkButton to="/login" variant="primary" size="lg" icon="arrowRight">
            Open the console
          </LinkButton>
          <a href="#pipeline" className="btn btn-lg">
            How it works
          </a>
        </div>

        <div className="hero-meta">
          <div className="hero-meta-item">
            <span className="hero-meta-value">5</span>
            <span className="hero-meta-label">Attack classes</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-value">21</span>
            <span className="hero-meta-label">API endpoints</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-value">5s</span>
            <span className="hero-meta-label">Alert polling</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-value">100%</span>
            <span className="hero-meta-label">Actions audited</span>
          </div>
        </div>
      </div>

      <div className="hero-hud">
        <div className="hud-row">
          <span>Live detections</span>
          <strong>{total}</strong>
        </div>

        <div className="hud-signal" aria-hidden="true">
          {bars.map((b, i) => {
            const hot = b > 74
            return (
              <span
                key={i}
                className={`hud-bar ${hot ? 'hud-bar-spike' : ''}`}
                style={{ height: `${b}%` }}
              />
            )
          })}
        </div>

        <div className="hud-row">
          <span>Critical</span>
          <strong style={{ color: criticalCount ? 'var(--danger)' : 'var(--ink)' }}>
            {criticalCount}
          </strong>
        </div>

        <div className="hud-sep" />

        {events.length === 0 ? (
          <div className="hud-row">
            <span>Awaiting traffic…</span>
          </div>
        ) : (
          events.slice(0, 3).map((e) => (
            <div className="hud-event" key={e.id}>
              <span className="hud-event-route">
                {e.from.id.toUpperCase()} → {e.to.id.toUpperCase()}
              </span>
              <span
                className="hud-event-class"
                style={{ color: severityTone(e.severity).color }}
              >
                {e.label}
              </span>
              <span className="hud-event-conf">{pct(e.confidence, 0)}</span>
            </div>
          ))
        )}

        <div className="hud-foot">
          <span className="micro">Simulated telemetry</span>
        </div>
      </div>

      <div className="hero-scroll" aria-hidden="true">
        <span>Scroll</span>
        <span className="scroll-rail" />
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Page sections
   ═══════════════════════════════════════════════════════════════════════ */

function Section({
  index,
  title,
  lede,
  children,
  alt,
  id,
}: {
  index: string
  title: string
  lede?: string
  children: React.ReactNode
  alt?: boolean
  id?: string
}) {
  return (
    <section className={`section ${alt ? 'section-alt' : ''}`} id={id}>
      <div className="wrap-x">
        <div className="section-head">
          <div className="section-index">{index}</div>
          <h2>{title}</h2>
          {lede && <p>{lede}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

function Versus() {
  return (
    <div className="versus">
      <Panel className="vs-card">
        <div className="vs-card-head">
          <span className="vs-card-glyph" style={{ color: 'var(--danger)' }}>
            <Icon name="x" size={18} />
          </span>
          <h3>Without it</h3>
        </div>
        <div className="vs-list">
          {PROBLEMS.bad.map((item) => (
            <div className="vs-item vs-item-no" key={item}>
              <span className="vs-item-glyph">
                <Icon name="x" size={13} />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="vs-card" style={{ borderColor: 'color-mix(in srgb, var(--ok) 30%, var(--line))' }}>
        <div className="vs-card-head">
          <span className="vs-card-glyph" style={{ color: 'var(--ok)' }}>
            <Icon name="check" size={18} />
          </span>
          <h3>With SignSight</h3>
        </div>
        <div className="vs-list">
          {PROBLEMS.good.map((item) => (
            <div className="vs-item vs-item-ok" key={item}>
              <span className="vs-item-glyph">
                <Icon name="check" size={13} />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function Pipeline() {
  return (
    <div className="pipe">
      {PIPELINE_STAGES.map((stage, i) => (
        <div className="pipe-stage" key={stage.title}>
          <div className="pipe-num">{String(i + 1).padStart(2, '0')}</div>
          <h3>{stage.title}</h3>
          <p>{stage.body}</p>
          <div className="pipe-io">{stage.io}</div>
        </div>
      ))}
    </div>
  )
}

function MetricStrip() {
  // These are properties of the dataset and the system, not measured KPIs —
  // the docs do not claim performance numbers we have not run.
  const cells = [
    { value: '125,973', label: 'NSL-KDD records', note: '22,544 test split' },
    { value: '23', label: 'Attack families', note: 'Mapped to 4 classes' },
    { value: '4', label: 'Attack classes', note: 'DoS · Probe · R2L · U2R' },
    { value: '5s', label: 'Poll interval', note: 'Short polling, no websockets' },
    { value: '0', label: 'Silent changes', note: 'Every mutation audited' },
  ]
  return (
    <div className="mstrip">
      {cells.map((c) => (
        <div className="mstrip-cell" key={c.label}>
          <span className="mstrip-value">{c.value}</span>
          <span className="mstrip-label">{c.label}</span>
          <span className="mstrip-note">{c.note}</span>
        </div>
      ))}
    </div>
  )
}

function Features() {
  return (
    <div className="features">
      {FEATURES.map((f) => (
        <Panel className="feature" key={f.title}>
          <span className="feature-glyph">
            <Icon name={f.icon} size={18} />
          </span>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
          <span className="feature-tag">{f.tag}</span>
        </Panel>
      ))}
    </div>
  )
}

function Classes() {
  return (
    <div className="classes">
      {CLASS_ORDER.map((key) => {
        const info = CLASS[key]
        return (
          <div className="class-row" key={key}>
            <span className="class-chip" style={{ color: info.color, borderColor: `color-mix(in srgb, ${info.color} 40%, transparent)` }}>
              {info.label}
            </span>
            <span className="class-blurb">{info.blurb}</span>
            <span className="class-examples">{info.examples}</span>
          </div>
        )
      })}
    </div>
  )
}

function SeverityTable() {
  return (
    <div className="sev-table">
      {SEVERITY_ORDER.map((s) => {
        const tone = severityTone(s)
        return (
          <div className="sev-row" key={s}>
            <span className="sev-dot" style={{ background: tone.color, boxShadow: `0 0 10px ${tone.color}` }} />
            <span className="sev-name" style={{ color: tone.color }}>
              {tone.label}
            </span>
            <span className="sev-range">confidence ≥ tier floor</span>
            <span className="sev-note">{tone.notify ? 'Notification eligible' : 'In-app only'}</span>
          </div>
        )
      })}
    </div>
  )
}

function Teams() {
  return (
    <div className="teams">
      <Panel className="team" style={{ ['--team-color' as string]: 'var(--cyan)' }}>
        <h3>
          <span className="glyph">
            <Icon name="scale" size={18} />
          </span>
          Detection & ML
        </h3>
        <ul>
          <li>Train on NSL-KDD, validate on the held-out split</li>
          <li>Pick the operating point, not just the best F1</li>
          <li>Ship a versioned artifact into the registry</li>
          <li>Watch drift and retrain when it moves</li>
        </ul>
        <div className="team-contract">
          <strong>Contract</strong>
          Trained artifact, metrics report, and a registry entry with accuracy and AUC attached.
        </div>
      </Panel>

      <Panel className="team" style={{ ['--team-color' as string]: 'var(--violet)' }}>
        <h3>
          <span className="glyph">
            <Icon name="terminal" size={18} />
          </span>
          Platform & backend
        </h3>
        <ul>
          <li>Django + DRF surface for the 21 documented endpoints</li>
          <li>Celery task queue for batch ingest and replay</li>
          <li>JWT auth with refresh and role checks</li>
          <li>Health, metrics, and audit on every write</li>
        </ul>
        <div className="team-contract">
          <strong>Contract</strong>
          The REST surface, the token flow, and the audit records every mutation produces.
        </div>
      </Panel>

      <Panel className="team" style={{ ['--team-color' as string]: 'var(--ok)' }}>
        <h3>
          <span className="glyph">
            <Icon name="shield" size={18} />
          </span>
          Frontend & console
        </h3>
        <ul>
          <li>One client, two backends — real API or in-browser mock</li>
          <li>Polling on the documented cadence, no bespoke transport</li>
          <li>Charts drawn as SVG, icons drawn as paths</li>
          <li>Design built for long shifts in a dark room</li>
        </ul>
        <div className="team-contract">
          <strong>Contract</strong>
          The SOC console: triage queue, model health, drift, ingest, and the admin tools.
        </div>
      </Panel>
    </div>
  )
}

function CallToAction() {
  return (
    <section className="section">
      <div className="wrap-x">
        <Panel className="cta" bracketed>
          <h2>Point it at your traffic.</h2>
          <p>
            Sign in to the console with the demo accounts, or point the client at your own Django
            backend with a single environment variable.
          </p>
          <div className="cta-actions">
            <LinkButton to="/login" variant="primary" size="lg" icon="arrowRight">
              Open the console
            </LinkButton>
            <a href="#" className="btn btn-lg" onClick={(e) => e.preventDefault()}>
              <Icon name="download" size={14} />
              API specification
            </a>
          </div>
        </Panel>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="lfoot">
      <div className="wrap-x lfoot-inner">
        <div className="brand">
          <BrandMark size={20} />
          <span className="brand-name">
            Sign<em>Sight</em>
          </span>
        </div>
        <div className="lfoot-links">
          <Link to="/login">Console</Link>
          <a href="#" onClick={(e) => e.preventDefault()}>
            API spec
          </a>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Data pipeline
          </a>
          <span className="faint">Detection platform · 2026</span>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */

export function Landing() {
  // The marketing nav gains a background once the hero has scrolled past.
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing">
      <header className="lnav" data-stuck={stuck}>
        <Link to="/" className="brand">
          <BrandMark size={24} />
          <span className="brand-name">
            Sign<em>Sight</em>
          </span>
        </Link>
        <nav className="lnav-links">
          <a className="lnav-link" href="#problem">
            Problem
          </a>
          <a className="lnav-link" href="#pipeline">
            Pipeline
          </a>
          <a className="lnav-link" href="#classes">
            Classes
          </a>
          <a className="lnav-link" href="#teams">
            Teams
          </a>
        </nav>
        <Link to="/login" className="btn btn-primary btn-sm">
          Sign in
        </Link>
      </header>

      <Hero />

      <Section
        id="problem"
        index="01 / The problem"
        title="A single accuracy number is not a detection system."
        lede="Intrusion detection fails quietly. The model scores well on average while one class quietly fails, and the analyst never finds out until an incident."
      >
        <Versus />
      </Section>

      <Section
        id="pipeline"
        index="02 / The pipeline"
        title="From connection to verdict, in five steps."
        lede="Every stage is an API call you can see. Nothing happens in a batch job you have to go looking for."
        alt
      >
        <Pipeline />
      </Section>

      <Section
        index="03 / By the numbers"
        title="What the dataset and the system actually give you."
        lede="Figures below are properties of NSL-KDD and the documented system — not performance claims. Measured quality lives in the console."
      >
        <MetricStrip />
      </Section>

      <Section
        id="classes"
        index="04 / Detection classes"
        title="What the model is actually looking for."
        lede="Five classes, four of them attacks. Each maps to a documented set of NSL-KDD attack families."
        alt
      >
        <Classes />
        <div className="section-split">
          <div>
            <div className="section-index">Severity routing</div>
            <p className="section-sub">
              Confidence is compared against tier thresholds, and attack types can be boosted so a
              confirmed R2L never sits below a low-confidence probe.
            </p>
          </div>
          <SeverityTable />
        </div>
      </Section>

      <Section
        index="05 / What you get"
        title="Built for the analyst, not the demo."
      >
        <Features />
      </Section>

      <Section
        id="teams"
        index="06 / Ownership"
        title="Three teams, three contracts."
        lede="The boundaries are the point. Each team ships a thing the others can verify."
        alt
      >
        <Teams />
      </Section>

      <CallToAction />
      <Footer />
    </div>
  )
}
