import React from 'react';
import { Link } from 'react-router-dom';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'RELEASE' | 'ENHANCEMENT' | 'SECURITY';
  changes: string[];
}

const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: 'v2.4.1',
    date: '2026-09-28',
    type: 'RELEASE',
    changes: [
      'Delivered Results benchmark comparison page (/app/results) proving Stage 1 Isolation Forest value over baseline.',
      'Added 90-second automated Guided Demo scenario with bottom narrator HUD and keyboard playback controls.',
      'Implemented Microsoft Teams Adaptive Card escalation preview on Alert Detail forensics view.',
      'Introduced Why was this flagged explainability panel with Stage 1/2 gauge and feature importance weights.',
      'Built interactive Triage Simulator, Flow Playground, and Sigil Lab on long-form editorial landing page.',
    ],
  },
  {
    version: 'v2.3.0',
    date: '2026-09-20',
    type: 'ENHANCEMENT',
    changes: [
      'Added 3D WebGL Threat Globe with real-time vector attack arcs and TopoJSON land contours.',
      'Integrated deterministic geometric <Sigil /> generation with multi-scale SVG export support.',
      'Built Query Workspace with structured token filter builder and raw NetFlow syntax search.',
      'Implemented CSV batch upload and background task polling pipeline (/app/ingest).',
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-09-10',
    type: 'SECURITY',
    changes: [
      'Initial foundation: strict design system tokens, self-hosted typography (Clash Display, Satoshi, JetBrains Mono).',
      'Role-based access control (Analyst, Admin) with in-memory JWT handling and silent token refresh.',
      'Offline Service Worker caching and WebAudio / Canvas spacecraft defense fallback game.',
    ],
  },
];

export const ChangelogPage: React.FC = () => {
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
              SignSight Changelog
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            ENGINEERING LOG
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
      <main style={{ flex: 1, maxWidth: '840px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Release History
        </div>
        <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
          SignSight Platform Changelog
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginBottom: '32px', lineHeight: 1.6 }}>
          Chronological milestone updates and verified architectural releases.
        </p>

        {/* Timeline Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {CHANGELOG_ENTRIES.map((entry) => (
            <div
              key={entry.version}
              className="panel"
              style={{
                padding: '24px',
                borderLeft: '4px solid var(--accent)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="font-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                    {entry.version}
                  </span>
                  <span
                    className="font-mono label-caps"
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor: 'var(--bg-2)',
                      border: '1px solid var(--line-strong)',
                      color: 'var(--accent)',
                    }}
                  >
                    {entry.type}
                  </span>
                </div>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  {entry.date}
                </span>
              </div>

              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                {entry.changes.map((change, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight Release Engineering &bull; Microsoft Innovate 2026
      </footer>
    </div>
  );
};
