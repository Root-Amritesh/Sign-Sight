import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { ExportIcon, ResultsIcon } from '../../icons';
import { EmptyState } from '../../components/common/EmptyState';

export const ResultsPage: React.FC = () => {
  const { data: metrics, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['modelMetrics'],
    queryFn: () => api.getModelMetrics(),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '36px', width: '320px' }} />
        <div className="skeleton" style={{ height: '120px', width: '100%' }} />
        <div className="skeleton" style={{ height: '280px', width: '100%' }} />
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <EmptyState
          title="Evaluation Metrics Unavailable"
          description={(error as any)?.detail || 'Could not load active model evaluation from GET /api/metrics/model/.'}
          actionLabel="Retry Connection"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  const activeVersion = metrics.activeModel?.version || 'Active';
  const evaluatedAt = metrics.activeModel?.trainingDate || metrics.activeModel?.deployedAt || new Date().toISOString();
  const perClass = metrics.stage2Metrics?.perClass || {};
  const confusionMatrix = metrics.stage2Metrics?.confusionMatrix;

  const handleDownloadCsv = () => {
    const rows: string[] = [];
    rows.push(`Model Version Evaluation,${activeVersion}`);
    rows.push(`Evaluated At,${evaluatedAt}`);
    rows.push('');
    rows.push('Attack Class,Precision,Recall,F1-Score,Support');

    Object.entries(perClass).forEach(([cls, m]) => {
      const prec = (m.precision ?? 0).toFixed(4);
      const rec = (m.recall ?? 0).toFixed(4);
      const f1 = (m.f1 ?? 0).toFixed(4);
      const sup = m.support ?? 0;
      rows.push(`${cls},${prec},${rec},${f1},${sup}`);
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signsight-evaluation-${activeVersion}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--bg-1)',
          border: '1px solid var(--line)',
          borderLeft: '4px solid var(--accent)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ResultsIcon size={24} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
              Active Pipeline Model Evaluation ({activeVersion})
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Live evaluation metrics from <code className="font-mono">GET /api/metrics/model/</code> on test partition.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="btn btn-secondary"
          style={{ height: '32px', fontSize: '12px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ExportIcon size={14} />
          <span>Export Metrics (CSV)</span>
        </button>
      </div>

      {/* Contract note */}
      <div
        style={{
          backgroundColor: 'var(--bg-2)',
          border: '1px solid var(--line)',
          padding: '12px 16px',
          fontSize: '12px',
          color: 'var(--text-dim)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--text)' }}>Backend Architecture Note:</strong> The live backend contract returns verified evaluation metrics for the active two-stage production pipeline (Isolation Forest + LightGBM). Baseline single-stage comparisons are evaluated offline during training runs.
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps">Macro F1 Score</div>
          <div className="font-mono" style={{ fontSize: '24px', fontWeight: 600, color: 'var(--accent)', marginTop: '6px' }}>
            {metrics.stage2Metrics?.f1Macro !== undefined ? (metrics.stage2Metrics.f1Macro * 100).toFixed(2) + '%' : '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Unweighted mean across all 5 classes
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps">Stage 1 Anomaly ROC-AUC</div>
          <div className="font-mono" style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)', marginTop: '6px' }}>
            {metrics.stage1Metrics?.anomalyAucAttackVsNormal !== undefined ? metrics.stage1Metrics.anomalyAucAttackVsNormal.toFixed(3) : '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Isolation Forest zero-day anomaly screening
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps">Stage 2 Multiclass Accuracy</div>
          <div className="font-mono" style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)', marginTop: '6px' }}>
            {metrics.stage2Metrics?.accuracy !== undefined ? (metrics.stage2Metrics.accuracy * 100).toFixed(2) + '%' : '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            LightGBM 5-class attack classification
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps">Active Version</div>
          <div className="font-mono" style={{ fontSize: '24px', fontWeight: 600, color: 'var(--accent)', marginTop: '6px' }}>
            {activeVersion}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Evaluated at: {new Date(evaluatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Per-Class Metrics Table */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="label-caps" style={{ marginBottom: '14px' }}>
          Per-Class Detailed Metrics
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Attack Class</th>
                <th style={{ textAlign: 'right' }}>Precision</th>
                <th style={{ textAlign: 'right' }}>Recall</th>
                <th style={{ textAlign: 'right' }}>F1-Score</th>
                <th style={{ textAlign: 'right' }}>Support</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(perClass).map(([clsName, m]) => (
                <tr key={clsName}>
                  <td>
                    <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase' }}>
                      {clsName}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                    {m.precision !== undefined ? (m.precision * 100).toFixed(2) + '%' : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                    {m.recall !== undefined ? (m.recall * 100).toFixed(2) + '%' : '—'}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }} className="font-mono tabular-nums">
                    {m.f1 !== undefined ? (m.f1 * 100).toFixed(2) + '%' : '—'}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-dim)' }} className="font-mono tabular-nums">
                    {m.support !== undefined ? m.support.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confusion Matrix Heatmap */}
      {confusionMatrix && (
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div className="label-caps">Multiclass Confusion Matrix</div>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Rows: Actual Class &bull; Columns: Predicted Class
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-dim)', borderBottom: '1px solid var(--line)' }}>
                    Actual \ Pred
                  </th>
                  {confusionMatrix.labels.map((l: string) => (
                    <th key={l} style={{ padding: '8px', textAlign: 'right', color: 'var(--text-dim)', borderBottom: '1px solid var(--line)', textTransform: 'uppercase' }}>
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confusionMatrix.matrix.map((row: number[], rIdx: number) => {
                  const label = confusionMatrix?.labels[rIdx] || `C${rIdx}`;
                  return (
                    <tr key={label}>
                      <td style={{ padding: '8px', color: 'var(--text)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--line)' }}>
                        {label}
                      </td>
                      {row.map((val: number, cIdx: number) => {
                        const isDiagonal = rIdx === cIdx;
                        return (
                          <td
                            key={cIdx}
                            className="font-mono tabular-nums"
                            style={{
                              padding: '8px',
                              textAlign: 'right',
                              backgroundColor: isDiagonal ? 'rgba(182, 255, 59, 0.08)' : 'transparent',
                              color: isDiagonal ? 'var(--accent)' : 'var(--text-dim)',
                              border: '1px solid var(--line)',
                              fontWeight: isDiagonal ? 600 : 400,
                            }}
                          >
                            {val.toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
