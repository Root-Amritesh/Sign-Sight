/**
 * Audit log — admin only.
 *
 * Append-only. Each row shows who did what to which target, with the old and new
 * values for every changed field, which is what makes a verdict reconstructable
 * after the fact.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type AuditFilters } from '../lib/api'
import { qk } from '../lib/query'
import { dt, num, relTime } from '../lib/format'
import { Icon } from '../components/ui/Icon'
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Panel,
  PanelBody,
  PanelHead,
  Select,
  Skeleton,
  Tabs,
  TextInput,
} from '../components/ui'

/** Audit actions are a closed set; group them for filtering. */
const ACTION_GROUPS: Record<string, string> = {
  resolve: 'triage',
  update: 'triage',
  escalate: 'triage',
  deploy: 'model',
  rollback: 'model',
  threshold: 'config',
  login: 'auth',
}

const GROUPS = ['all', 'triage', 'model', 'config', 'auth'] as const

function actionTone(action: string): 'cyan' | 'violet' | 'warn' | 'ok' | 'default' {
  if (action.includes('delete') || action.includes('rollback')) return 'warn'
  if (action.includes('deploy')) return 'violet'
  if (action.includes('resolve') || action.includes('escalate')) return 'ok'
  if (action.includes('login')) return 'default'
  return 'cyan'
}

export function AuditLog() {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('all')
  const [actor, setActor] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [page, setPage] = useState(1)

  const filters = useMemo<AuditFilters>(
    () => ({
      ...(actor ? { actor: Number(actor) } : {}),
      ...(search ? { action: search } : {}),
    }),
    [actor, search],
  )

  const query = useQuery({
    queryKey: qk.audit(filters),
    queryFn: ({ signal }) => api.audit.list(filters, signal),
  })

  const rows = (query.data?.results ?? []).filter((e) => {
    if (group === 'all') return true
    return ACTION_GROUPS[Object.keys(ACTION_GROUPS).find((k) => e.action.includes(k)) ?? ''] === group
  })

  const pageCount = Math.max(1, Math.ceil(rows.length / 25))
  const visible = rows.slice((page - 1) * 25, page * 25)

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Audit log</h2>
          <p>
            Append-only record of every mutation.{' '}
            {query.data && `${num(query.data.count)} entries.`}
          </p>
        </div>
      </div>

      <Panel className="filters">
        <div className="filters-row">
          <div className="field field-search">
            <label htmlFor="action">Action contains</label>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSearch(draft)
                setPage(1)
              }}
            >
              <TextInput
                id="action"
                value={draft}
                placeholder="resolve, deploy, threshold…"
                onChange={(e) => setDraft(e.target.value)}
              />
            </form>
          </div>

          <Field label="Actor id" htmlFor="actor">
            <TextInput
              id="actor"
              type="number"
              value={actor}
              placeholder="Any"
              onChange={(e) => {
                setActor(e.target.value)
                setPage(1)
              }}
            />
          </Field>

          <Field label="Category" htmlFor="group">
            <Select
              id="group"
              value={group}
              onChange={(e) => {
                setGroup(e.target.value as (typeof GROUPS)[number])
                setPage(1)
              }}
            >
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g === 'all' ? 'All actions' : g}
                </option>
              ))}
            </Select>
          </Field>

          {(actor || search || group !== 'all') && (
            <Button
              size="sm"
              icon="x"
              onClick={() => {
                setActor('')
                setSearch('')
                setDraft('')
                setGroup('all')
                setPage(1)
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Panel>

      <Panel flush>
        <PanelHead
          title="Entries"
          actions={
            <Tabs
              items={GROUPS.map((g) => ({ id: g, label: g === 'all' ? 'All' : g }))}
              value={group}
              onChange={(id) => {
                setGroup(id as (typeof GROUPS)[number])
                setPage(1)
              }}
            />
          }
        />

        {query.isPending ? (
          <PanelBody>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={40} />
            ))}
          </PanelBody>
        ) : query.isError ? (
          <PanelBody>
            <EmptyState glyph="!" title="Could not load the audit log" />
          </PanelBody>
        ) : visible.length === 0 ? (
          <PanelBody>
            <EmptyState
              glyph="—"
              title="No audit entries match"
              body="Triage an alert or deploy a model, and the change will appear here."
            />
          </PanelBody>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>When</th>
                    <th style={{ width: 130 }}>Actor</th>
                    <th style={{ width: 170 }}>Action</th>
                    <th style={{ width: 150 }}>Target</th>
                    <th>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr key={e.id}>
                      <td title={dt(e.timestamp)}>
                        {relTime(e.timestamp)}
                        <div className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                          {e.id}
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                        {e.actor?.username ?? <span className="faint">system</span>}
                      </td>
                      <td>
                        <Badge tone={actionTone(e.action)}>{e.action}</Badge>
                      </td>
                      <td className="mono faint" style={{ fontSize: 'var(--fs-micro)' }}>
                        {e.target_type}
                        <br />
                        {e.target_id.slice(0, 12)}
                      </td>
                      <td>
                        {Object.keys(e.changes ?? {}).length === 0 ? (
                          <span className="faint">—</span>
                        ) : (
                          <div className="changes">
                            {Object.entries(e.changes).map(([field, v]) => (
                              <div className="change" key={field}>
                                <span className="change-field">{field}</span>
                                <span className="change-old">{fmt(v.old)}</span>
                                <Icon name="arrowRight" size={10} />
                                <span className="change-new">{fmt(v.new)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {e.notes && (
                          <div className="faint" style={{ fontSize: 'var(--fs-micro)', marginTop: '0.25rem' }}>
                            {e.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="pager">
                <span>
                  Page {page} of {pageCount} · {num(rows.length)} entries
                </span>
                <div className="row gap-2">
                  <Button size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <Icon name="chevronLeft" size={12} />
                    Previous
                  </Button>
                  <Button size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
                    Next
                    <Icon name="chevronRight" size={12} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
    </main>
  )
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '∅'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  const s = String(v)
  return s.length > 40 ? `${s.slice(0, 40)}…` : s
}
