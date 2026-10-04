import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Sigil, AttackMark, ExportIcon } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import { useToast } from '../../components/common/Toast';
import { t } from '../../i18n';
import type { UIAlertListItem } from '../../types/api';

interface FilterRow {
  id: string;
  field: string;
  value: string;
}

interface SavedQuery {
  id: string;
  name: string;
  queryStr: string;
  filters?: FilterRow[];
}

const SUPPORTED_FIELDS = [
  { field: 'severity', label: 'Severity', options: ['critical', 'high', 'medium', 'low', 'info'] },
  { field: 'status', label: 'Status', options: ['new', 'viewed', 'escalated', 'resolved'] },
  { field: 'attack_family', label: 'Attack Family', options: ['dos', 'probe', 'r2l', 'u2r', 'normal'] },
  { field: 'is_novel', label: 'Is Novel Anomaly', options: ['true', 'false'] },
  { field: 'search', label: 'Search Keyword' },
];

export const QueryPage: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'builder' | 'raw'>('builder');

  // Filter builder state
  const [filters, setFilters] = useState<FilterRow[]>([
    { id: 'f-1', field: 'severity', value: 'critical' },
  ]);

  // Raw syntax state
  const [rawQuery, setRawQuery] = useState<string>('severity=critical');
  const [rawSyntaxError, setRawSyntaxError] = useState<string | null>(null);

  // Saved queries in localStorage
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>(() => {
    try {
      const stored = localStorage.getItem('signsight_saved_queries');
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return [
      { id: 'sq-1', name: 'Critical DoS Alerts', queryStr: 'severity=critical&attack_family=dos' },
      { id: 'sq-2', name: 'Novel Suspicious Anomalies', queryStr: 'is_novel=true' },
      { id: 'sq-3', name: 'Active Escalated Incidents', queryStr: 'status=escalated' },
    ];
  });

  const [queryNameInput, setQueryNameInput] = useState('');

  // Column visibility chooser
  const [columns, setColumns] = useState<Record<string, boolean>>({
    id: true,
    severity: true,
    timestamp: true,
    sigil: true,
    family: true,
    confidence: true,
    anomaly: true,
    status: true,
  });

  // Convert current state into URL query params
  const queryParams = React.useMemo(() => {
    const params: Record<string, string> = { page_size: '50' };

    if (activeTab === 'raw') {
      const parsed = new URLSearchParams(rawQuery.trim().replace(/^\?/, ''));
      parsed.forEach((val, key) => {
        if (val) params[key] = val;
      });
    } else {
      filters.forEach((f) => {
        if (f.value.trim() !== '') {
          params[f.field] = f.value.trim();
        }
      });
    }
    return params;
  }, [activeTab, rawQuery, filters]);

  // Derived API query string preview
  const apiQueryPreview = React.useMemo(() => {
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => searchParams.append(k, v));
    return `/api/alerts/?${searchParams.toString()}`;
  }, [queryParams]);

  // Execute query against API
  const { data: resultsData, isLoading, refetch } = useQuery({
    queryKey: ['queryResults', queryParams],
    queryFn: () => api.getAlerts(queryParams),
  });

  const alerts: UIAlertListItem[] = resultsData?.results || [];
  const totalCount = resultsData?.count ?? alerts.length;

  // Validate raw syntax on change
  useEffect(() => {
    if (activeTab === 'raw') {
      try {
        const testParams = new URLSearchParams(rawQuery.trim().replace(/^\?/, ''));
        if (rawQuery.trim() && testParams.toString() === '' && !rawQuery.includes('=')) {
          setRawSyntaxError('Format query as param=value (e.g. severity=critical&is_novel=true)');
        } else {
          setRawSyntaxError(null);
        }
      } catch {
        setRawSyntaxError('Invalid query format.');
      }
    }
  }, [rawQuery, activeTab]);

  const addFilterRow = () => {
    setFilters((prev) => [
      ...prev,
      {
        id: `f-${Date.now()}`,
        field: 'status',
        value: 'new',
      },
    ]);
  };

  const removeFilterRow = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFilterRow = (id: string, updates: Partial<FilterRow>) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleSaveQuery = () => {
    if (!queryNameInput.trim()) {
      addToast('Please enter a name for the query.', 'error');
      return;
    }
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => {
      if (k !== 'page_size') searchParams.append(k, v);
    });
    const queryStr = searchParams.toString();

    const newSaved: SavedQuery = {
      id: `sq-${Date.now()}`,
      name: queryNameInput.trim(),
      queryStr,
      filters: activeTab === 'builder' ? filters : undefined,
    };
    const updated = [newSaved, ...savedQueries];
    setSavedQueries(updated);
    try {
      localStorage.setItem('signsight_saved_queries', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    setQueryNameInput('');
    addToast(`Query "${newSaved.name}" saved to browser.`);
  };

  const loadSavedQuery = (sq: SavedQuery) => {
    if (sq.filters) {
      setFilters(sq.filters);
      setActiveTab('builder');
    } else {
      setRawQuery(sq.queryStr);
      setActiveTab('raw');
    }
    addToast(`Loaded query "${sq.name}".`);
  };

  const deleteSavedQuery = (sqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedQueries.filter((q) => q.id !== sqId);
    setSavedQueries(updated);
    try {
      localStorage.setItem('signsight_saved_queries', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (alerts.length === 0) {
      addToast('No records to export.', 'error');
      return;
    }

    const headers = ['ID', 'Severity', 'Created At', 'Predicted Label', 'Confidence', 'Anomaly Score', 'Status', 'Novelty'];
    const rows = alerts.map((a) => [
      a.id,
      a.severity,
      a.createdAt,
      a.predictedLabel,
      a.confidence.toFixed(2),
      (a.anomalyScore ?? 0).toFixed(3),
      a.status,
      a.alertType === 'novel_suspicious' ? 'Yes' : 'No',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `signsight_query_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV export downloaded.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
            {t('query.title', 'Telemetry Query Workspace')}
          </h1>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            Multi-field structured search and backend parameter execution
          </div>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', border: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            style={{
              height: '30px',
              padding: '0 14px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              backgroundColor: activeTab === 'builder' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'builder' ? 'var(--accent)' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('query.builderTab', 'Filter Builder')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('raw')}
            style={{
              height: '30px',
              padding: '0 14px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              backgroundColor: activeTab === 'raw' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'raw' ? 'var(--accent)' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('query.rawTab', 'Raw Parameters')}
          </button>
        </div>
      </div>

      {/* Main Grid: Saved queries sidebar (left) + Builder & Results (right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left: Saved Queries */}
        <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="label-caps">In-Browser Saved Queries</div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Query name..."
              value={queryNameInput}
              onChange={(e) => setQueryNameInput(e.target.value)}
              className="input"
              style={{ height: '28px', fontSize: '11px' }}
            />
            <button
              type="button"
              onClick={handleSaveQuery}
              className="btn btn-secondary"
              style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
            >
              Save
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
            {savedQueries.map((sq) => (
              <div
                key={sq.id}
                onClick={() => loadSavedQuery(sq)}
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>
                    {sq.name}
                  </div>
                  <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {sq.queryStr}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => deleteSavedQuery(sq.id, e)}
                  style={{
                    color: 'var(--text-faint)',
                    fontSize: '14px',
                    background: 'none',
                    border: 'none',
                    padding: '2px 4px',
                    cursor: 'pointer',
                  }}
                  title="Delete query"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Workspace & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Builder or Raw Box */}
          <div className="panel" style={{ padding: '16px' }}>
            {activeTab === 'builder' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="label-caps">Filter Builder Rules</div>

                {filters.map((f) => {
                  const fieldDef = SUPPORTED_FIELDS.find((sf) => sf.field === f.field);
                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Field select */}
                      <select
                        value={f.field}
                        onChange={(e) => {
                          const newField = e.target.value;
                          const newDef = SUPPORTED_FIELDS.find((sf) => sf.field === newField);
                          updateFilterRow(f.id, {
                            field: newField,
                            value: newDef?.options ? newDef.options[0] : '',
                          });
                        }}
                        className="select"
                        style={{ width: '160px', height: '30px', fontSize: '12px' }}
                      >
                        {SUPPORTED_FIELDS.map((sf) => (
                          <option key={sf.field} value={sf.field}>
                            {sf.label}
                          </option>
                        ))}
                      </select>

                      {/* Value Input or Select */}
                      {fieldDef?.options ? (
                        <select
                          value={f.value}
                          onChange={(e) => updateFilterRow(f.id, { value: e.target.value })}
                          className="select font-mono"
                          style={{ flex: 1, minWidth: '140px', height: '30px', fontSize: '12px' }}
                        >
                          {fieldDef.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Search keyword..."
                          value={f.value}
                          onChange={(e) => updateFilterRow(f.id, { value: e.target.value })}
                          className="input input-mono"
                          style={{ flex: 1, minWidth: '140px', height: '30px', fontSize: '12px' }}
                        />
                      )}

                      {/* Remove row */}
                      {filters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFilterRow(f.id)}
                          className="btn btn-secondary"
                          style={{ height: '30px', padding: '0 8px' }}
                          title="Remove row"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={addFilterRow}
                    className="btn btn-secondary"
                    style={{ height: '28px', fontSize: '11px' }}
                  >
                    + Add Condition
                  </button>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="btn btn-primary"
                    style={{ height: '28px', fontSize: '11px' }}
                  >
                    Execute Query
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="label-caps">Raw URL Query String</div>
                <input
                  type="text"
                  value={rawQuery}
                  onChange={(e) => setRawQuery(e.target.value)}
                  className="input input-mono"
                  style={{
                    height: '36px',
                    borderColor: rawSyntaxError ? 'var(--sev-critical)' : undefined,
                  }}
                  placeholder="severity=critical&attack_family=dos&is_novel=true"
                />
                {rawSyntaxError ? (
                  <div style={{ color: 'var(--sev-critical)', fontSize: '11px' }}>
                    {rawSyntaxError}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                    Standard query parameters: <code className="font-mono">severity</code>, <code className="font-mono">status</code>, <code className="font-mono">attack_family</code>, <code className="font-mono">is_novel</code>, <code className="font-mono">search</code>.
                  </div>
                )}
                <div style={{ marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={!!rawSyntaxError}
                    className="btn btn-primary"
                    style={{ height: '28px', fontSize: '11px' }}
                  >
                    Execute Raw Query
                  </button>
                </div>
              </div>
            )}

            {/* Equivalent API Query String in Mono */}
            <div
              style={{
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                overflowX: 'auto',
              }}
            >
              <span className="label-caps" style={{ whiteSpace: 'nowrap' }}>BACKEND ENDPOINT:</span>
              <span className="font-mono" style={{ color: 'var(--accent)' }}>
                {apiQueryPreview}
              </span>
            </div>
          </div>

          {/* Results Action Bar: Column Chooser & Export */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="label-caps">Total: {totalCount}</span>
              {(['id', 'severity', 'timestamp', 'sigil', 'family', 'anomaly', 'status'] as const).map((col) => (
                <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={columns[col]}
                    onChange={(e) => setColumns({ ...columns, [col]: e.target.checked })}
                  />
                  <span className="label-caps">{col}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="btn btn-secondary"
              style={{ height: '28px', fontSize: '11px', gap: '6px' }}
            >
              <ExportIcon size={14} />
              Export CSV
            </button>
          </div>

          {/* Results Table */}
          <div className="table-container" aria-live="polite">
            {isLoading ? (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                <div className="skeleton" style={{ height: '32px', width: '100%' }} />
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)' }}>
                No alerts returned from backend matching the selected filters.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.id && <th>Alert ID</th>}
                    {columns.severity && <th>Severity</th>}
                    {columns.timestamp && <th>Timestamp</th>}
                    {columns.sigil && <th>Sigil</th>}
                    {columns.family && <th>Attack Family</th>}
                    {columns.anomaly && <th style={{ textAlign: 'right' }}>Anomaly</th>}
                    {columns.status && <th>Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alt) => (
                    <tr key={alt.id}>
                      {columns.id && (
                        <td>
                          <Link
                            to={`/app/alerts/${alt.id}`}
                            className="font-mono"
                            style={{ color: 'var(--accent)', textDecoration: 'none' }}
                          >
                            {alt.id}
                          </Link>
                        </td>
                      )}
                      {columns.severity && (
                        <td>
                          <SeverityTag severity={alt.severity} />
                        </td>
                      )}
                      {columns.timestamp && (
                        <td className="font-mono tabular-nums" style={{ color: 'var(--text-dim)' }}>
                          {new Date(alt.createdAt).toLocaleTimeString()}
                        </td>
                      )}
                      {columns.sigil && (
                        <td>
                          <Sigil id={alt.id} size={18} severity={alt.severity} />
                        </td>
                      )}
                      {columns.family && (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AttackMark family={alt.predictedLabel} size={14} />
                            <span className="label-caps">{alt.predictedLabel}</span>
                          </div>
                        </td>
                      )}
                      {columns.anomaly && (
                        <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                          {(alt.anomalyScore ?? 0).toFixed(3)}
                        </td>
                      )}
                      {columns.status && (
                        <td className="font-mono label-caps">{alt.status}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
