/**
 * Alerts — the triage queue.
 *
 * Filters map one-to-one onto the query parameters `GET /api/alerts/` accepts,
 * so the URL is the source of truth: an analyst can bookmark a filtered queue
 * or send it to a colleague.
 */

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type AlertFilters, type AlertStatus, type ClassLabel, type Severity } from '../lib/api'
import { POLL_MS, qk } from '../lib/query'
import { ORDERINGS, SEVERITY, SEVERITY_ORDER, STATUS, STATUS_ORDER, classInfo, severityTone } from '../lib/meta'
import { num, pct, relTime } from '../lib/format'
import { Icon } from '../components/ui/Icon'
import {
  ClassChip,
  EmptyState,
  Field,
  Panel,
  PanelBody,
  PanelHead,
  Select,
  SeverityBadge,
  Skeleton,
  StatusBadge,
  TextInput,
} from '../components/ui'

const CLASS_OPTIONS: Array<ClassLabel | ''> = ['normal', 'dos', 'probe', 'r2l', 'u2r', '']

/** Read a comma-separated list param into a typed array. */
function listParam<T extends string>(raw: string | null): T[] {
  if (!raw) return []
  return raw.split(',').filter(Boolean) as T[]
}

export function Alerts() {
  const [params, setParams] = useSearchParams()

  const status = listParam<AlertStatus>(params.get('status'))
  const severity = listParam<Severity>(params.get('severity'))
  const predicted = (params.get('label') ?? '') as ClassLabel | ''
  const search = params.get('search') ?? ''
  const ordering = params.get('ordering') ?? '-severity,-created_at'
  const minConfidence = params.get('min_confidence') ?? ''
  const page = Number(params.get('page') ?? '1')

  const [searchDraft, setSearchDraft] = useState(search)

  /**
   * Rebuilt every render on purpose: TanStack Query hashes the key
   * deterministically, so an identical filter set never triggers a refetch and
   * memoising it would only add a stale-closure hazard.
   */
  const filters: AlertFilters = {
    ...(status.length ? { status } : {}),
    ...(severity.length ? { severity } : {}),
    ...(predicted ? { predicted_label: predicted } : {}),
    ...(search ? { search } : {}),
    ...(minConfidence ? { min_confidence: Number(minConfidence) } : {}),
    ordering,
    page,
    page_size: 25,
  }

  const query = useQuery({
    queryKey: qk.alerts(filters),
    queryFn: ({ signal }) => api.alerts.list(filters, signal),
    refetchInterval: POLL_MS,
  })

  /** Merges a patch into the URL and resets pagination. */
  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  function toggleCsv(key: 'status' | 'severity', value: string) {
    const current = listParam<string>(params.get(key))
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    update({ [key]: next.join(',') || null })
  }

  const total = query.data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / 25))
  const activeFilterCount =
    status.length + severity.length + (predicted ? 1 : 0) + (search ? 1 : 0) + (minConfidence ? 1 : 0)

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Alerts</h2>
          <p>
            {query.isPending ? 'Loading…' : `${num(total)} matching ${total === 1 ? 'alert' : 'alerts'}`}
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`}
          </p>
        </div>
        <div className="page-tools">
          <Link to="/app/ingest" className="btn btn-sm">
            <Icon name="ingest" size={12} />
            Ingest
          </Link>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <Icon name="refresh" size={12} />
            Refresh
          </button>
        </div>
      </div>

      <Panel className="filters">
        <div className="filters-row">
          <div className="field field-search">
            <label htmlFor="q">Search</label>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                update({ search: searchDraft || null })
              }}
            >
              <TextInput
                id="q"
                value={searchDraft}
                placeholder="Model version, notes, address…"
                onChange={(e) => setSearchDraft(e.target.value)}
              />
            </form>
          </div>

          <Field label="Predicted class" htmlFor="label">
            <Select
              id="label"
              value={predicted}
              onChange={(e) => update({ label: e.target.value || null })}
            >
              {CLASS_OPTIONS.map((c) => (
                <option key={c || 'any'} value={c}>
                  {c ? classInfo(c).label : 'Any class'}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Min confidence" htmlFor="conf">
            <Select
              id="conf"
              value={minConfidence}
              onChange={(e) => update({ min_confidence: e.target.value || null })}
            >
              <option value="">Any</option>
              <option value="0.5">≥ 50%</option>
              <option value="0.7">≥ 70%</option>
              <option value="0.85">≥ 85%</option>
              <option value="0.95">≥ 95%</option>
            </Select>
          </Field>

          <Field label="Order by" htmlFor="order">
            <Select
              id="order"
              value={ordering}
              onChange={(e) => update({ ordering: e.target.value })}
            >
              {ORDERINGS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="filters-row">
          <div className="field">
            <label>Severity</label>
            <div className="chipset">
              {SEVERITY_ORDER.map((s) => {
                const on = severity.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    className={`chip ${on ? 'chip-on' : ''}`}
                    style={{ ['--chip-color' as string]: SEVERITY[s].color }}
                    onClick={() => toggleCsv('severity', s)}
                    aria-pressed={on}
                  >
                    {SEVERITY[s].short}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="field">
            <label>Status</label>
            <div className="chipset">
              {STATUS_ORDER.map((s) => {
                const on = status.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    className={`chip ${on ? 'chip-on' : ''}`}
                    style={{ ['--chip-color' as string]: STATUS[s].color }}
                    onClick={() => toggleCsv('status', s)}
                    aria-pressed={on}
                  >
                    {STATUS[s].label}
                  </button>
                )
              })}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchDraft('')
                setParams(new URLSearchParams(), { replace: true })
              }}
            >
              <Icon name="x" size={12} />
              Clear
            </button>
          )}
        </div>
      </Panel>

      <Panel flush>
        <PanelHead
          title="Results"
          kicker={query.isFetching ? 'Syncing' : 'Live'}
        />

        {query.isPending ? (
          <PanelBody>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={38} />
            ))}
          </PanelBody>
        ) : query.isError ? (
          <PanelBody>
            <EmptyState glyph="!" title="Could not load alerts" body="The API returned an error." />
          </PanelBody>
        ) : query.data && query.data.results.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>Severity</th>
                    <th style={{ width: 68 }}>Class</th>
                    <th>Detected</th>
                    <th style={{ width: 96 }}>Status</th>
                    <th style={{ width: 110 }}>Confidence</th>
                    <th style={{ width: 96 }}>Model</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {query.data.results.map((a) => (
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
                          {a.id.slice(0, 8)}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>
                        <div className="conf-cell">
                          <span className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                            {pct(a.confidence, 1)}
                          </span>
                          <span className="conf-bar">
                            <i
                              style={{
                                width: `${a.confidence * 100}%`,
                                background: severityTone(a.severity).color,
                              }}
                            />
                          </span>
                        </div>
                      </td>
                      <td className="mono faint" style={{ fontSize: 'var(--fs-micro)' }}>
                        {a.model_version}
                      </td>
                      <td>
                        <Link to={`/app/alerts/${a.id}`} className="btn btn-ghost btn-sm" aria-label="Open">
                          <Icon name="chevronRight" size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="pager">
                <span>
                  Page {page} of {pageCount} · {num(total)} total
                </span>
                <div className="row gap-2">
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={page <= 1}
                    onClick={() => update({ page: String(page - 1) })}
                  >
                    <Icon name="chevronLeft" size={12} />
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={page >= pageCount}
                    onClick={() => update({ page: String(page + 1) })}
                  >
                    Next
                    <Icon name="chevronRight" size={12} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <PanelBody>
            <EmptyState
              glyph="✓"
              title="Nothing matches these filters"
              body={
                activeFilterCount > 0
                  ? 'Widen the filters, or clear them to see the full queue.'
                  : 'No alerts recorded yet. POST a record to /api/ingest/ to create one.'
              }
              action={
                activeFilterCount > 0 ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ marginTop: '0.5rem' }}
                    onClick={() => {
                      setSearchDraft('')
                      setParams(new URLSearchParams(), { replace: true })
                    }}
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          </PanelBody>
        )}
      </Panel>
    </main>
  )
}
