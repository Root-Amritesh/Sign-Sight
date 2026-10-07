import React from 'react';
import { Link } from 'react-router-dom';

export const ContactPage: React.FC = () => {
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
              SignSight Contact
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            TEAM CODE OF THRONES
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/about" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>About Team</Link>
          <Link to="/auth" className="btn btn-primary" style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}>
            Console Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '68ch', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Communication Channels
        </div>
        <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Contact Team Code Of Thrones
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          Direct inquiries regarding the SignSight architecture, hackathon evaluation, and technical demonstrations can be routed to the project contacts below.
        </p>

        <div className="panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div className="label-caps">Team Lead / General Inquiries</div>
            <div style={{ marginTop: '4px' }}>
              <a
                href="mailto:FILL:teamlead@signsight.internal"
                style={{ color: 'var(--accent)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}
              >
                FILL: teamlead@signsight.internal
              </a>
            </div>
          </div>

          <div>
            <div className="label-caps">Security &amp; Vulnerability Reporting</div>
            <div style={{ marginTop: '4px' }}>
              <a
                href="mailto:FILL:security@signsight.internal"
                style={{ color: 'var(--accent)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}
              >
                FILL: security@signsight.internal
              </a>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>
            <strong>Honesty Notice:</strong> No backend endpoint exists for contact form submission in the prototype; inquiries are directed via verified mailto links.
          </div>
        </div>

        <div style={{ marginTop: '32px', fontSize: '11px', color: 'var(--text-faint)' }}>
          Built for Microsoft Innovate 2026 &bull; Theme: Cybersecurity (Security Operations)
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight Project Contacts &bull; Microsoft Innovate 2026
      </footer>
    </div>
  );
};
