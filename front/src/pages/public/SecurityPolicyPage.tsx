import React from 'react';
import { Link } from 'react-router-dom';

export const SecurityPolicyPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-0)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          height: '48px',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'var(--bg-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
            <span className="font-display" style={{ fontSize: '16px', color: 'var(--text)' }}>
              SignSight Security Policy
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            RESPONSIBLE DISCLOSURE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/docs" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Docs</Link>
          <Link to="/auth" className="btn btn-primary" style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}>
            Console Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '68ch', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Vulnerability Reporting
        </div>
        <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Security &amp; Vulnerability Disclosure Policy
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          We welcome responsible disclosures from cybersecurity researchers regarding the SignSight hybrid NIDS platform and infrastructure.
        </p>

        <div className="panel" style={{ padding: '20px', marginBottom: '28px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>How to Report a Security Issue</div>
          <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
            Send an encrypted email report to our security contact at <code>FILL: security@signsight.internal</code>. Please include detailed reproduction steps, network capture payloads, and affected component versions.
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>
            Plaintext specification is also available at <code>/.well-known/security.txt</code>.
          </div>
        </div>

        <h2 className="font-display" style={{ fontSize: '22px', color: 'var(--text)', marginBottom: '12px' }}>
          Known Prototype Security Bounds
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <strong>1. Advisory Posture:</strong> SignSight evaluates flow metadata and emits alert scores. It does not manipulate physical networking routing tables or perform automated packet drops.
          </div>
          <div>
            <strong>2. RFC 1918 Private Traffic:</strong> Internal IP telemetry uses simulated coordinates labeled <code>SIMULATED GEO</code>.
          </div>
          <div>
            <strong>3. In-Memory JWT Tokens:</strong> Access tokens are held in client memory only and refreshed silently over secure HTTPOnly cookies.
          </div>
        </div>

        <div style={{ marginTop: '32px', fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
          Prototype document for Microsoft Innovate 2026. Not legal advice.
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight Security Governance &bull; Team Code Of Thrones
      </footer>
    </div>
  );
};
