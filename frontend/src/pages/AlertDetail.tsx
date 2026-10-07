/**
 * Alert detail — the triage surface.
 *
 * Shows what the model actually said (the full probability vector, not just
 * the top label), the traffic record that triggered it, and the state machine
 * for moving it forward. Status changes PATCH the alert and are audited
 * server-side.
 */

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type AlertStatus, type Resolution } from '../lib/api'
import { useToast } from '../lib/toast'
import { qk } from '../lib/query'
import {
  CLASS_ORDER,
  RESOLUTION,
  TRANSITIONS,
  classInfo,
  severityTone,
  statusTone,
} from '../lib/meta'
import { dt, pct, relTime } from '../lib/format'
import { ProbabilityBars } from '../components/charts'
import { Icon } from '../components/ui/Icon'
import {
  Button,
  ClassChip,
  EmptyState,
  KeyValue,
  Note,
  Panel,
  PanelBody,
  PanelHead,
  SeverityBadge,
  Skeleton,
  StatusBadge,
  Textarea,
} from '../components/ui'

/** NSL-KDD features worth showing first; the record has 40+ columns. */
const FEATURE_FOCUS = [
  'duration',
  'protocol_type',
  'service',
  'flag',
  'src_bytes',
  'dst_bytes',
  'land',
  'logged_in',
  'root_shell',
  'num_connections',
  'num_outbound_conns',
] as const

export function AlertDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [notes, setNotes] = useState<string | null>(null)

  const alert = useQuery({
    queryKey: qk.alert(id),
    queryFn: ({ signal }) => api.alerts.detail(id, signal),
    enabled: Boolean(id),
  })

  const update = useMutation({
    mutationFn: (body: { status?: AlertStatus; resolution?: Resolution; notes?: string | null }) =>
      api.alerts.update(id, body),
    onSuccess: (updated) => {
      toast.push('ok', 'Alert updated', `Now ${statusTone(updated.status).label.toLowerCase()}.`)
      qc.setQueryData(qk.alert(id), updated)
      void qc.invalidateQueries({ queryKey: ['alerts'] })
    },
    onError: (err) => {
      toast.push('error', 'Update failed', err instanceof Error ? err.message : 'Unexpected error.')
    },
  })

  if (alert.isPending) {
    return (
      <main className="page">
        <Skeleton height={16} width="12rem" />
        <Panel>
          <Skeleton height={140} />
        </Panel>
        <Panel>
          <Skeleton height={220} />
        </Panel>
      </main>
    )
  }

  if (alert.isError || !alert.data) {
    return (
      <main className="page">
        <Link to="/app/alerts" className="crumbs">
          <Icon name="chevronLeft" size={11} />
          Alerts
        </Link>
        <Panel>
          <EmptyState
            glyph="!"
            title="Alert not found"
            body="It may have been removed, or the identifier is wrong."
            action={
              <Link to="/app/alerts" className="btn btn-sm" style={{ marginTop: '0.5rem' }}>
                Back to alerts
              </Link>
            }
          />
        </Panel>
      </main>
    )
  }

  const a = alert.data
  const tone = severityTone(a.severity)
  const nextStates = TRANSITIONS[a.status]
  const record = a.traffic_record ?? {}
  const predicted = classInfo(a.predicted_label)

  const features = FEATURE_FOCUS.map((key) => {
    const value = (record as Record<string, unknown>)[key]
    return [key, value === undefined || value === null ? '—' : String(value)] as const
  })

  return (
    <main className="page">
      <div className="crumbs">
        <Link to="/app/alerts">Alerts</Link>
        <Icon name="chevronRight" size={11} />
        <span>{a.id.slice(0, 8)}</span>
      </div>

      <div className="page-head">
        <div>
          <div className="row gap-2" style={{ marginBottom: '0.5rem' }}>
            <SeverityBadge severity={a.severity} size="lg" />
            <ClassChip label={a.predicted_label} strong />
            <StatusBadge status={a.status} />
          </div>
          <h2>{predicted.label} detected</h2>
          <p>
            {a.recommendation}
          </p>
        </div>
        <div className="page-tools">
          <span className="mono faint" style={{ fontSize: 'var(--fs-micro)' }}>
            {a.model_version}
          </span>
        </div>
      </div>

      <div className="split-main">
        <div className="grid">
          {/* Verdict */}
          <Panel>
            <PanelHead title="Model verdict" kicker={a.model_version} />
            <PanelBody>
              <div className="verdict">
                <div className="verdict-main">
                  <span className="verdict-label">Predicted</span>
                  <span className="verdict-class" style={{ color: predicted.color }}>
                    {predicted.label}
                  </span>
                  <span className="verdict-conf" style={{ color: tone.color }}>
                    {pct(a.confidence, 1)}
                  </span>
                </div>
                <div className="verdict-grid">
                  <KeyValue
                    items={[
                      ['Severity', <SeverityBadge severity={a.severity} key="s" />],
                      ['Confidence', pct(a.confidence, 3)],
                      ['Detected', dt(a.created_at)],
                      ['Updated', `${relTime(a.updated_at)}`],
                    ]}
                  />
                </div>
              </div>

              <div className="sub-head">
                <span className="micro">Full probability vector</span>
                <span className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                  calibrated softmax output
                </span>
              </div>
              <ProbabilityBars
                entries={CLASS_ORDER.map((key) => ({
                  label: classInfo(key).label,
                  value: a.probabilities?.[key] ?? 0,
                  color: classInfo(key).color,
                  top: key === a.predicted_label,
                })).sort((x, y) => y.value - x.value)}
              />

              <Note kind="info">
                <strong>{predicted.label}</strong> — {predicted.blurb} Typical families:{' '}
                <span className="mono">{predicted.examples}</span>
              </Note>
            </PanelBody>
          </Panel>

          {/* Traffic record */}
          <Panel>
            <PanelHead
              title="Triggering record"
              kicker={relTime(record.ingested_at)}
              actions={
                a.source_ip && (
                  <span className="mono faint" style={{ fontSize: 'var(--fs-micro)' }}>
                    {a.source_ip}:{a.source_port ?? '—'} → {a.dest_ip ?? '—'}:{a.dest_port ?? '—'}
                  </span>
                )
              }
            />
            <PanelBody>
              <div className="feat-grid">
                {features.map(([k, v]) => (
                  <div className="feat" key={k}>
                    <span className="feat-key">{k}</span>
                    <span className="feat-val">{v}</span>
                  </div>
                ))}
              </div>
              <details className="raw">
                <summary>All {Object.keys(record).length} record fields</summary>
                <div className="feat-grid">
                  {Object.entries(record)
                    .filter(([k]) => !FEATURE_FOCUS.includes(k as (typeof FEATURE_FOCUS)[number]))
                    .map(([k, v]) => (
                      <div className="feat" key={k}>
                        <span className="feat-key">{k}</span>
                        <span className="feat-val">{v === null ? '—' : String(v)}</span>
                      </div>
                    ))}
                </div>
              </details>
            </PanelBody>
          </Panel>

          {/* Notes */}
          <Panel>
            <PanelHead title="Analyst notes" />
            <PanelBody>
              {a.notes && !notes && (
                <p className="existing-notes">{a.notes}</p>
              )}
              <Textarea
                rows={3}
                placeholder="What you concluded, and why. Saved with the alert and written to the audit log."
                value={notes ?? a.notes ?? ''}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="row-between" style={{ marginTop: '0.625rem' }}>
                <span className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                  {a.resolved_by ? `Last resolved by ${a.resolved_by.username}` : 'Not resolved yet'}
                </span>
                <Button
                  size="sm"
                  icon="check"
                  disabled={!notes || notes === a.notes || update.isPending}
                  onClick={() => update.mutate({ notes })}
                >
                  Save notes
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>

        {/* Triage sidebar */}
        <div className="grid">
          <Panel>
            <PanelHead title="Triage" />
            <PanelBody>
              {a.resolution && (
                <div className="resolution-box">
                  <span className="micro">Verdict</span>
                  <span
                    className="resolution-value"
                    style={{ color: RESOLUTION[a.resolution].tone.color }}
                  >
                    {RESOLUTION[a.resolution].glyph} {RESOLUTION[a.resolution].label}
                  </span>
                </div>
              )}

              {nextStates.length === 0 ? (
                <Note kind="ok" icon="check">
                  This alert is resolved. The status machine has no further transitions.
                </Note>
              ) : (
                <>
                  <span className="micro">Move to</span>
                  <div className="row gap-2 wrap" style={{ marginTop: '0.5rem' }}>
                    {nextStates.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        icon={s === 'resolved' ? 'check' : s === 'escalated' ? 'warning' : 'eye'}
                        disabled={update.isPending}
                        onClick={() => update.mutate({ status: s })}
                      >
                        {statusTone(s).label}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {a.status !== 'resolved' && (
                <>
                  <div className="sub-head" style={{ marginTop: '1rem' }}>
                    <span className="micro">Mark as</span>
                  </div>
                  <div className="row gap-2">
                    {(['true_positive', 'false_positive'] as Resolution[]).map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={a.resolution === r ? 'primary' : 'default'}
                        disabled={update.isPending}
                        onClick={() => update.mutate({ resolution: r, status: 'resolved' })}
                      >
                        {RESOLUTION[r].glyph} {RESOLUTION[r].label}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Provenance" />
            <PanelBody>
              <KeyValue
                items={[
                  ['Alert ID', <span className="mono break" key="id">{a.id}</span>],
                  ['Record ID', <span className="mono break" key="r">{record.id ?? '—'}</span>],
                  ['Model', a.model_version],
                  ['Ingested', dt(record.ingested_at)],
                  ['Created', dt(a.created_at)],
                  ['Updated', dt(a.updated_at)],
                ]}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <Button
                block
                variant="ghost"
                icon="chevronLeft"
                onClick={() => navigate('/app/alerts')}
              >
                Back to queue
              </Button>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </main>
  )
}
