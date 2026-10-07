import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { AttackMark } from '../../icons';
import { Glyph } from '../../icons/glyphs';
import type { AttackFamily } from '../../types/api';

export const DriftMonitorPage: React.FC = () => {
  const { data: drift, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['driftMetrics'],
    queryFn: () => api.getDriftMetrics(),
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '32px', width: '220px' }} />
        <div className="skeleton" style={{ height: '240px', width: '100%' }} />
        <div className="skeleton" style={{ height: '200px', width: '100%' }} />
      </div>
    );
  }

  if (isError || !drift) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--sev-critical)', fontSize: '16px', marginBottom: '8px', fontWeight: 600 }}>
          Unable to retrieve drift metrics
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>
          {(error as { detail?: string })?.detail || 'The /api/metrics/drift/ endpoint did not respond.'}
        </div>
        <button onClick={() => refetch()} className="btn-secondary" style={{ padding: '6px 14px' }}>
          Retry
        </button>
      </div>
    );
  }

  const snapshot = drift.latestSnapshot;
  const labelDrift = snapshot?.labelDrift;
  const anomalyDrift = snapshot?.anomalyScoreDrift;

  const warningThreshold = labelDrift?.warningThreshold ?? 0.30;
  const criticalThreshold = labelDrift?.criticalThreshold ?? 0.60;
  const driftScore = labelDrift?.driftScore ?? 0;
  const isWarning = drift.driftStatus === 'warning' || driftScore >= warningThreshold;
  const isCritical = drift.driftStatus === 'critical' || driftScore >= criticalThreshold;

  // Chart dimensions for SVG Line Chart
  const svgWidth = 800;
  const svgHeight = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const history = drift.history.length > 0 ? drift.history : [
    { timestamp: new Date().toISOString(), labelDriftScore: driftScore, anomalyPsiScore: anomalyDrift?.psiScore ?? 0, status: drift.driftStatus }
  ];

  const maxScore = Math.max(criticalThreshold * 1.2, ...history.map((h) => h.labelDriftScore ?? 0));

  const points = history.map((h, i) => {
    const score = h.labelDriftScore ?? 0;
    const x = padding.left + (i / Math.max(1, history.length - 1)) * chartW;
    const y = padding.top + chartH - (score / maxScore) * chartH;
    return { x, y, timestamp: h.timestamp, score };
  });

  const pathD = points.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
    ''
  );

  const warnY = padding.top + chartH - (warningThreshold / maxScore) * chartH;
  const critY = padding.top + chartH - (criticalThreshold / maxScore) * chartH;

  const trainingDist = labelDrift?.trainingDistribution || { normal: 0.533, dos: 0.368, probe: 0.074, r2l: 0.017, u2r: 0.008 };
  const currentDist = labelDrift?.currentDistribution || trainingDist;
  const deviation = labelDrift?.deviation || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
            Prediction Distribution &amp; Anomaly Score Drift
          </h1>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            Model Version: <span className="font-mono" style={{ color: 'var(--accent)' }}>{drift.modelVersion || 'v2'}</span> &bull; PSI &amp; Label Divergence Tracking
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="label-caps">DRIFT STATUS:</span>
          <span
            className="sev-tag"
            style={{
              borderColor: isCritical ? 'var(--sev-critical)' : isWarning ? 'var(--sev-high)' : 'var(--accent)',
              color: isCritical ? 'var(--sev-critical)' : isWarning ? 'var(--sev-high)' : 'var(--accent)',
            }}
          >
            {drift.driftStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Recommendation Callout */}
      {drift.recommendation && (
        <div
          style={{
            background: isCritical ? 'rgba(255, 77, 61, 0.08)' : isWarning ? 'rgba(255, 154, 31, 0.08)' : 'rgba(182, 255, 59, 0.08)',
            border: `1px solid ${isCritical ? 'var(--sev-critical)' : isWarning ? 'var(--sev-high)' : 'var(--accent)'}`,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Glyph name="warning" size={16} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: isCritical ? 'var(--sev-critical)' : isWarning ? 'var(--sev-high)' : 'var(--accent)' }}>
              Backend Drift Recommendation
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '2px' }}>
              {drift.recommendation}
            </div>
          </div>
        </div>
      )}

      {/* Overview KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Label Drift Score</div>
          <div
            className="font-mono tabular-nums"
            style={{
              fontSize: '24px',
              color: isCritical ? 'var(--sev-critical)' : isWarning ? 'var(--sev-high)' : 'var(--accent)',
            }}
          >
            {driftScore.toFixed(3)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Warning: {warningThreshold.toFixed(2)} | Critical: {criticalThreshold.toFixed(2)}
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Anomaly Score PSI</div>
          <div
            className="font-mono tabular-nums"
            style={{
              fontSize: '24px',
              color: (anomalyDrift?.psiScore ?? 0) > 0.1 ? 'var(--sev-high)' : 'var(--accent)',
            }}
          >
            {anomalyDrift?.psiScore !== undefined ? anomalyDrift.psiScore.toFixed(3) : 'N/A'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            {anomalyDrift?.note || 'Population Stability Index (Stage 1)'}
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Snapshot Timestamp</div>
          <div className="font-mono" style={{ fontSize: '14px', color: 'var(--text)' }}>
            {snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString() : 'Current'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Periodic evaluation snapshot
          </div>
        </div>
      </div>

      {/* SVG Line Chart: Drift Trend */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="panel-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--line)' }}>
          <span className="panel-title">Label Drift Score Over Time</span>
          <span className="label-caps" style={{ color: 'var(--text-dim)' }}>
            Warning Line: {warningThreshold.toFixed(2)} &bull; Critical Line: {criticalThreshold.toFixed(2)}
          </span>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* Gridlines */}
            <line x1={padding.left} y1={padding.top} x2={padding.left + chartW} y2={padding.top} stroke="var(--line)" strokeWidth="0.5" />
            <line x1={padding.left} y1={padding.top + chartH / 2} x2={padding.left + chartW} y2={padding.top + chartH / 2} stroke="var(--line)" strokeWidth="0.5" />
            <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="var(--line)" strokeWidth="1" />

            {/* Warning Threshold Line */}
            <line
              x1={padding.left}
              y1={warnY}
              x2={padding.left + chartW}
              y2={warnY}
              stroke="var(--sev-high)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text x={padding.left + chartW - 4} y={warnY - 4} fill="var(--sev-high)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
              Warning ({warningThreshold.toFixed(2)})
            </text>

            {/* Critical Threshold Line */}
            <line
              x1={padding.left}
              y1={critY}
              x2={padding.left + chartW}
              y2={critY}
              stroke="var(--sev-critical)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text x={padding.left + chartW - 4} y={critY - 4} fill="var(--sev-critical)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
              Critical ({criticalThreshold.toFixed(2)})
            </text>

            {/* Drift Trend Path */}
            <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" />

            {/* Data Points */}
            {points.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="var(--accent)" stroke="var(--bg-0)" strokeWidth="1" />
            ))}
          </svg>
        </div>
      </div>

      {/* Class Distribution Comparison: Baseline vs Live */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Label Distribution: Training Baseline vs. Current Ingestion</span>
          <span className="label-caps">Paired Frequency Comparison</span>
        </div>
        <div style={{ padding: '0', overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Attack Class</th>
                <th style={{ textAlign: 'right' }}>Training Ratio</th>
                <th style={{ textAlign: 'right' }}>Live Ratio</th>
                <th style={{ textAlign: 'right' }}>Deviation</th>
              </tr>
            </thead>
            <tbody>
              {(['normal', 'dos', 'probe', 'r2l', 'u2r'] as AttackFamily[]).map((fam) => {
                const baseRatio = trainingDist[fam] ?? 0;
                const liveRatio = currentDist[fam] ?? 0;
                const dev = deviation[fam] || `${((liveRatio - baseRatio) * 100).toFixed(1)}%`;

                return (
                  <tr key={fam}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AttackMark family={fam} size={15} />
                        <span className="label-caps" style={{ color: 'var(--text)' }}>
                          {fam.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {(baseRatio * 100).toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {(liveRatio * 100).toFixed(1)}%
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: dev.startsWith('+') && fam !== 'normal' ? 'var(--sev-high)' : 'var(--text-dim)',
                      }}
                      className="font-mono tabular-nums"
                    >
                      {dev}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
