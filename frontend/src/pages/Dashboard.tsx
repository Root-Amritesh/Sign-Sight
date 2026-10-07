/**
 * Dashboard — the SOC's first screen on every shift.
 *
 * Answer three questions in order: is anything on fire, is the model still
 * trustworthy, and what is happening right now. Everything else is secondary.
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { POLL_MS, SLOW_POLL_MS, qk } from '../lib/query'
import { classInfo, severityTone, SEVERITY_ORDER } from '../lib/meta'
import { dayMonth, duration, num, pct, relTime } from '../lib/format'
import { BarList, Donut, Gauge, type DonutSlice } from '../components/charts'
import { Icon } from '../components/ui/Icon'
import {
  ClassChip,
  EmptyState,
  KeyValue,
  Panel,
  PanelBody,
  PanelHead,
  SeverityBadge,
  Skeleton,
  StatusBadge,
} from '../components/ui'

/** The 503 from `/metrics/model/` is a state, not a failure — show it calmly. */
function Unavailable({ what }: { what: string }) {
  return (
    <EmptyState
      glyph="◎"
      title={`${what} unavailable`}
      body="No model is currently deployed. Upload a trained artifact from the model registry to start scoring."
      action={
        <Link to="/app/ingest" className="btn btn-sm" style={{ marginTop: '0.5rem' }}>
          <Icon name="ingest" size={12} />
          Go to ingest
        </Link>
      }
    />
  )
}

function errorFor(error: unknown, what: string) {
  if (error instanceof ApiError && error.isModelUnavailable) return <Unavailable what={what} />
  return (
    <EmptyState
      glyph="!"
      title="Could not load this panel"
      body={error instanceof ApiError ? error.message : 'Unexpected error.'}
    />
  )
}

function Stat({
  label,
  value,
  sub,
  icon,
  sev,
}: {
  label: string
  value: string
  sub?: React.ReactNode
  icon?: Parameters<typeof Icon>[0]['name']
  sev?: string
}) {
  return (
    <Panel
      className={`stat ${sev ? 'stat-sev' : ''}`}
      style={sev ? ({ ['--sev-color' as string]: sev, ['--sev-wash' as string]: `${sev}22` } as React.CSSProperties) : undefined}
    >
      <div className="stat-label">
        {icon && <Icon name={icon} size={12} />}
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </Panel>
  )
}

export function Dashboard() {
  const stats = useQuery({
    queryKey: qk.alertStats('24h'),
    queryFn: ({ signal }) => api.alerts.stats('24h', signal),
    refetchInterval: POLL_MS,
  })

  const health = useQuery({
    queryKey: qk.health,
    queryFn: ({ signal }) => api.metrics.health(signal),
    refetchInterval: SLOW_POLL_MS,
  })

  const model = useQuery({
    queryKey: qk.modelMetrics,
    queryFn: ({ signal }) => api.metrics.model(signal),
    refetchInterval: SLOW_POLL_MS,
  })

  const drift = useQuery({
    queryKey: qk.drift,
    queryFn: ({ signal }) => api.metrics.drift(signal),
    refetchInterval: SLOW_POLL_MS,
  })

  const open = useQuery({
    queryKey: qk.alerts({ status: ['new', 'viewed', 'escalated'], page_size: 8 }),
    queryFn: ({ signal }) =>
      api.alerts.list(
        { status: ['new', 'viewed', 'escalated'], ordering: '-severity,-created_at', page_size: 8 },
        signal,
      ),
    refetchInterval: POLL_MS,
  })

  const s = stats.data
  const critical = s?.by_severity?.critical ?? 0
  const driftTone =
    drift.data?.drift_status === 'healthy'
      ? 'var(--ok)'
      : drift.data?.drift_status === 'warning'
        ? 'var(--warn)'
        : 'var(--danger)'

  const severitySlices: DonutSlice[] = SEVERITY_ORDER.filter((k) => (s?.by_severity?.[k] ?? 0) > 0).map(
    (k) => ({ label: severityTone(k).label, value: s!.by_severity[k], color: severityTone(k).color }),
  )

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Operations overview</h2>
          <p>
            Last 24 hours, refreshed every {POLL_MS / 1000}s.{' '}
            {s && `${num(s.total_alerts)} alerts recorded.`}
          </p>
        </div>
        <div className="page-tools">
          <Link to="/app/ingest" className="btn btn-sm">
            <Icon name="ingest" size={12} />
            Send traffic
          </Link>
          <Link to="/app/alerts" className="btn btn-primary btn-sm">
            <Icon name="bell" size={12} />
            Triage queue
          </Link>
        </div>
      </div>

      {/* Row 1 — the numbers that change the shift. */}
      <div className="grid grid-4">
        {stats.isPending ? (
          Array.from({ length: 4 }, (_, i) => (
            <Panel className="stat" key={i}>
              <Skeleton height={11} width="55%" />
              <div style={{ height: 10 }} />
              <Skeleton height={26} width="70%" />
            </Panel>
          ))
        ) : stats.isError ? (
          <Panel className="stat" style={{ gridColumn: '1 / -1' }}>
            {errorFor(stats.error, 'Alert statistics')}
          </Panel>
        ) : (
          <>
            <Stat
              label="Critical"
              value={num(s?.by_severity?.critical)}
              icon="warning"
              sev="var(--sev-critical)"
              sub={critical > 0 ? 'Needs a decision now' : 'Nothing critical'}
            />
            <Stat
              label="Untriaged"
              value={num(s?.by_status?.new)}
              icon="bell"
              sev="var(--cyan)"
              sub={`${num(s?.by_status?.escalated)} escalated`}
            />
            <Stat
              label="Mean time to resolve"
              value={duration(s?.mean_time_to_resolve_seconds)}
              icon="clock"
              sub="Across resolved alerts"
            />
            <Stat
              label="False positive rate"
              value={pct(s?.false_positive_rate)}
              icon="target"
              sev={s && s.false_positive_rate > 0.2 ? 'var(--warn)' : undefined}
              sub={
                s && (
                  <>
                    {num(s.resolution_breakdown.true_positive)} TP ·{' '}
                    {num(s.resolution_breakdown.false_positive)} FP
                  </>
                )
              }
            />
          </>
        )}
      </div>

      <div className="split-main">
        {/* Main column */}
        <div className="grid">
          <Panel flush>
            <PanelHead
              title="Open alerts"
              kicker="Live"
              actions={
                <Link to="/app/alerts" className="btn btn-ghost btn-sm">
                  View all
                  <Icon name="chevronRight" size={12} />
                </Link>
              }
            />
            {open.isPending ? (
              <PanelBody>
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} height={34} />
                ))}
              </PanelBody>
            ) : open.isError ? (
              <PanelBody>{errorFor(open.error, 'Alert list')}</PanelBody>
            ) : open.data && open.data.results.length > 0 ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 96 }}>Severity</th>
                      <th style={{ width: 64 }}>Class</th>
                      <th>Detected</th>
                      <th style={{ width: 92 }}>Status</th>
                      <th style={{ width: 84, textAlign: 'right' }}>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {open.data.results.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <SeverityBadge severity={a.severity} />
                        </td>
                        <td>
                          <ClassChip label={a.predicted_label} />
                        </td>
                        <td>
                          <Link to={`/app/alerts/${a.id}`} className="cell-link">
                            {relTime(a.created_at)}
                          </Link>
                          <div className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                            {a.model_version}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="num-cell">{pct(a.confidence, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <PanelBody>
                <EmptyState
                  glyph="✓"
                  title="Queue is clear"
                  body="No open alerts in the last 24 hours. Send a record to /api/ingest/ to create one."
                />
              </PanelBody>
            )}
          </Panel>

          {/* Alert volume by class — where the traffic actually is. */}
          <Panel>
            <PanelHead title="Alerts by predicted class" kicker="24h" />
            <PanelBody>
              {stats.isPending ? (
                <Skeleton height={120} />
              ) : (
                <BarList
                  items={Object.entries(s?.by_label ?? {})
                    .filter(([, v]) => v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, value]) => ({
                      label: classInfo(label).label,
                      value,
                      color: classInfo(label).color,
                    }))}
                />
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* Side column */}
        <div className="grid">
          <Panel>
            <PanelHead title="Severity mix" kicker="24h" />
            <PanelBody>
              {stats.isPending ? (
                <Skeleton height={150} />
              ) : severitySlices.length > 0 ? (
                <>
                  <Donut slices={severitySlices} size={168} thickness={14} />
                  <div className="donut-legend">
                    {severitySlices.map((slice) => (
                      <span className="legend-row" key={slice.label}>
                        <i style={{ background: slice.color }} />
                        {slice.label}
                        <strong>{num(slice.value)}</strong>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState glyph="—" title="No alerts in this period" />
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Model confidence" kicker="Macro F1" />
            <PanelBody style={{ display: 'grid', placeItems: 'center' }}>
              {model.isPending ? (
                <Skeleton height={140} width="100%" />
              ) : model.isError ? (
                errorFor(model.error, 'Model metrics')
              ) : (
                <>
                  <Gauge
                    value={model.data?.overall_metrics.f1_macro ?? 0}
                    max={1}
                    label="Macro F1"
                    size={148}
                    color={
                      (model.data?.overall_metrics.f1_macro ?? 0) > 0.9
                        ? 'var(--ok)'
                        : (model.data?.overall_metrics.f1_macro ?? 0) > 0.8
                          ? 'var(--warn)'
                          : 'var(--danger)'
                    }
                  />
                  <div className="kv-inline">
                    <span>Accuracy</span>
                    <strong>{pct(model.data?.overall_metrics.accuracy)}</strong>
                    <span>Recall</span>
                    <strong>{pct(model.data?.overall_metrics.recall_macro)}</strong>
                    <span>False positive</span>
                    <strong>{pct(model.data?.overall_metrics.fpr)}</strong>
                  </div>
                  <Link to="/app/model" className="btn btn-sm" style={{ marginTop: '0.75rem' }}>
                    Model detail
                    <Icon name="chevronRight" size={12} />
                  </Link>
                </>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Drift" kicker="PSI" />
            <PanelBody>
              {drift.isPending ? (
                <Skeleton height={70} />
              ) : drift.isError ? (
                errorFor(drift.error, 'Drift')
              ) : (
                <>
                  <div className="drift-inline">
                    <span
                      className="drift-value"
                      style={{ color: driftTone }}
                    >
                      {(drift.data?.latest_snapshot.drift_score ?? 0).toFixed(3)}
                    </span>
                    <span
                      className="badge"
                      style={{
                        borderColor: `color-mix(in srgb, ${driftTone} 45%, transparent)`,
                        color: driftTone,
                      }}
                    >
                      {drift.data?.drift_status}
                    </span>
                  </div>
                  <div className="drift-history">
                    {drift.data?.history.slice(-24).map((h) => {
                      const max = Math.max(
                        drift.data?.latest_snapshot.critical_threshold ?? 0.5,
                        ...drift.data!.history.map((x) => x.drift_score),
                      )
                      const tone =
                        h.status === 'healthy'
                          ? 'var(--ok)'
                          : h.status === 'warning'
                            ? 'var(--warn)'
                            : 'var(--danger)'
                      return (
                        <span
                          key={h.timestamp}
                          style={{
                            height: `${Math.max(4, (h.drift_score / max) * 100)}%`,
                            background: tone,
                          }}
                        />
                      )
                    })}
                  </div>
                  <Link to="/app/drift" className="btn btn-sm" style={{ marginTop: '0.75rem' }}>
                    Drift detail
                    <Icon name="chevronRight" size={12} />
                  </Link>
                </>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Service health" />
            <PanelBody>
              {health.isPending ? (
                <Skeleton height={90} />
              ) : health.isError ? (
                errorFor(health.error, 'Health')
              ) : (
                <div className="health-list">
                  {(
                    [
                      ['database', 'Database'],
                      ['redis', 'Redis'],
                      ['celery', 'Celery'],
                      ['model', 'Model'],
                    ] as const
                  ).map(([key, label]) => {
                    const check = health.data?.checks?.[key]
                    const tone =
                      check?.status === 'up' || check?.status === 'loaded'
                        ? 'var(--ok)'
                        : check?.status === 'degraded'
                          ? 'var(--warn)'
                          : 'var(--danger)'
                    return (
                      <div className="health-row" key={key}>
                        <span className="health-dot" style={{ background: tone, boxShadow: `0 0 8px ${tone}` }} />
                        <span className="health-name">{label}</span>
                        <span className="health-status" style={{ color: tone }}>
                          {check?.status ?? 'unknown'}
                        </span>
                        {check?.latency_ms !== undefined && (
                          <span className="health-latency">{check.latency_ms}ms</span>
                        )}
                      </div>
                    )
                  })}
                  <div className="faint mono" style={{ fontSize: 'var(--fs-micro)', marginTop: '0.25rem' }}>
                    checked {relTime(health.data?.timestamp)}
                  </div>
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Active model" kicker={model.data?.active_model.version ?? '—'} />
            <PanelBody>
              {model.isPending ? (
                <Skeleton height={90} />
              ) : model.isError ? (
                errorFor(model.error, 'Model metrics')
              ) : (
                <>
                  <KeyValue
                    items={[
                      ['Type', model.data?.active_model.model_type ?? '—'],
                      ['Dataset', model.data?.active_model.dataset ?? '—'],
                      ['Trained', dayMonth(model.data?.active_model.training_date)],
                      ['Deployed', relTime(model.data?.active_model.deployed_at)],
                    ]}
                  />
                  <div className="row gap-2" style={{ marginTop: '0.75rem' }}>
                    <Link to="/app/model" className="btn btn-sm grow">
                      Metrics
                    </Link>
                    <Link to="/app/drift" className="btn btn-sm grow">
                      Drift
                    </Link>
                    <Link to="/app/ingest" className="btn btn-sm grow">
                      Ingest
                    </Link>
                  </div>
                </>
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </main>
  )
}
