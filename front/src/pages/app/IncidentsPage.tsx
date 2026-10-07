import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { groupAlertsIntoIncidents, type Incident } from '../../utils/incidentGrouper';
import { IncidentIcon, ExportIcon, AttackMark } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import { exportIncidentToMarkdown, downloadFile } from '../../utils/reportExporter';
import { EmptyState } from '../../components/common/EmptyState';

export const IncidentsPage: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['alertsForIncidents'],
    queryFn: () => api.getAlerts({ page_size: 100 }),
    refetchInterval: 10000,
  });

  const alerts = response?.results || [];

  const incidents: Incident[] = useMemo(() => {
    return groupAlertsIntoIncidents(alerts);
  }, [alerts]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchSev = severityFilter === 'all' || inc.severity === severityFilter;
      const matchStatus = statusFilter === 'all' || inc.status === statusFilter;
      return matchSev && matchStatus;
    });
  }, [incidents, severityFilter, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IncidentIcon size={24} />
            <h1 className="font-display" style={{ fontSize: '24px', color: 'var(--text)', margin: 0 }}>
              Correlated Security Incidents
            </h1>
            <span
              className="font-mono label-caps"
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line-strong)',
                color: 'var(--accent)',
              }}
            >
              Grouped in the browser by attack class and time (15-min window)
            </span>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
            Clusters flows sharing attack family patterns within sliding 15-minute time windows.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            {filteredIncidents.length} INCIDENTS
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: 'var(--bg-1)',
          border: '1px solid var(--line)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="label-caps">Severity:</span>
            <select
              className="select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ height: '30px', fontSize: '12px' }}
            >
              <option value="all">ALL SEVERITIES</option>
              <option value="critical">CRITICAL</option>
              <option value="high">HIGH</option>
              <option value="medium">MEDIUM</option>
              <option value="low">LOW</option>
              <option value="info">INFO</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="label-caps">Status:</span>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: '30px', fontSize: '12px' }}
            >
              <option value="all">ALL STATES</option>
              <option value="active">ACTIVE</option>
              <option value="resolved">RESOLVED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="panel" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton" style={{ height: '36px', width: '100%' }} />
            <div className="skeleton" style={{ height: '36px', width: '100%' }} />
            <div className="skeleton" style={{ height: '36px', width: '100%' }} />
          </div>
        ) : isError ? (
          <div style={{ padding: '32px' }}>
            <EmptyState
              title="Failed to Load Alerts for Clustering"
              description={(error as any)?.detail || 'Could not retrieve alerts from /api/alerts/.'}
              actionLabel="Retry"
              onAction={() => refetch()}
            />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No security incidents match the active filter criteria (0 alerts recorded).
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Incident ID</th>
                  <th>Attack Family</th>
                  <th>Alerts</th>
                  <th>First Seen</th>
                  <th>Last Seen</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id}>
                    <td>
                      <SeverityTag severity={inc.severity} />
                    </td>
                    <td>
                      <Link
                        to={`/app/incidents/${inc.id}`}
                        state={{ incident: inc }}
                        className="font-mono"
                        style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        {inc.id}
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AttackMark family={inc.attack_family} size={14} />
                        <span className="font-mono label-caps">{inc.attack_family}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {inc.alert_count} flows
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {new Date(inc.first_seen).toLocaleTimeString()}
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {new Date(inc.last_seen).toLocaleTimeString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link
                          to={`/app/incidents/${inc.id}`}
                          state={{ incident: inc }}
                          className="btn btn-secondary"
                          style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                        >
                          Inspect &rarr;
                        </Link>
                        <button
                          type="button"
                          onClick={() => downloadFile(exportIncidentToMarkdown(inc), `${inc.id}-report.md`)}
                          className="btn btn-secondary"
                          style={{ height: '24px', width: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Export Incident Report (Markdown)"
                        >
                          <ExportIcon size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
