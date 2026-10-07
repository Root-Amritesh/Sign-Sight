import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ExportIcon } from '../../icons';
import { useToast } from '../../components/common/Toast';
import { Glyph } from '../../icons/glyphs';
import type { AuditRecord } from '../../types/api';

export const AuditLogPage: React.FC = () => {
  const { role } = useAuth();
  const { addToast } = useToast();
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['auditLogs', actionFilter, targetTypeFilter],
    queryFn: () =>
      api.getAuditLogs({
        action: actionFilter || undefined,
        target_type: targetTypeFilter || undefined,
      }),
  });

  const logs: AuditRecord[] = response?.results || [];

  const handleExportCSV = () => {
    if (logs.length === 0) {
      addToast('No audit logs to export.', 'error');
      return;
    }

    const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'Target Type', 'Target ID', 'Notes'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      typeof l.actor === 'object' && l.actor ? l.actor.username : l.actor || 'N/A',
      l.action,
      l.target_type || '',
      l.target_id || '',
      l.notes || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `signsight_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Audit log CSV exported.');
  };

  if (role !== 'admin') {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <Glyph name="warning" size={32} />
        <h1 style={{ fontSize: '18px', color: 'var(--sev-high)', margin: '12px 0 6px 0' }}>
          Admin Privileges Required
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px auto' }}>
          Security audit logs contain immutable operational records and are restricted to system administrators.
        </p>
        <Link to="/app/dashboard" className="btn btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
              Security Operations Audit Trail
            </h1>
            <span className="sev-tag" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              ADMIN PRIVILEGE
            </span>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            Audit trail tracking alert resolutions, model deployments, and threshold mutations
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="btn btn-secondary"
          style={{ height: '30px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ExportIcon size={14} />
          Export Audit Log (CSV)
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        className="panel"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="label-caps">Action:</span>
          <input
            type="text"
            className="input font-mono"
            placeholder="e.g. alert.resolved"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ height: '28px', width: '160px', padding: '0 8px', fontSize: '11px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="label-caps">Target Type:</span>
          <input
            type="text"
            className="input font-mono"
            placeholder="e.g. alert"
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            style={{ height: '28px', width: '140px', padding: '0 8px', fontSize: '11px' }}
          />
        </div>

        <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
          Showing {logs.length} journal records
        </span>
      </div>

      {/* Audit Table */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
          </div>
        ) : isError ? (
          <div style={{ padding: '36px', textAlign: 'center' }}>
            <div style={{ color: 'var(--sev-critical)', fontSize: '13px', marginBottom: '8px' }}>
              Failed to load audit logs from backend.
            </div>
            <button onClick={() => refetch()} className="btn-secondary" style={{ padding: '6px 14px' }}>
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
            No audit records found matching active filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Type</th>
                  <th>Target ID</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((record) => {
                  const actorName =
                    typeof record.actor === 'object' && record.actor
                      ? record.actor.username
                      : record.actor || 'system';

                  return (
                    <tr key={record.id}>
                      <td className="font-mono tabular-nums" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className="font-mono" style={{ color: actorName === 'admin' ? 'var(--accent)' : 'var(--text)' }}>
                          {actorName}
                        </span>
                      </td>
                      <td>
                        <span
                          className="font-mono"
                          style={{
                            padding: '2px 6px',
                            backgroundColor: 'var(--bg-2)',
                            border: '1px solid var(--line)',
                            fontSize: '11px',
                            color: 'var(--text)',
                          }}
                        >
                          {record.action}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '12px' }}>
                        {record.target_type || 'N/A'}
                      </td>
                      <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {record.target_id || 'N/A'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        {record.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
