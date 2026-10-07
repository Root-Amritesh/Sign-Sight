import React from 'react';
import { Link } from 'react-router-dom';

export const AccessibilityPage: React.FC = () => {
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
              SignSight Accessibility
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            WCAG AA COMPLIANCE STATEMENT
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
          Universal Access
        </div>
        <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Accessibility Statement
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          SignSight is committed to delivering a high-contrast, fully keyboard-navigable operational environment adhering to WCAG 2.1 Level AA criteria.
        </p>

        <h2 className="font-display" style={{ fontSize: '20px', color: 'var(--text)', marginBottom: '12px' }}>
          Verified Accessibility Features
        </h2>
        <ul style={{ paddingLeft: '20px', color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            <strong>100% Keyboard Operability:</strong> All triage queues, detail sheets, sliders, modal views, and interactive demos are reachable via standard keyboard navigation (Tab, Shift+Tab, Enter, Space, Arrow keys, Esc) without trap states.
          </li>
          <li>
            <strong>Strict Reduced Motion Compliance:</strong> When <code>prefers-reduced-motion: reduce</code> is detected, animations (including 3D globe rotation, particle drift, alert flashes, and pulse indicators) degrade to static states with instantaneous transitions.
          </li>
          <li>
            <strong>Contrast &amp; Non-Color Encoding:</strong> Severity indicators combine distinct text tags (CRITICAL, HIGH, MEDIUM, LOW) with numeric values. Color is never the sole carrier of forensic meaning.
          </li>
          <li>
            <strong>Semantic Landmarks &amp; ARIA Live:</strong> HTML5 landmarks (<code>main</code>, <code>nav</code>, <code>aside</code>, <code>header</code>, <code>footer</code>) and polite live regions announce real-time incoming alerts.
          </li>
        </ul>

        <h2 className="font-display" style={{ fontSize: '20px', color: 'var(--text)', marginTop: '28px', marginBottom: '12px' }}>
          Known Accessibility Limitations
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.6 }}>
          The interactive 3D WebGL Threat Globe provides full screen reader table alternatives in the Flat Map and Alerts Queue views. High-density tabular data grids are best navigated on viewports above 1280px width.
        </p>

        <div className="panel" style={{ padding: '16px', marginTop: '24px' }}>
          <div className="label-caps" style={{ marginBottom: '6px' }}>Feedback &amp; Issue Reporting</div>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>
            If you encounter an accessibility barrier in the console, please contact our team at <code>FILL: accessibility@signsight.internal</code>.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight Accessibility Compliance &bull; Microsoft Innovate 2026
      </footer>
    </div>
  );
};
