/**
 * Ingest — get traffic into the pipeline.
 *
 * Three ways in, matching the three ingest endpoints: a single record posted by
 * hand, a CSV batch that runs through Celery, and a paced replay of a dataset
 * so the dashboard fills up on a realistic distribution.
 */

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, type IngestResponse, type ReplayRequest, type TrafficRecordInput } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { qk } from '../lib/query'
import { CLASS_ORDER, classInfo } from '../lib/meta'
import { num, pct } from '../lib/format'
import { ProbabilityBars } from '../components/charts'
import { Icon } from '../components/ui/Icon'
import {
  Button,
  Field,
  Meter,
  Note,
  Panel,
  PanelBody,
  PanelHead,
  Skeleton,
  TextInput,
} from '../components/ui'

/** A representative NSL-KDD record so the form can be posted as-is. */
const SAMPLE: TrafficRecordInput = {
  duration: 0,
  protocol_type: 'tcp',
  service: 'http',
  flag: 'SF',
  src_bytes: 239,
  dst_bytes: 486,
  land: 0,
  wrong_fragment: 0,
  urgent: 0,
  hot: 0,
  num_failed_logins: 0,
  logged_in: 0,
  num_compromised: 0,
  root_shell: 0,
  su_attempted: 0,
  num_root: 0,
  num_file_creations: 0,
  num_shells: 0,
  num_access_files: 0,
  num_outbound_cmds: 0,
  is_host_login: 0,
  is_guest_login: 0,
  count: 13,
  srv_count: 13,
  serror_rate: 0.0,
  srv_serror_rate: 0.0,
  rerror_rate: 0.0,
  srv_rerror_rate: 0.0,
  same_srv_rate: 1.0,
  diff_srv_rate: 0.0,
  srv_diff_host_rate: 0.0,
  dst_host_count: 2,
  dst_host_srv_count: 2,
  dst_host_same_srv_rate: 1.0,
  dst_host_diff_srv_rate: 0.0,
  dst_host_same_src_port_rate: 1.0,
  dst_host_srv_diff_host_rate: 0.0,
  dst_host_serror_rate: 0.0,
  dst_host_srv_serror_rate: 0.0,
  dst_host_rerror_rate: 0.0,
  dst_host_srv_rerror_rate: 0.0,
}

const DEFAULT_REPLAY: ReplayRequest = {
  dataset_path: 'data/NSL-KDD/test.csv',
  records_per_second: 5,
  max_records: 2000,
}

const TERMINAL = ['completed', 'failed', 'stopped'] as const

export function Ingest() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [record, setRecord] = useState<TrafficRecordInput>(SAMPLE)
  const [replay, setReplay] = useState<ReplayRequest>(DEFAULT_REPLAY)
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [result, setResult] = useState<IngestResponse | null>(null)

  const task = useQuery({
    queryKey: qk.task(activeTask ?? 'none'),
    queryFn: ({ signal }) => api.ingest.task(activeTask!, signal),
    enabled: Boolean(activeTask) && isAdmin,
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status && (TERMINAL as readonly string[]).includes(status) ? false : 700
    },
  })

  const single = useMutation({
    mutationFn: () => api.ingest.record(record),
    onSuccess: (res) => {
      setResult(res)
      if (res.alert) {
        toast.push(
          'warn',
          'Alert created',
          `${classInfo(res.prediction.label).label} at ${pct(res.prediction.confidence, 1)}.`,
        )
        void qc.invalidateQueries({ queryKey: ['alerts'] })
      } else {
        toast.push('ok', 'Scored as normal', 'Below the alerting floor, so no alert was created.')
      }
    },
    onError: (e) => toast.push('error', 'Ingest failed', e instanceof Error ? e.message : ''),
  })

  const batch = useMutation({
    mutationFn: (file: File) => api.ingest.batch(file),
    onSuccess: (res) => {
      setActiveTask(res.task_id)
      toast.push('info', 'Batch accepted', res.message)
    },
    onError: (e) => toast.push('error', 'Upload failed', e instanceof Error ? e.message : ''),
  })

  const startReplay = useMutation({
    mutationFn: () => api.ingest.startReplay(replay),
    onSuccess: (res) => {
      setActiveTask(res.task_id)
      toast.push(
        'info',
        'Replay started',
        `${num(replay.max_records)} records at ${replay.records_per_second}/s.`,
      )
    },
    onError: (e) => toast.push('error', 'Replay failed', e instanceof Error ? e.message : ''),
  })

  const stopReplay = useMutation({
    mutationFn: () => api.ingest.stopReplay(),
    onSuccess: (res) => {
      toast.push('warn', 'Replay stopping', `${num(res.records_processed)} records processed.`)
      void qc.invalidateQueries({ queryKey: ['ingest'] })
    },
    onError: (e) => toast.push('error', 'Could not stop replay', e instanceof Error ? e.message : ''),
  })

  function set<K extends keyof TrafficRecordInput>(key: K, value: TrafficRecordInput[K]) {
    setRecord((r) => ({ ...r, [key]: value }))
  }

  function setReplayField<K extends keyof ReplayRequest>(key: K, value: ReplayRequest[K]) {
    setReplay((r) => ({ ...r, [key]: value }))
  }

  const progress = task.data?.progress
  const taskRunning = Boolean(
    activeTask && task.data && !(TERMINAL as readonly string[]).includes(task.data.status),
  )

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Ingest</h2>
          <p>
            Three paths in: one record, a CSV batch, or a paced replay. All three score through the
            active model.
          </p>
        </div>
      </div>

      <div className="split-main">
        <div className="grid">
          {/* Single record */}
          <Panel>
            <PanelHead
              title="Single record"
              kicker="POST /api/ingest/"
              actions={
                <Button size="sm" onClick={() => setRecord(SAMPLE)}>
                  <Icon name="refresh" size={12} />
                  Reset
                </Button>
              }
            />
            <PanelBody>
              <div className="grid grid-3" style={{ gap: '0.75rem' }}>
                {(['protocol_type', 'service', 'flag'] as const).map((key) => (
                  <Field key={key} label={key} htmlFor={key}>
                    <TextInput
                      id={key}
                      value={String(record[key])}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  </Field>
                ))}

                {(
                  [
                    'duration',
                    'src_bytes',
                    'dst_bytes',
                    'count',
                    'srv_count',
                    'dst_host_count',
                    'num_failed_logins',
                    'root_shell',
                    'logged_in',
                  ] as const
                ).map((key) => (
                  <Field key={key} label={key} htmlFor={key}>
                    <TextInput
                      id={key}
                      type="number"
                      step="any"
                      value={String(record[key] ?? '')}
                      onChange={(e) => set(key, Number(e.target.value))}
                    />
                  </Field>
                ))}
              </div>

              <div className="row gap-2 wrap" style={{ marginTop: '1rem' }}>
                <Button
                  variant="primary"
                  icon="play"
                  disabled={single.isPending}
                  onClick={() => single.mutate()}
                >
                  {single.isPending ? 'Scoring…' : 'Send record'}
                </Button>
                <span className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                  pre-filled with a representative http/tcp record ·{' '}
                  {Object.keys(record).length} features
                </span>
              </div>

              {result && (
                <div className="result-box">
                  <div className="row-between">
                    <span className="micro">Prediction · {result.record_id.slice(0, 8)}</span>
                    {result.alert ? (
                      <Link to={`/app/alerts/${result.alert.id}`} className="btn btn-sm">
                        Open alert
                        <Icon name="chevronRight" size={12} />
                      </Link>
                    ) : (
                      <span className="badge badge-ok">No alert</span>
                    )}
                  </div>
                  <div className="row gap-3" style={{ marginTop: '0.5rem' }}>
                    <span
                      className="result-class"
                      style={{ color: classInfo(result.prediction.label).color }}
                    >
                      {classInfo(result.prediction.label).label}
                    </span>
                    <span className="result-conf mono">{pct(result.prediction.confidence, 2)}</span>
                    <span className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                      {result.prediction.model_version}
                    </span>
                  </div>
                  <ProbabilityBars
                    entries={CLASS_ORDER.map((c) => ({
                      label: classInfo(c).label,
                      value: result.prediction.probabilities[c] ?? 0,
                      color: classInfo(c).color,
                      top: c === result.prediction.label,
                    })).sort((a, b) => b.value - a.value)}
                  />
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Batch + replay are admin only; the single-record POST is not. */}
          {!isAdmin && (
            <Panel>
              <PanelHead title="Batch and replay" kicker="Administrator only" />
              <PanelBody>
                <Note kind="info">
                  CSV batch upload and dataset replay are restricted to the administrator role. You
                  can still submit a single record above, which every analyst role may do.
                </Note>
              </PanelBody>
            </Panel>
          )}

          {isAdmin && (
            <>
          <Panel>
            <PanelHead title="CSV batch" kicker="POST /api/ingest/batch/" />
            <PanelBody>
              <div
                className="dropzone"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f) batch.mutate(f)
                }}
              >
                <Icon name="upload" size={22} />
                <span className="dropzone-title">Drop a CSV, or click to choose</span>
                <span className="dropzone-hint">
                  Header row matching the NSL-KDD feature names. Processed asynchronously by Celery;
                  poll the returned task id for progress.
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) batch.mutate(f)
                    e.target.value = ''
                  }}
                />
              </div>
              {batch.isPending && (
                <div style={{ marginTop: '0.75rem' }}>
                  <Skeleton height={14} width="50%" />
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Replay */}
          <Panel>
            <PanelHead
              title="Replay"
              kicker="POST /api/ingest/replay/"
              actions={
                taskRunning ? (
                  <Button
                    size="sm"
                    variant="danger"
                    icon="stop"
                    disabled={stopReplay.isPending}
                    onClick={() => stopReplay.mutate()}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    icon="play"
                    disabled={startReplay.isPending}
                    onClick={() => startReplay.mutate()}
                  >
                    Start
                  </Button>
                )
              }
            />
            <PanelBody>
              <div className="grid grid-3" style={{ gap: '0.75rem' }}>
                <Field label="Dataset path" htmlFor="dataset_path">
                  <TextInput
                    id="dataset_path"
                    value={replay.dataset_path}
                    onChange={(e) => setReplayField('dataset_path', e.target.value)}
                  />
                </Field>
                <Field label="Records / second" htmlFor="rps">
                  <TextInput
                    id="rps"
                    type="number"
                    min={1}
                    value={replay.records_per_second}
                    onChange={(e) => setReplayField('records_per_second', Number(e.target.value))}
                  />
                </Field>
                <Field label="Max records" htmlFor="max_records">
                  <TextInput
                    id="max_records"
                    type="number"
                    min={1}
                    value={replay.max_records}
                    onChange={(e) => setReplayField('max_records', Number(e.target.value))}
                  />
                </Field>
              </div>

              {progress && (
                <div className="task-box">
                  <div className="row-between">
                    <span className="micro">Task {task.data?.status}</span>
                    <span className="mono faint" style={{ fontSize: 'var(--fs-micro)' }}>
                      {num(progress.processed)}/{num(progress.total_records)} ·{' '}
                      {progress.percent_complete.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <Meter
                      value={progress.percent_complete}
                      max={100}
                      color={
                        task.data?.status === 'failed'
                          ? 'var(--danger)'
                          : task.data?.status === 'completed'
                            ? 'var(--ok)'
                            : 'var(--cyan)'
                      }
                      striped={task.data?.status === 'processing'}
                      height={8}
                    />
                  </div>
                  <div className="row gap-3 wrap" style={{ marginTop: '0.5rem' }}>
                    <span className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                      {num(progress.alerts_created)} alerts created
                    </span>
                    {progress.errors > 0 && (
                      <span
                        className="mono"
                        style={{ fontSize: 'var(--fs-micro)', color: 'var(--warn)' }}
                      >
                        {num(progress.errors)} errors
                      </span>
                    )}
                  </div>
                </div>
              )}

              {task.data?.status === 'completed' && (
                <Note kind="ok">
                  Replay finished. The dashboard now reflects a full distribution — check the
                  severity mix and drift.
                </Note>
              )}
              {task.data?.status === 'failed' && (
                <Note kind="danger">The task failed. Check the backend logs for the Celery worker.</Note>
              )}
            </PanelBody>
          </Panel>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="grid">
          <Panel>
            <PanelHead title="Endpoints" />
            <PanelBody>
              <ul className="bullets mono">
                <li>
                  <code>POST /api/ingest/</code> — one record, scored synchronously
                </li>
                <li>
                  <code>POST /api/ingest/batch/</code> — CSV, returns a task id
                </li>
                <li>
                  <code>GET /api/ingest/tasks/{'{id}'}/</code> — poll progress
                </li>
                <li>
                  <code>POST /api/ingest/replay/</code> — paced dataset stream
                </li>
                <li>
                  <code>POST /api/ingest/replay/stop/</code> — halt the stream
                </li>
              </ul>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Before you send" />
            <PanelBody>
              <ul className="bullets">
                <li>
                  With no active model the endpoint returns <code>503</code>. Deploy one from the
                  registry first.
                </li>
                <li>
                  Records scoring below <code>min_confidence_to_alert</code> are returned as{' '}
                  <code>normal</code> and create no alert.
                </li>
                <li>
                  Batch and replay run as Celery tasks, so the response only confirms acceptance —
                  poll for progress.
                </li>
                <li>
                  A high rate over a large <code>max_records</code> will generate thousands of
                  alerts and page the triage queue.
                </li>
              </ul>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </main>
  )
}
