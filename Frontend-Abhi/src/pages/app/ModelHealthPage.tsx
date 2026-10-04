import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { AttackMark } from '../../icons';
import { Glyph } from '../../icons/glyphs';
import type { AttackFamily } from '../../types/api';

export const ModelHealthPage: React.FC = () => {
  const { data: metrics, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['modelMetrics'],
    queryFn: () => api.getModelMetrics(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '32px', width: '220px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div className="skeleton" style={{ height: '80px' }} />
          <div className="skeleton" style={{ height: '80px' }} />
          <div className="skeleton" style={{ height: '80px' }} />
          <div className="skeleton" style={{ height: '80px' }} />
        </div>
        <div className="skeleton" style={{ height: '240px' }} />
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--sev-critical)', fontSize: '16px', marginBottom: '8px', fontWeight: 600 }}>
          Unable to retrieve model metrics
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>
          {(error as { detail?: string })?.detail || 'The /api/metrics/model/ endpoint did not respond.'}
        </div>
        <button onClick={() => refetch()} className="btn-secondary" style={{ padding: '6px 14px' }}>
          Retry
        </button>
      </div>
    );
  }

  const stage1 = metrics.stage1Metrics;
  const stage2 = metrics.stage2Metrics;
  const active = metrics.activeModel;

  const matrix = stage2?.confusionMatrix?.matrix || [];
  const matrixLabels = stage2?.confusionMatrix?.labels || ['normal', 'dos', 'probe', 'r2l', 'u2r'];
  const maxMatrixVal = matrix.length > 0 ? Math.max(...matrix.flat()) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
            Model Performance &amp; Evaluation Metrics
          </h1>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            Two-stage architecture: Stage 1 Isolation Forest Anomaly Detection &rarr; Stage 2 LightGBM Classifier
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="label-caps">Active Version:</span>
          <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {active?.version || 'N/A'}
          </span>
        </div>
      </div>

      {/* Class Imbalance Honesty Banner */}
      {stage2?.classImbalanceNote && (
        <div
          style={{
            background: 'rgba(242, 193, 78, 0.08)',
            border: '1px solid var(--sev-medium)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Glyph name="warning" size={16} />
          <div>
            <div style={{ color: 'var(--sev-medium)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Class Imbalance Disclosure
            </div>
            <div style={{ color: 'var(--text)', fontSize: '13px', marginTop: '2px' }}>
              {stage2.classImbalanceNote}
            </div>
          </div>
        </div>
      )}

      {/* KPI Metric Blocks */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Stage 2 Accuracy</div>
          <div className="font-mono tabular-nums" style={{ fontSize: '24px', color: 'var(--text)' }}>
            {stage2?.accuracy !== undefined ? `${(stage2.accuracy * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Overall classification rate
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Macro AUC-ROC</div>
          <div className="font-mono tabular-nums" style={{ fontSize: '24px', color: 'var(--accent)' }}>
            {stage2?.aucMacro !== undefined ? stage2.aucMacro.toFixed(3) : 'N/A'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Area under ROC curve (Macro)
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Stage 1 Novelty FPR</div>
          <div className="font-mono tabular-nums" style={{ fontSize: '24px', color: 'var(--text)' }}>
            {stage1?.noveltyFpr !== undefined ? `${(stage1.noveltyFpr * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Isolation Forest False Positive Rate
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Stage 1 Attack vs Normal AUC</div>
          <div className="font-mono tabular-nums" style={{ fontSize: '24px', color: 'var(--text)' }}>
            {stage1?.anomalyAucAttackVsNormal !== undefined ? stage1.anomalyAucAttackVsNormal.toFixed(3) : 'N/A'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Unsupervised anomaly separation
          </div>
        </div>
      </div>

      {/* Per-Class Precision & Recall Table */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Per-Class Precision, Recall &amp; F1-Scores</span>
          <span className="label-caps">Supervised Stage 2 Evaluation</span>
        </div>
        <div style={{ padding: '0', overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Attack Class</th>
                <th style={{ textAlign: 'right' }}>Precision</th>
                <th style={{ textAlign: 'right' }}>Recall</th>
                <th style={{ textAlign: 'right' }}>F1-Score</th>
                <th style={{ textAlign: 'right' }}>ROC-AUC</th>
                <th style={{ textAlign: 'right' }}>PR-AUC</th>
                <th style={{ textAlign: 'right' }}>Support</th>
              </tr>
            </thead>
            <tbody>
              {stage2?.perClass ? (
                Object.entries(stage2.perClass).map(([cls, row]) => (
                  <tr key={cls}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AttackMark family={cls as AttackFamily} size={15} />
                        <span className="label-caps" style={{ color: 'var(--text)' }}>
                          {cls.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {row.precision !== undefined ? `${(row.precision * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {row.recall !== undefined ? `${(row.recall * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--accent)' }} className="font-mono tabular-nums">
                      {row.f1 !== undefined ? row.f1.toFixed(3) : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {row.auc !== undefined ? row.auc.toFixed(3) : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {row.prAuc !== undefined ? row.prAuc.toFixed(3) : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-dim)' }} className="font-mono tabular-nums">
                      {row.support ? row.support.toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                    No per-class breakdown available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confusion Matrix (Heat Grid with Numbers) */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Confusion Matrix Heat Grid</span>
          <span className="label-caps">Rows: Actual &bull; Columns: Predicted</span>
        </div>
        <div style={{ padding: '20px', overflowX: 'auto' }}>
          {matrix.length > 0 ? (
            <div style={{ display: 'inline-block', minWidth: '480px' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(5, 75px)', gap: '4px', marginBottom: '4px' }}>
                <div />
                {matrixLabels.map((lbl) => (
                  <div key={lbl} className="label-caps" style={{ textAlign: 'center', padding: '4px 0' }}>
                    {lbl}
                  </div>
                ))}
              </div>

              {/* Matrix rows */}
              {matrix.map((row, rIdx) => {
                const actualLabel = matrixLabels[rIdx] || `Class ${rIdx}`;
                return (
                  <div
                    key={rIdx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px repeat(5, 75px)',
                      gap: '4px',
                      marginBottom: '4px',
                    }}
                  >
                    <div className="label-caps" style={{ display: 'flex', alignItems: 'center' }}>
                      {actualLabel}
                    </div>
                    {row.map((val, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      const heatRatio = maxMatrixVal > 0 ? val / maxMatrixVal : 0;
                      const bgAlpha = Math.max(0.06, heatRatio * 0.45);
                      const bgColor = isDiagonal
                        ? `rgba(182, 255, 59, ${bgAlpha})`
                        : val > 50
                        ? `rgba(255, 77, 61, ${bgAlpha * 1.2})`
                        : 'var(--bg-2)';

                      return (
                        <div
                          key={cIdx}
                          style={{
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: bgColor,
                            border: isDiagonal ? '1px solid var(--accent)' : '1px solid var(--line)',
                            fontSize: '11px',
                            color: isDiagonal ? 'var(--accent)' : val > 50 ? 'var(--sev-critical)' : 'var(--text)',
                          }}
                          className="font-mono tabular-nums"
                          title={`Actual ${actualLabel} -> Predicted ${matrixLabels[cIdx]}: ${val}`}
                        >
                          {val.toLocaleString()}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              Confusion matrix data not returned by backend.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
