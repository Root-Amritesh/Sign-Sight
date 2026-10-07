import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Sigil, AttackMark, SearchIcon } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import { useToast } from '../../components/common/Toast';
import { useTriageShortcuts } from '../../hooks/useTriageShortcuts';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Glyph } from '../../icons/glyphs';
import type { AlertStatus } from '../../types/api';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Filter & Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // 5s Polling Query
  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['alertsList', page, pageSize, severityFilter, statusFilter, labelFilter, searchQuery],
    queryFn: () =>
      api.getAlerts({
        page,
        page_size: pageSize,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        predicted_label: labelFilter !== 'all' ? labelFilter : undefined,
        search: searchQuery.trim() || undefined,
        ordering: '-created_at',
      }),
    refetchInterval: 5000,
  });

  const alerts = response?.results || [];
  const totalCount = response?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const unackCount = alerts.filter((a) => a.status === 'new').length;
  useDocumentTitle('Alert Queue', unackCount);

  // Bulk status update mutation (viewed, escalated, resolved)
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: AlertStatus }) => {
      await Promise.all(ids.map((id) => api.updateAlert(id, { status })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertsList'] });
      queryClient.invalidateQueries({ queryKey: ['alertStats'] });
      addToast('Updated triage status for selected alerts.');
      setSelectedAlertIds([]);
    },
    onError: (err: unknown) => {
      const errObj = err as { detail?: string };
      addToast(errObj.detail || 'Batch status update failed.', 'error');
    },
  });

  // Triage Shortcuts
  useTriageShortcuts({
    onNext: () => {
      setFocusedIndex((prev) => Math.min(prev + 1, Math.max(0, alerts.length - 1)));
    },
    onPrev: () => {
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    },
    onOpenSelected: () => {
      if (alerts[focusedIndex]) {
        navigate(`/app/alerts/${alerts[focusedIndex].id}`);
      }
    },
    onEscalate: () => {
      const targetIds = selectedAlertIds.length > 0 ? selectedAlertIds : (alerts[focusedIndex] ? [alerts[focusedIndex].id] : []);
      if (targetIds.length > 0) {
        bulkUpdateMutation.mutate({ ids: targetIds, status: 'escalated' });
      }
    },
    onResolve: () => {
      const targetIds = selectedAlertIds.length > 0 ? selectedAlertIds : (alerts[focusedIndex] ? [alerts[focusedIndex].id] : []);
      if (targetIds.length > 0) {
        bulkUpdateMutation.mutate({ ids: targetIds, status: 'resolved' });
      }
    },
    onCopyIp: () => {
      if (alerts[focusedIndex]) {
        navigator.clipboard.writeText(alerts[focusedIndex].id);
        addToast(`Copied Alert ID ${alerts[focusedIndex].id} to clipboard`);
      }
    },
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAlertIds(alerts.map((a) => a.id));
    } else {
      setSelectedAlertIds([]);
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAlertIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRowClick = (id: string) => {
    navigate(`/app/alerts/${id}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
            Alert Triage Queue
          </h1>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            Live triage stream &bull; Polling interval: 5s &bull; Filterable by severity, status, attack category
          </div>
        </div>

        {/* Selected counter and bulk actions */}
        {selectedAlertIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {selectedAlertIds.length} selected
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => bulkUpdateMutation.mutate({ ids: selectedAlertIds, status: 'viewed' })}
              disabled={bulkUpdateMutation.isPending}
            >
              Mark Viewed
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => bulkUpdateMutation.mutate({ ids: selectedAlertIds, status: 'escalated' })}
              disabled={bulkUpdateMutation.isPending}
            >
              Escalate
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => bulkUpdateMutation.mutate({ ids: selectedAlertIds, status: 'resolved' })}
              disabled={bulkUpdateMutation.isPending}
            >
              Resolve
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div
        className="panel"
        style={{
          padding: '12px 16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px', position: 'relative' }}>
          <SearchIcon size={14} className="search-icon" style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="input-search"
            placeholder="Search notes / metadata..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{ paddingLeft: '32px', width: '100%', height: '32px' }}
          />
        </div>

        {/* Severity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="label-caps">Severity:</span>
          <select
            className="select-custom"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            style={{ height: '32px' }}
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
            <option value="info">INFO</option>
          </select>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="label-caps">Status:</span>
          <select
            className="select-custom"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ height: '32px' }}
          >
            <option value="all">ALL STATUSES</option>
            <option value="new">NEW</option>
            <option value="viewed">VIEWED</option>
            <option value="escalated">ESCALATED</option>
            <option value="resolved">RESOLVED</option>
          </select>
        </div>

        {/* Attack Category */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="label-caps">Attack Class:</span>
          <select
            className="select-custom"
            value={labelFilter}
            onChange={(e) => {
              setLabelFilter(e.target.value);
              setPage(1);
            }}
            style={{ height: '32px' }}
          >
            <option value="all">ALL CLASSES</option>
            <option value="dos">DOS</option>
            <option value="probe">PROBE</option>
            <option value="r2l">R2L</option>
            <option value="u2r">U2R</option>
            <option value="normal">NORMAL (NOVEL)</option>
          </select>
        </div>
      </div>

      {/* Table & Content */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
          </div>
        ) : isError ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ color: 'var(--sev-critical)', fontSize: '14px', marginBottom: '8px' }}>
              Failed to load alerts from backend.
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '16px' }}>
              {(error as { detail?: string })?.detail || 'The API endpoint /api/alerts/ did not respond.'}
            </div>
            <button onClick={() => refetch()} className="btn-secondary" style={{ padding: '6px 14px' }}>
              Retry
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <Glyph name="alert" size={32} />
            <div style={{ fontSize: '14px', color: 'var(--text)', margin: '12px 0 4px 0' }}>
              No alerts in queue
            </div>
            <div style={{ fontSize: '12px' }}>
              No network intrusion alerts match the selected criteria. Ingest network flow records to populate the queue.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }} aria-live="polite">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '36px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedAlertIds.length === alerts.length && alerts.length > 0}
                      onChange={handleSelectAll}
                      aria-label="Select all alerts on page"
                    />
                  </th>
                  <th style={{ width: '90px' }}>Severity</th>
                  <th>Alert ID</th>
                  <th>Status</th>
                  <th>Predicted Class</th>
                  <th style={{ textAlign: 'right' }}>Confidence</th>
                  <th style={{ textAlign: 'right' }}>Model</th>
                  <th style={{ textAlign: 'right' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alt, idx) => {
                  const isSelected = selectedAlertIds.includes(alt.id);
                  const isFocused = focusedIndex === idx;

                  return (
                    <tr
                      key={alt.id}
                      onClick={() => handleRowClick(alt.id)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'var(--bg-2)'
                          : isFocused
                          ? 'rgba(182, 255, 59, 0.05)'
                          : 'transparent',
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => handleSelectOne(alt.id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          aria-label={`Select alert ${alt.id}`}
                        />
                      </td>
                      <td>
                        <SeverityTag severity={alt.severity} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sigil id={alt.id} size={16} severity={alt.severity} />
                          <span className="font-mono" style={{ fontSize: '12px' }}>
                            {alt.id}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge-mono"
                          style={{
                            textTransform: 'uppercase',
                            fontSize: '10px',
                            color: alt.status === 'new' ? 'var(--accent)' : 'var(--text-dim)',
                          }}
                        >
                          {alt.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AttackMark family={alt.predictedLabel} size={14} />
                          <span className="label-caps" style={{ color: 'var(--text)' }}>
                            {alt.predictedLabel}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                        {(alt.confidence * 100).toFixed(1)}%
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-dim)', fontSize: '11px' }} className="font-mono">
                        {alt.modelVersion}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-dim)', fontSize: '11px' }} className="font-mono">
                        {new Date(alt.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
            }}
          >
            <span style={{ color: 'var(--text-dim)' }}>
              Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount} alerts
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ height: '28px', padding: '0 10px' }}
              >
                Previous
              </button>
              <span className="font-mono">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ height: '28px', padding: '0 10px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
