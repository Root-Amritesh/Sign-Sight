import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { FeedbackIcon, ExportIcon, WarningIcon, Sigil, AttackMark } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import { EmptyState } from '../../components/common/EmptyState';
import type { UIAlertListItem } from '../../types/api';

export const FeedbackLoopPage: React.FC = () => {
  const [familyFilter, setFamilyFilter] = useState<string>('all');

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['alertsFeedback'],
    queryFn: () => api.getAlerts({ limit: 100 }),
  });

  const alerts = response?.results || [];

  // Filter for alerts that have been triaged/resolved
  const candidates: UIAlertListItem[] = useMemo(() => {
    return alerts.filter((a) => a.status === 'resolved');
  }, [alerts]);

  const filteredCandidates = useMemo(() => {
    if (familyFilter === 'all') return candidates;
    return candidates.filter((c) => c.predictedLabel.toLowerCase() === familyFilter.toLowerCase());
  }, [candidates, familyFilter]);

  const countsByFamily = useMemo(() => {
    const counts: Record<string, { tp: number; fp: number }> = {
      dos: { tp: 0, fp: 0 },
      probe: { tp: 0, fp: 0 },
      r2l: { tp: 0, fp: 0 },
      u2r: { tp: 0, fp: 0 },
      normal: { tp: 0, fp: 0 },
    };

    candidates.forEach((c) => {
      const fam = c.predictedLabel.toLowerCase();
      if (!counts[fam]) {
        counts[fam] = { tp: 0, fp: 0 };
      }
      // Resolved alert flows are confirmed threat or normal ground-truth
      if (fam === 'normal') {
        counts[fam].fp++;
      } else {
        counts[fam].tp++;
      }
    });

    return counts;
  }, [candidates]);

  const handleExportCsv = () => {
    const rows: string[] = [];
    rows.push('Alert ID,Created At,Predicted Label,Status,Anomaly Score,Confidence,Model Version');
    filteredCandidates.forEach((c) => {
      rows.push(
        `${c.id},${c.createdAt},${c.predictedLabel},${c.status},${(c.anomalyScore ?? 0).toFixed(3)},${c.confidence},${c.modelVersion}`
      );
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signsight-feedback-dataset-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="label-caps" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FeedbackIcon size={14} /> Active Learning Pipeline
          </div>
          <h1 className="font-display" style={{ fontSize: '24px', color: 'var(--text)', margin: '4px 0 0 0' }}>
            Feedback Loop &amp; Retraining Candidates
          </h1>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filteredCandidates.length === 0}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ExportIcon size={16} /> Export Curated Dataset (CSV)
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="panel" style={{ padding: '16px' }}>
          <span className="label-caps">Total Feedback Records</span>
          <div className="font-mono" style={{ fontSize: '28px', color: 'var(--text)', fontWeight: 700, marginTop: '4px' }}>
            {candidates.length}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Resolved threat telemetry flows
          </span>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <span className="label-caps" style={{ color: 'var(--accent)' }}>Confirmed Attack Positives</span>
          <div className="font-mono" style={{ fontSize: '28px', color: 'var(--accent)', fontWeight: 700, marginTop: '4px' }}>
            {candidates.filter((c) => c.predictedLabel.toLowerCase() !== 'normal').length}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Verified attack traffic samples
          </span>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <span className="label-caps" style={{ color: 'var(--sev-high)' }}>Normal Baseline Samples</span>
          <div className="font-mono" style={{ fontSize: '28px', color: 'var(--sev-high)', fontWeight: 700, marginTop: '4px' }}>
            {candidates.filter((c) => c.predictedLabel.toLowerCase() === 'normal').length}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Benign samples for false alarm reduction
          </span>
        </div>
      </div>

      {/* Breakdown per attack family */}
      <div className="panel" style={{ padding: '20px' }}>
        <h2 className="label-caps" style={{ color: 'var(--text)', marginBottom: '16px' }}>
          Analyst Ground-Truth Distribution by Attack Class
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {Object.entries(countsByFamily).map(([family, { tp, fp }]) => {
            const total = tp + fp;
            return (
              <div
                key={family}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AttackMark family={family} size={14} />
                    <span className="label-caps font-mono" style={{ color: 'var(--text)' }}>
                      {family.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {total} records
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--accent)' }}>Attacks: {tp}</span>
                  <span style={{ color: 'var(--text-dim)' }}>Benign: {fp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Records Table */}
      <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="label-caps" style={{ color: 'var(--text)' }}>
              Curated Retraining Candidates
            </span>
            <select
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value)}
              className="font-mono"
              style={{
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
                padding: '4px 8px',
                fontSize: '11px',
              }}
            >
              <option value="all">All Attack Classes</option>
              <option value="dos">DoS</option>
              <option value="probe">Probe</option>
              <option value="r2l">R2L</option>
              <option value="u2r">U2R</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Showing {filteredCandidates.length} evaluated records
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }} className="font-mono">
            Loading feedback records...
          </div>
        ) : isError ? (
          <EmptyState
            icon={<WarningIcon size={24} />}
            title="Unable to Load Feedback Telemetry"
            description="The active learning feedback records could not be fetched from the backend."
            actionLabel="Retry Query"
            onAction={() => refetch()}
          />
        ) : filteredCandidates.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <WarningIcon size={24} style={{ color: 'var(--text-dim)', marginBottom: '8px' }} />
            <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              No resolved alerts found. Resolve alerts on the Alerts Triage page to populate the retraining pipeline.
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Alert ID</th>
                  <th>Attack Class</th>
                  <th>Severity</th>
                  <th>Anomaly Score</th>
                  <th>Confidence</th>
                  <th>Model Version</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span
                        className="font-mono label-caps"
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--accent)',
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="font-mono">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sigil id={c.id} size={16} severity={c.severity} />
                        <span>{c.id}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AttackMark family={c.predictedLabel} size={14} />
                        <span className="font-mono label-caps">{c.predictedLabel}</span>
                      </div>
                    </td>
                    <td>
                      <SeverityTag severity={c.severity} />
                    </td>
                    <td className="font-mono tabular-nums">{(c.anomalyScore ?? 0).toFixed(3)}</td>
                    <td className="font-mono tabular-nums">{(c.confidence * 100).toFixed(1)}%</td>
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {c.modelVersion}
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {new Date(c.createdAt).toLocaleTimeString()}
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
