import React from 'react';
import type { UIAlertDetail } from '../../api/adapters/alerts';
import { getAttackFamilyMark } from '../../icons';

interface WhyFlaggedPanelProps {
  alert: UIAlertDetail;
}

export const WhyFlaggedPanel: React.FC<WhyFlaggedPanelProps> = ({ alert }) => {
  const explanation = alert.explanation;
  const topFeatures = explanation?.topFeatures || [];
  const anomalyScore = alert.anomalyScore ?? 0;

  const maxContribution = Math.max(
    ...topFeatures.map((f) => Math.abs(f.contribution)),
    0.1
  );

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-1)',
        border: '1px solid var(--line)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className="label-caps" style={{ color: 'var(--text)' }}>
            Why was this flagged
          </span>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '11px',
              color: 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [FEATURE CONTRIBUTION & STAGE 1 / 2 CORRELATION]
          </span>
        </div>
        <span
          className="font-mono"
          style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
            padding: '2px 6px',
            backgroundColor: 'var(--bg-2)',
            border: '1px solid var(--line)',
          }}
        >
          {explanation?.method ? `METHOD: ${explanation.method.toUpperCase()}` : 'LIGHTGBM PRED_CONTRIB'}
        </span>
      </div>

      {/* Recommendation / Recommendation Callout */}
      {alert.recommendation && (
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-2)',
            borderLeft: `3px solid ${
              alert.severity === 'critical'
                ? 'var(--sev-critical)'
                : alert.severity === 'high'
                ? 'var(--sev-high)'
                : 'var(--accent)'
            }`,
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--text)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {alert.recommendation}
        </div>
      )}

      {/* Dual Stage Telemetry & Feature Contribution Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1fr) minmax(280px, 1.4fr)',
          gap: '20px',
        }}
      >
        {/* Left: Stage 1 Score & Stage 2 Probs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="label-caps">Stage 1 Anomaly Score</span>
              <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text)' }}>
                {anomalyScore.toFixed(3)}
              </span>
            </div>

            {/* Gauge with Novelty Threshold marker */}
            <div
              style={{
                height: '10px',
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line)',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              {/* Baseline marker at 0.65 */}
              <div
                style={{
                  position: 'absolute',
                  left: '65%',
                  top: '-4px',
                  bottom: '-4px',
                  width: '2px',
                  backgroundColor: 'var(--text-dim)',
                  zIndex: 2,
                }}
                title="Novelty Threshold (0.65)"
              />
              {/* Score bar */}
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(anomalyScore * 100, 100)}%`,
                  backgroundColor:
                    anomalyScore >= 0.65
                      ? 'var(--sev-critical)'
                      : anomalyScore >= 0.5
                      ? 'var(--sev-high)'
                      : 'var(--accent)',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '4px',
                fontSize: '10px',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>0.0 (Nominal)</span>
              <span>Novelty Cutoff: 0.65</span>
              <span>1.0 (Anomalous)</span>
            </div>
          </div>

          {/* Stage 2 Probabilities */}
          <div>
            <div className="label-caps" style={{ marginBottom: '8px' }}>
              Stage 2 Class Probabilities
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(alert.probabilities || {}).map(([className, probability]) => {
                const isWinner = className === alert.predictedLabel;
                const FamilyIcon = getAttackFamilyMark(className as Parameters<typeof getAttackFamilyMark>[0]);
                return (
                  <div key={className} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <div style={{ width: '16px', display: 'flex', alignItems: 'center' }}>
                      <FamilyIcon size={14} />
                    </div>
                    <span
                      className="font-mono"
                      style={{
                        width: '56px',
                        color: isWinner ? 'var(--text)' : 'var(--text-dim)',
                        fontWeight: isWinner ? 600 : 400,
                      }}
                    >
                      {className.toUpperCase()}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: '6px',
                        backgroundColor: 'var(--bg-2)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(probability * 100).toFixed(1)}%`,
                          backgroundColor: isWinner ? 'var(--accent)' : 'var(--line-strong)',
                        }}
                      />
                    </div>
                    <span
                      className="font-mono"
                      style={{
                        width: '42px',
                        textAlign: 'right',
                        color: isWinner ? 'var(--accent)' : 'var(--text-dim)',
                      }}
                    >
                      {(probability * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Feature Contribution Bars */}
        <div>
          <div className="label-caps" style={{ marginBottom: '8px' }}>
            Feature Contribution (LightGBM pred_contrib)
          </div>
          {topFeatures.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic', padding: '8px 0' }}>
              No feature contribution breakdown available for this alert.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topFeatures.map((f) => {
                const normalized = (Math.abs(f.contribution) / maxContribution) * 100;
                return (
                  <div
                    key={f.feature}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--text)' }}>{f.feature}</span>
                      <span style={{ color: 'var(--text-dim)' }}>
                        contrib: {f.contribution > 0 ? `+${f.contribution.toFixed(3)}` : f.contribution.toFixed(3)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        backgroundColor: 'var(--bg-2)',
                        border: '1px solid var(--line)',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${normalized}%`,
                          backgroundColor: f.contribution >= 0 ? 'var(--accent)' : 'var(--sev-high)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
