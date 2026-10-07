import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Sigil, AttackMark } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import { ProbabilityBar } from '../../components/common/ProbabilityBar';
import { Glyph } from '../../icons/glyphs';

export const DashboardPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  // Stats query
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['alertStats', timeRange],
    queryFn: () => api.getStats(timeRange),
    refetchInterval: 10000,
  });

  // Recent alerts query (polling every 5s)
  const {
    data: alertsData,
    isLoading: alertsLoading,
    isError: alertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['recentAlerts'],
    queryFn: () => api.getAlerts({ page: 1, page_size: 10, ordering: '-created_at' }),
    refetchInterval: 5000,
  });

  // Health query for model block
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 15000,
  });

  const alerts = alertsData?.results || [];

  const critCount = stats?.bySeverity?.critical ?? 0;
  const highCount = stats?.bySeverity?.high ?? 0;
  const medCount = stats?.bySeverity?.medium ?? 0;
  const lowCount = (stats?.bySeverity?.low ?? 0) + (stats?.bySeverity?.info ?? 0);
  const total = stats?.totalAlerts ?? 0;

  const totalSev = critCount + highCount + medCount + lowCount || 1;
  const critPct = (critCount / totalSev) * 100;
  const highPct = (highCount / totalSev) * 100;
  const medPct = (medCount / totalSev) * 100;
  const lowPct = (lowCount / totalSev) * 100;

  const isModelLoaded = health?.checks?.model?.status === 'loaded' || Boolean(health?.checks?.model?.version);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '20px', letterSpacing: '-0.01em', margin: 0 }}>
            Security Operations Dashboard
          </h1>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            Two-stage telemetry: Stage 1 Isolation Forest Anomaly Detection &rarr; Stage 2 LightGBM Classifier
          </div>
        </div>

        {/* Time Filter */}
        <div style={{ display: 'flex', border: '1px solid var(--line)' }}>
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              style={{
                height: '28px',
                padding: '0 12px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                backgroundColor: timeRange === r ? 'var(--bg-2)' : 'transparent',
                color: timeRange === r ? 'var(--accent)' : 'var(--text-dim)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Backend Offline Warning Banner if stats/alerts fail */}
      {(statsError || alertsError) && (
        <div
          style={{
            background: 'rgba(255, 77, 61, 0.08)',
            border: '1px solid var(--sev-critical)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Glyph name="warning" size={16} />
            <span style={{ fontSize: '13px', color: 'var(--text)' }}>
              Backend is currently unreachable. No fabricated or mock data is rendered.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                refetchStats();
                refetchAlerts();
              }}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              Retry
            </button>
            <Link
              to="/app/connection"
              className="btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px', textDecoration: 'none' }}
            >
              Connection Hub
            </Link>
          </div>
        </div>
      )}

      {/* 3-Column Instrument Panel Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1fr) minmax(380px, 2fr) minmax(280px, 1.2fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Column 1: Severity Distribution & Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ padding: '16px' }}>
            <div className="label-caps" style={{ marginBottom: '12px' }}>
              Severity Distribution ({timeRange})
            </div>

            {statsLoading ? (
              <div className="skeleton" style={{ height: '80px', width: '100%' }} />
            ) : statsError ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Not available (Backend offline)</div>
            ) : (
              <>
                {/* Stacked Horizontal Bar */}
                <div
                  style={{
                    height: '14px',
                    display: 'flex',
                    border: '1px solid var(--line)',
                    backgroundColor: 'var(--bg-2)',
                    marginBottom: '16px',
                  }}
                  title="Severity Split"
                >
                  <div style={{ width: `${critPct}%`, backgroundColor: 'var(--sev-critical)' }} />
                  <div style={{ width: `${highPct}%`, backgroundColor: 'var(--sev-high)' }} />
                  <div style={{ width: `${medPct}%`, backgroundColor: 'var(--sev-medium)' }} />
                  <div style={{ width: `${lowPct}%`, backgroundColor: 'var(--sev-low)' }} />
                </div>

                {/* Counts List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--sev-critical)', display: 'inline-block' }} />
                      <span className="label-caps" style={{ color: 'var(--text)' }}>Critical</span>
                    </div>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--sev-critical)', fontWeight: 600 }}>
                      {critCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--sev-high)', display: 'inline-block' }} />
                      <span className="label-caps" style={{ color: 'var(--text)' }}>High</span>
                    </div>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--sev-high)', fontWeight: 600 }}>
                      {highCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--sev-medium)', display: 'inline-block' }} />
                      <span className="label-caps" style={{ color: 'var(--text)' }}>Medium</span>
                    </div>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--sev-medium)' }}>
                      {medCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--sev-low)', display: 'inline-block' }} />
                      <span className="label-caps" style={{ color: 'var(--text)' }}>Low / Info</span>
                    </div>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--sev-low)' }}>
                      {lowCount}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <span className="label-caps">Total Processed:</span>
                  <span className="font-mono" style={{ color: 'var(--text)' }}>{total}</span>
                </div>
              </>
            )}
          </div>

          {/* Model Status Block */}
          <div className="panel" style={{ padding: '16px' }}>
            <div className="label-caps" style={{ marginBottom: '12px' }}>
              Active Model Status
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Architecture:</span>
                <span className="font-mono" style={{ color: 'var(--accent)' }}>IF &rarr; LightGBM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Active Version:</span>
                <span className="font-mono">{health?.checks?.model?.version || (isModelLoaded ? 'Active' : 'Unavailable')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Dataset:</span>
                <span className="font-mono">NSL-KDD</span>
              </div>
            </div>
            <Link
              to="/app/model"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '14px', fontSize: '11px', height: '28px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Inspect Model Metrics &rarr;
            </Link>
          </div>
        </div>

        {/* Column 2: Live Alert Feed */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-dot status-dot-live" />
              <span className="panel-title">Live Alert Feed (Polling 5s)</span>
            </div>
            <Link to="/app/alerts" style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none' }}>
              View All Alerts &rarr;
            </Link>
          </div>

          <div
            style={{ padding: '0', overflowX: 'auto' }}
            aria-live="polite"
            aria-atomic="false"
          >
            {alertsLoading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                <div className="skeleton" style={{ height: '32px', width: '100%' }} />
              </div>
            ) : alertsError ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--sev-critical)', fontSize: '13px' }}>
                Unable to load alerts. Verify backend connection in Connection Hub.
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                No alerts detected yet. Single records or batch datasets ingested into the backend will appear here.
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Severity</th>
                    <th>Alert ID</th>
                    <th>Predicted Class</th>
                    <th style={{ textAlign: 'right' }}>Confidence</th>
                    <th style={{ textAlign: 'right' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alt) => (
                    <tr
                      key={alt.id}
                      tabIndex={0}
                      role="link"
                      onClick={() => (window.location.href = `/app/alerts/${alt.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          window.location.href = `/app/alerts/${alt.id}`;
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <SeverityTag severity={alt.severity} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sigil id={alt.id} size={16} severity={alt.severity} />
                          <span className="font-mono" style={{ fontSize: '12px' }}>
                            {alt.id.slice(0, 12)}...
                          </span>
                        </div>
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
                        {new Date(alt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Column 3: Alert Type & Attack Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Triage Alert Types */}
          <div className="panel" style={{ padding: '16px' }}>
            <div className="label-caps" style={{ marginBottom: '12px' }}>
              Triage Classification Types
            </div>
            {statsLoading ? (
              <div className="skeleton" style={{ height: '80px', width: '100%' }} />
            ) : statsError ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Not available</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Known Attacks:</span>
                  <span className="font-mono">{stats?.byAlertType?.knownAttack ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Novel Suspicious (Stage 1):</span>
                  <span className="font-mono" style={{ color: 'var(--sev-high)' }}>
                    {stats?.byAlertType?.novelSuspicious ?? 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Uncertain Normal:</span>
                  <span className="font-mono">{stats?.byAlertType?.uncertainNormal ?? 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Attack Family Distribution */}
          <div className="panel" style={{ padding: '16px' }}>
            <div className="label-caps" style={{ marginBottom: '12px' }}>
              Attack Class Breakdown
            </div>
            {statsLoading ? (
              <div className="skeleton" style={{ height: '120px', width: '100%' }} />
            ) : statsError ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Not available</div>
            ) : (
              <div>
                {(['dos', 'probe', 'r2l', 'u2r'] as const).map((fam) => {
                  const count = stats?.byLabel?.[fam] || 0;
                  const ratio = total > 0 ? count / total : 0;
                  return (
                    <ProbabilityBar
                      key={fam}
                      label={fam.toUpperCase()}
                      value={ratio}
                      icon={<AttackMark family={fam} size={14} />}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
