import React from 'react';

export const FontComparisonPage: React.FC = () => {
  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <h1 className="font-display" style={{ fontSize: '28px', marginBottom: '16px' }}>
        Typography Reference & Diagnostic Canvas
      </h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: '32px' }}>
        Active Primary Stack: Bricolage Grotesque (Display), Geist (Body/UI), JetBrains Mono (Code/Telemetry).
      </p>
      <div style={{ display: 'grid', gap: '24px' }}>
        <div className="panel" style={{ padding: '20px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Display Family (Bricolage Grotesque)</div>
          <div className="font-display" style={{ fontSize: '24px', letterSpacing: '-0.02em' }}>
            Catch the attack the signatures miss. Stage 1 Anomaly &bull; Stage 2 Probability.
          </div>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Interface Family (Geist)</div>
          <div style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text)' }}>
            Calibrated SOC forensic triage. High-fidelity detection surfaces for security analysts.
          </div>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Monospace Family (JetBrains Mono)</div>
          <div className="font-mono" style={{ fontSize: '13px', color: 'var(--accent)' }}>
            SRC 192.168.1.105:443 &rarr; DST 10.0.4.12:8080 [STAGE1: 0.942] [STAGE2: 0.887]
          </div>
        </div>
      </div>
    </div>
  );
};
