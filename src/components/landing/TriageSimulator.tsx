import React, { useState } from 'react';
import type { AttackFamily, Severity } from '../../types/api';
import { Sigil, getAttackFamilyMark } from '../../icons';

export const TriageSimulator: React.FC = () => {
  const [anomalyScore, setAnomalyScore] = useState<number>(0.78);
  const [confidence, setConfidence] = useState<number>(88);
  const [predictedClass, setPredictedClass] = useState<AttackFamily>('r2l');
  const [flowIdentifier, setFlowIdentifier] = useState<string>('flow-sample-842');

  // Configured documented default triage cutoffs
  const CUTOFFS = {
    anomalyThreshold: 0.35,
    critical: 0.95,
    high: 0.85,
    medium: 0.7,
    low: 0.4,
  };

  // Run 3-way triage logic
  const evaluateTriage = (): {
    classification: string;
    severity: Severity | 'none';
    action: string;
    ruleFired: string;
    isLoggedSilently: boolean;
  } => {
    const isAnomalous = anomalyScore >= CUTOFFS.anomalyThreshold;
    const confFraction = confidence / 100;

    if (predictedClass === 'normal') {
      if (isAnomalous) {
        return {
          classification: 'NOVEL SUSPICIOUS',
          severity: 'high',
          action: 'Escalate to Tier 1 Analyst (Zero-Day Review)',
          ruleFired: `Stage 2 predicted Normal, but Stage 1 Anomaly Score (${anomalyScore.toFixed(
            2
          )}) exceeds noise floor (${CUTOFFS.anomalyThreshold}).`,
          isLoggedSilently: false,
        };
      } else {
        return {
          classification: 'NORMAL FLOW',
          severity: 'none',
          action: 'Log silently to archive; no alert generated',
          ruleFired: `Stage 2 predicted Normal and Stage 1 Anomaly Score (${anomalyScore.toFixed(
            2
          )}) is within nominal noise floor.`,
          isLoggedSilently: true,
        };
      }
    }

    // Known Attack classification
    let severity: Severity = 'low';
    if (confFraction >= CUTOFFS.critical || (anomalyScore > 0.9 && confFraction > 0.8)) {
      severity = 'critical';
    } else if (confFraction >= CUTOFFS.high || anomalyScore > 0.75) {
      severity = 'high';
    } else if (confFraction >= CUTOFFS.medium) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    return {
      classification: `KNOWN ATTACK: ${predictedClass.toUpperCase()}`,
      severity,
      action: `Generate ${severity.toUpperCase()} Alert & Notify SOC`,
      ruleFired: `Stage 2 identified signature ${predictedClass.toUpperCase()} (${confidence}% confidence); severity scored against cutoffs.`,
      isLoggedSilently: false,
    };
  };

  const outcome = evaluateTriage();
  const FamilyIcon = getAttackFamilyMark(predictedClass);

  return (
    <section
      id="simulator"
      style={{
        padding: '64px 24px',
        backgroundColor: 'var(--bg-0)',
        borderTop: '1px solid var(--line)',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Interactive Demonstration
        </div>
        <h2 className="font-display" style={{ fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
          Triage Decision Engine Simulator
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginTop: '6px' }}>
          Adjust Stage 1 anomaly score and Stage 2 confidence to see how SignSight routes network flows across the 3-way triage matrix using documented defaults.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Controls Column */}
        <div
          style={{
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--line)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label-caps">Input Parameters</span>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--accent)' }}>
              Documented defaults
            </span>
          </div>

          {/* Anomaly Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="sim-anomaly-score" className="label-caps">Stage 1 Anomaly Score</label>
              <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '13px' }}>
                {anomalyScore.toFixed(2)}
              </span>
            </div>
            <input
              id="sim-anomaly-score"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={anomalyScore}
              onChange={(e) => setAnomalyScore(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span>0.00 (Nominal)</span>
              <span>Noise floor: 0.35</span>
              <span>1.00 (Anomalous)</span>
            </div>
          </div>

          {/* Confidence Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="sim-confidence" className="label-caps">Stage 2 Predicted Confidence</label>
              <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '13px' }}>
                {confidence}%
              </span>
            </div>
            <input
              id="sim-confidence"
              type="range"
              min="0"
              max="100"
              step="1"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Predicted Class Dropdown */}
          <div>
            <label htmlFor="sim-predicted-class" className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
              Stage 2 Predicted Attack Family
            </label>
            <select
              id="sim-predicted-class"
              className="select font-mono"
              value={predictedClass}
              onChange={(e) => setPredictedClass(e.target.value as AttackFamily)}
              style={{ width: '100%', height: '36px', backgroundColor: 'var(--bg-2)', color: 'var(--text)' }}
            >
              <option value="normal">Normal (Benign)</option>
              <option value="dos">DoS (Denial of Service)</option>
              <option value="probe">Probe (Reconnaissance)</option>
              <option value="r2l">R2L (Remote to Local)</option>
              <option value="u2r">U2R (User to Root)</option>
            </select>
          </div>

          {/* Flow identifier */}
          <div>
            <label htmlFor="sim-flow-id" className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
              Flow Identifier (for Sigil hashing)
            </label>
            <input
              id="sim-flow-id"
              type="text"
              className="input input-mono"
              value={flowIdentifier}
              onChange={(e) => setFlowIdentifier(e.target.value)}
              placeholder="e.g. flow-sample-842"
            />
          </div>
        </div>

        {/* Output Column */}
        <div
          style={{
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--line)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="label-caps">Triage Decision Output</span>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                CLIENT EVALUATION
              </span>
            </div>

            {/* Alert Card Output */}
            <div
              style={{
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line-strong)',
                borderLeft: `4px solid ${
                  outcome.severity === 'critical'
                    ? 'var(--sev-critical)'
                    : outcome.severity === 'high'
                    ? 'var(--sev-high)'
                    : outcome.severity === 'medium'
                    ? 'var(--sev-medium)'
                    : outcome.severity === 'low'
                    ? 'var(--sev-low)'
                    : 'var(--line-strong)'
                }`,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sigil id={flowIdentifier.trim() || 'flow-0'} size={32} severity={outcome.severity !== 'none' ? outcome.severity : undefined} />
                  <div>
                    <div className="font-mono" style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>
                      {flowIdentifier || 'flow-0'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FamilyIcon size={12} />
                      <span>{outcome.classification}</span>
                    </div>
                  </div>
                </div>

                {outcome.severity !== 'none' ? (
                  <span
                    className="sev-tag"
                    style={{
                      borderColor:
                        outcome.severity === 'critical'
                          ? 'var(--sev-critical)'
                          : outcome.severity === 'high'
                          ? 'var(--sev-high)'
                          : outcome.severity === 'medium'
                          ? 'var(--sev-medium)'
                          : 'var(--sev-low)',
                      color:
                        outcome.severity === 'critical'
                          ? 'var(--sev-critical)'
                          : outcome.severity === 'high'
                          ? 'var(--sev-high)'
                          : outcome.severity === 'medium'
                          ? 'var(--sev-medium)'
                          : 'var(--sev-low)',
                      backgroundColor: 'transparent',
                    }}
                  >
                    {outcome.severity.toUpperCase()}
                  </span>
                ) : (
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                    NO ALERT
                  </span>
                )}
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--line)' }} />

              <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-dim)' }}>Action: </strong>
                <span>{outcome.action}</span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-faint)' }}>Rule: </strong>
                <span>{outcome.ruleFired}</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-faint)', lineHeight: 1.4 }}>
            In production, Stage 1 (Isolation Forest) evaluates unlabelled volumetric anomaly patterns before passing features into Stage 2 (LightGBM).
          </div>
        </div>
      </div>
    </section>
  );
};
