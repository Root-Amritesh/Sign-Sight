import React from 'react';

export const ComparisonTable: React.FC = () => {
  return (
    <section
      id="compare"
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
          Objective Evaluation
        </div>
        <h2 className="font-display" style={{ fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Honest Architectural Comparison
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginTop: '6px' }}>
          How SignSight's hybrid statistical & tree-based flow classifier compares to traditional signature detection and naive single-model ML.
        </p>
      </div>

      <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Evaluation Axis</th>
                <th style={{ width: '26%' }}>Signature IDS (Snort / Suricata)</th>
                <th style={{ width: '26%' }}>Supervised-Only ML</th>
                <th style={{ width: '26%', color: 'var(--accent)' }}>SignSight Hybrid (Stage 1 + 2)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Novel / Zero-Day Coverage</strong></td>
                <td style={{ color: 'var(--sev-critical)' }}>
                  None. Completely blind to uncatalogued patterns or variant payloads.
                </td>
                <td style={{ color: 'var(--sev-high)' }}>
                  Weak. Tends to force novel vectors into the closest known training class.
                </td>
                <td style={{ color: 'var(--accent)' }}>
                  High. Stage 1 Isolation Forest flags density deviations as Novel Suspicious.
                </td>
              </tr>
              <tr>
                <td><strong>Payload Inspection (DPI)</strong></td>
                <td style={{ color: 'var(--accent)' }}>
                  Full payload byte-matching and regular expression rules.
                </td>
                <td style={{ color: 'var(--text-dim)' }}>
                  Flow-vector metadata only; no raw payload inspection.
                </td>
                <td style={{ color: 'var(--text-dim)' }}>
                  Flow-vector metadata only. (SignSight is flow-based and complementary).
                </td>
              </tr>
              <tr>
                <td><strong>Explainability</strong></td>
                <td style={{ color: 'var(--text)' }}>
                  High. Deterministic rule ID and matched byte sequence.
                </td>
                <td style={{ color: 'var(--sev-high)' }}>
                  Low to moderate. Opaque black-box output without triage context.
                </td>
                <td style={{ color: 'var(--accent)' }}>
                  High. Stage 1 anomaly scores + LightGBM feature importance rankings.
                </td>
              </tr>
              <tr>
                <td><strong>SOC Alert Fatigue</strong></td>
                <td style={{ color: 'var(--sev-critical)' }}>
                  High. Thousands of low-priority signature alerts overwhelm Tier 1.
                </td>
                <td style={{ color: 'var(--sev-high)' }}>
                  High. Uncalibrated probabilities produce false positives on skewed data.
                </td>
                <td style={{ color: 'var(--accent)' }}>
                  Controlled. 3-way triage suppresses benign flows and prioritizes high-confidence hits.
                </td>
              </tr>
              <tr>
                <td><strong>Deployment & Maintenance</strong></td>
                <td style={{ color: 'var(--text-dim)' }}>
                  Constant rule subscription updates and heavy compute overhead for DPI.
                </td>
                <td style={{ color: 'var(--text-dim)' }}>
                  Requires frequent retraining to prevent concept drift.
                </td>
                <td style={{ color: 'var(--text)' }}>
                  Lightweight flow ingestion (1.42ms latency) with continuous drift tracking.
                </td>
              </tr>
              <tr style={{ backgroundColor: 'var(--bg-2)' }}>
                <td><strong>Where Signature IDS is Better</strong></td>
                <td colSpan={3} style={{ color: 'var(--text)', fontSize: '13px', lineHeight: 1.5 }}>
                  Signature-based systems excel at inline wire-speed packet dropping and exact CVE matching. SignSight does not replace Snort or Suricata; it operates alongside them to catch stealthy volumetric anomalies that evade rigid signatures.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
