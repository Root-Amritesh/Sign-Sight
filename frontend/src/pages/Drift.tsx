/**
 * Drift — has the world moved away from what the model was trained on?
 *
 * Population Stability Index between the training distribution and the traffic
 * arriving now, per class, with the warning and critical thresholds drawn on
 * the history so the trend is read against the limits rather than in isolation.
 */

import { useQuery } from '@tanstack/react-query'
import { api, ApiError, type ClassLabel } from '../lib/api'
import { SLOW_POLL_MS, qk } from '../lib/query'
import { CLASS_ORDER, classInfo } from '../lib/meta'
import { dt, num, pct, relTime } from '../lib/format'
import { AreaChart, ChartLegend } from '../components/charts'
import { Icon } from '../components/ui/Icon'
import { EmptyState, Note, Panel, PanelBody, PanelHead, Skeleton } from '../components/ui'

const TONE = {
  healthy: 'var(--ok)',
  warning: 'var(--warn)',
  critical: 'var(--danger)',
} as const

export function Drift() {
  const drift = useQuery({
    queryKey: qk.drift,
    queryFn: ({ signal }) => api.metrics.drift(signal),
    refetchInterval: SLOW_POLL_MS,
  })

  if (drift.isPending) {
    return (
      <main className="page">
        <div className="page-head">
          <div>
            <h2>Drift</h2>
            <p>Computing population stability…</p>
          </div>
        </div>
        <Panel>
          <Skeleton height={220} />
        </Panel>
      </main>
    )
  }

  if (drift.isError) {
    const noModel = drift.error instanceof ApiError && drift.error.isModelUnavailable
    return (
      <main className="page">
        <div className="page-head">
          <div>
            <h2>Drift</h2>
            <p>{noModel ? 'No active model.' : 'Could not load drift data.'}</p>
          </div>
        </div>
        <Panel>
          <EmptyState
            glyph="◎"
            title={noModel ? 'No model to compare against' : 'Drift unavailable'}
            body={
              noModel
                ? 'Drift compares live traffic to a training distribution. Deploy a model first.'
                : 'The API returned an error.'
            }
          />
        </Panel>
      </main>
    )
  }

  const data = drift.data!
  const snap = data.latest_snapshot
  const tone = TONE[data.drift_status]

  const history = data.history.map((h) => ({
    label: relTime(h.timestamp, new Date(snap.timestamp).getTime()),
    value: h.drift_score,
  }))

  const rows = CLASS_ORDER.map((c: ClassLabel) => ({
    class: c,
    training: snap.training_distribution?.[c] ?? 0,
    current: snap.current_distribution?.[c] ?? 0,
    deviation: snap.deviation?.[c] ?? '—',
  }))

  const maxShare = Math.max(...rows.map((r) => Math.max(r.training, r.current)), 0.0001)

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Drift</h2>
          <p>
            Population stability against <span className="mono">{data.model_version}</span> ·{' '}
            {relTime(snap.timestamp)}
          </p>
        </div>
        <div className="page-tools">
          <span
            className="badge"
            style={{
              borderColor: `color-mix(in srgb, ${tone} 45%, transparent)`,
              color: tone,
            }}
          >
            <span className="pulse-dot" style={{ color: tone }} />
            {data.drift_status}
          </span>
        </div>
      </div>

      <div className="grid grid-3">
        <Panel className="stat stat-sev" style={{ ['--sev-color' as string]: tone }}>
          <div className="stat-label">Drift score (PSI)</div>
          <div className="stat-value">{snap.drift_score.toFixed(3)}</div>
          <div className="stat-sub">
            warn ≥ {snap.warning_threshold} · crit ≥ {snap.critical_threshold}
          </div>
        </Panel>
        <Panel className="stat">
          <div className="stat-label">Recommendation</div>
          <div style={{ marginTop: '0.5rem', fontSize: 'var(--fs-sm)', lineHeight: 1.6, color: 'var(--ink-dim)' }}>
            {data.recommendation}
          </div>
        </Panel>
        <Panel className="stat">
          <div className="stat-label">Last snapshot</div>
          <div className="stat-value" style={{ fontSize: 'var(--fs-md)' }}>
            {dt(snap.timestamp)}
          </div>
          <div className="stat-sub">
            <Icon name="clock" size={11} />
            {relTime(snap.timestamp)}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHead
          title="Drift history"
          kicker={`${data.history.length} snapshots`}
          actions={
            <ChartLegend
              items={[
                { label: 'PSI', color: 'var(--cyan)' },
                { label: 'Warning', color: 'var(--warn)' },
                { label: 'Critical', color: 'var(--danger)' },
              ]}
            />
          }
        />
        <PanelBody>
          {history.length > 1 ? (
            <AreaChart
              data={history}
              height={230}
              min={0}
              color={tone}
              bands={[
                { at: snap.warning_threshold, color: 'var(--warn)', label: 'warn' },
                { at: snap.critical_threshold, color: 'var(--danger)', label: 'crit' },
              ]}
              yFormat={(v) => v.toFixed(2)}
            />
          ) : (
            <EmptyState
              glyph="◠"
              title="Not enough history yet"
              body="Drift needs at least two snapshots before a trend can be drawn."
            />
          )}
        </PanelBody>
      </Panel>

      <Panel flush>
        <PanelHead
          title="Distribution shift"
          kicker="Training vs current"
          actions={
            <span className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
              deviation is the signed change in class share
            </span>
          }
        />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Class</th>
                <th>Training</th>
                <th>Current</th>
                <th style={{ width: 90, textAlign: 'right' }}>Deviation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const info = classInfo(r.class)
                const negative = r.deviation.trim().startsWith('-')
                return (
                  <tr key={r.class}>
                    <td>
                      <span className="class-dot" style={{ background: info.color }} />
                      {info.label}
                    </td>
                    <td>
                      <div className="dist-bar">
                        <span
                          className="dist-track">
                          <i
                            style={{
                              width: `${(r.training / maxShare) * 100}%`,
                              background: info.color,
                              opacity: 0.4,
                            }}
                          />
                        </span>
                        <span className="dist-val">{pct(r.training, 2)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="dist-bar">
                        <span className="dist-track">
                          <i
                            style={{
                              width: `${(r.current / maxShare) * 100}%`,
                              background: info.color,
                            }}
                          />
                        </span>
                        <span className="dist-val">{pct(r.current, 2)}</span>
                      </div>
                    </td>
                    <td
                      className="ta-r num-cell"
                      style={{ color: negative ? 'var(--danger)' : 'var(--ok)' }}
                    >
                      {r.deviation}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Note kind={data.drift_status === 'critical' ? 'danger' : data.drift_status === 'warning' ? 'warn' : 'ok'}>
        PSI above {snap.warning_threshold} means the live class mix no longer resembles training. The
        model is not automatically wrong — precision and recall on the Model health page are the
        check that matters.
      </Note>

      <Panel>
        <PanelHead title="Thresholds" />
        <PanelBody>
          <div className="kv-inline">
            <span>Warning</span>
            <strong>{snap.warning_threshold}</strong>
            <span>Critical</span>
            <strong>{snap.critical_threshold}</strong>
            <span>Observed</span>
            <strong style={{ color: tone }}>{snap.drift_score.toFixed(3)}</strong>
            <span>Snapshot</span>
            <strong>{num(data.history.length)}</strong>
          </div>
        </PanelBody>
      </Panel>
    </main>
  )
}
