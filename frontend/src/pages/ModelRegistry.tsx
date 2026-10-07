/**
 * Model registry — admin only.
 *
 * Every trained artifact stays listed with the metrics it was validated at, so
 * a rollback target is a known quantity rather than a guess. Deployment and
 * rollback both write audit records.
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import { SLOW_POLL_MS, qk } from '../lib/query'
import { dt, num, pct, relTime } from '../lib/format'
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Note,
  Panel,
  PanelBody,
  PanelHead,
  Skeleton,
  TextInput,
} from '../components/ui'

export function ModelRegistry() {
  const toast = useToast()
  const qc = useQueryClient()
  const [version, setVersion] = useState('')
  const [artifact, setArtifact] = useState('')

  const models = useQuery({
    queryKey: qk.models,
    queryFn: ({ signal }) => api.models.list(signal),
    refetchInterval: SLOW_POLL_MS,
  })

  const deploy = useMutation({
    mutationFn: () => api.models.deploy({ version: version.trim(), artifact_path: artifact.trim() }),
    onSuccess: (res) => {
      toast.push('ok', 'Model deployed', `${res.version} is now serving. ${res.message}`)
      setVersion('')
      setArtifact('')
      void qc.invalidateQueries({ queryKey: ['models'] })
      void qc.invalidateQueries({ queryKey: ['metrics'] })
      void qc.invalidateQueries({ queryKey: ['health'] })
    },
    onError: (e) => toast.push('error', 'Deployment failed', e instanceof Error ? e.message : ''),
  })

  const rollback = useMutation({
    mutationFn: (v: string) => api.models.rollback(v),
    onSuccess: (res) => {
      toast.push('ok', 'Rolled back', `${res.message} Active version is now ${res.version}.`)
      void qc.invalidateQueries({ queryKey: ['models'] })
      void qc.invalidateQueries({ queryKey: ['metrics'] })
      void qc.invalidateQueries({ queryKey: ['health'] })
    },
    onError: (e) => toast.push('error', 'Rollback failed', e instanceof Error ? e.message : ''),
  })

  const list = models.data?.models ?? []
  const active = models.data?.active_version

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Model registry</h2>
          <p>
            {models.isPending
              ? 'Loading versions…'
              : `${num(list.length)} version${list.length === 1 ? '' : 's'} registered · active: ${active ?? 'none'}`}
          </p>
        </div>
      </div>

      <div className="split-main">
        <Panel flush>
          <PanelHead title="Versions" kicker="Newest deployment first" />
          {models.isPending ? (
            <PanelBody>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} height={46} />
              ))}
            </PanelBody>
          ) : models.isError ? (
            <PanelBody>
              <EmptyState glyph="!" title="Could not load the registry" />
            </PanelBody>
          ) : list.length === 0 ? (
            <PanelBody>
              <EmptyState
                glyph="◎"
                title="No models registered"
                body="Deploy a trained artifact to start serving predictions."
              />
            </PanelBody>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Dataset</th>
                    <th className="ta-r">Accuracy</th>
                    <th className="ta-r">Macro AUC</th>
                    <th>Deployed</th>
                    <th style={{ width: 110 }} />
                  </tr>
                </thead>
                <tbody>
                  {list.map((m) => (
                    <tr key={m.version} className={m.is_active ? 'row-active' : ''}>
                      <td>
                        <span className="mono" style={{ color: m.is_active ? 'var(--cyan)' : 'var(--ink)' }}>
                          {m.version}
                        </span>
                        {m.is_active && (
                          <>
                            {' '}
                            <Badge tone="cyan">Active</Badge>
                          </>
                        )}
                        <div className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                          {m.model_type} · by {m.deployed_by}
                        </div>
                      </td>
                      <td className="mono faint" style={{ fontSize: 'var(--fs-micro)' }}>
                        {m.dataset}
                      </td>
                      <td className="ta-r num-cell">{pct(m.accuracy)}</td>
                      <td className="ta-r num-cell">{pct(m.auc_macro)}</td>
                      <td title={dt(m.deployed_at)}>{relTime(m.deployed_at)}</td>
                      <td>
                        {!m.is_active && (
                          <Button
                            size="sm"
                            disabled={rollback.isPending}
                            onClick={() => rollback.mutate(m.version)}
                          >
                            Roll back
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid">
          <Panel>
            <PanelHead title="Deploy" kicker="POST /api/models/deploy/" />
            <PanelBody>
              <Field label="Version" htmlFor="version">
                <TextInput
                  id="version"
                  value={version}
                  placeholder="nsldd-xgb-2026.03.1"
                  onChange={(e) => setVersion(e.target.value)}
                />
              </Field>
              <Field label="Artifact path" htmlFor="artifact">
                <TextInput
                  id="artifact"
                  value={artifact}
                  placeholder="/opt/signsight/models/xgb.pkl"
                  onChange={(e) => setArtifact(e.target.value)}
                />
              </Field>
              <Button
                variant="primary"
                block
                icon="upload"
                style={{ marginTop: '0.875rem' }}
                disabled={!version.trim() || !artifact.trim() || deploy.isPending}
                onClick={() => deploy.mutate()}
              >
                {deploy.isPending ? 'Deploying…' : 'Deploy model'}
              </Button>
              <Note kind="warn" >
                Deployment replaces the serving model immediately. Metrics and drift recompute against
                the new version on the next poll.
              </Note>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Rollback" kicker="POST /api/models/rollback/" />
            <PanelBody>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-faint)', lineHeight: 1.6 }}>
                Rollback takes a single version and makes it active. The current version stays in the
                registry, so this is reversible too.
              </p>
              <div className="row-between" style={{ marginTop: '0.75rem' }}>
                <span className="micro">Active now</span>
                <span className="mono" style={{ color: 'var(--cyan)' }}>
                  {active ?? '—'}
                </span>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </main>
  )
}
