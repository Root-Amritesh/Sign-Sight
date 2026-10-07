import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-0)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          height: '52px',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'var(--bg-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
          <span className="font-display" style={{ fontSize: '16px' }}>SignSight</span>
        </Link>
        <Link to="/auth" className="btn btn-primary" style={{ height: '28px', fontSize: '11px' }}>
          Console Sign In
        </Link>
      </header>

      {/* Main Grid with Sticky TOC on left */}
      <div
        style={{
          maxWidth: '1080px',
          margin: '40px auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '220px minmax(320px, 68ch)',
          gap: '48px',
          alignItems: 'start',
          flex: 1,
          width: '100%',
        }}
      >
        {/* Sticky TOC on Left */}
        <aside style={{ position: 'sticky', top: '72px' }}>
          <div className="label-caps" style={{ marginBottom: '12px' }}>Table of Contents</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <a href="#scope" style={{ color: 'var(--text-dim)' }}>1. Scope &amp; Purpose</a>
            <a href="#data-collected" style={{ color: 'var(--text-dim)' }}>2. Telemetry &amp; Data Collected</a>
            <a href="#google-auth" style={{ color: 'var(--text-dim)' }}>3. Google Authentication</a>
            <a href="#local-storage" style={{ color: 'var(--text-dim)' }}>4. Storage &amp; Cookies</a>
            <a href="#retention" style={{ color: 'var(--text-dim)' }}>5. Retention &amp; Security</a>
            <a href="#disclaimer" style={{ color: 'var(--text-dim)' }}>6. Prototype Disclaimer</a>
          </nav>
        </aside>

        {/* Longform Text (68ch) */}
        <main>
          <Link
            to="/"
            style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px', display: 'inline-block' }}
          >
            &larr; Back to Overview
          </Link>

          <h1 className="font-display" style={{ fontSize: '32px', marginBottom: '8px' }}>
            Privacy Policy
          </h1>
          <div className="font-mono label-caps" style={{ color: 'var(--text-faint)', marginBottom: '32px' }}>
            LAST UPDATED: OCTOBER 2, 2026 &bull; PROTOTYPE DOCUMENT
          </div>

          <section id="scope" style={{ marginBottom: '32px' }}>
            <h2 className="font-display" style={{ fontSize: '18px', marginBottom: '8px' }}>
              1. Scope &amp; Purpose
            </h2>
            <p style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: '14px' }}>
              This policy explains how the SignSight SOC prototype collects, processes, and protects network telemetry and analyst account data. SignSight was created by Team Code Of Thrones for the Microsoft Innovate 2026 hackathon.
            </p>
          </section>

          <section id="data-collected" style={{ marginBottom: '32px' }}>
            <h2 className="font-display" style={{ fontSize: '18px', marginBottom: '8px' }}>
              2. Telemetry &amp; Data Collected
            </h2>
            <p style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: '14px', marginBottom: '12px' }}>
              SignSight processes network flow records ingested via API, file upload, or synthetic benchmark replay. These records contain:
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-dim)', lineHeight: 1.6, fontSize: '13px' }}>
              <li>Source and destination IPv4 addresses and transport ports.</li>
              <li>Network protocol headers (TCP, UDP, ICMP) and flow duration measurements.</li>
              <li>Packet sizing statistics (source bytes, destination bytes, error counters).</li>
              <li>Analyst triage actions, including investigation notes and verdict dispositions.</li>
              <li>System audit entries tracking user actions and timestamped source IP addresses.</li>
            </ul>
          </section>

          <section id="google-auth" style={{ marginBottom: '32px' }}>
            <h2 className="font-display" style={{ fontSize: '18px', marginBottom: '8px' }}>
              3. Google Authentication
            </h2>
            <p style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: '14px' }}>
              When signing in with Google OAuth, SignSight requests access only to your email address and basic profile identifier for authentication verification. We do not inspect your Google Drive, contacts, or secondary cloud assets.
            </p>
          </section>

          <section id="local-storage" style={{ marginBottom: '32px' }}>
            <h2 className="font-display" style={{ fontSize: '18px', marginBottom: '8px' }}>
              4. Storage &amp; Browser Cookies
            </h2>
            <p style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: '14px', marginBottom: '8px' }}>
              SignSight strictly limits client storage:
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-dim)', lineHeight: 1.6, fontSize: '13px' }}>
              <li><strong>Access Token:</strong> Stored in active browser memory only, never written to disk or localStorage.</li>
              <li><strong>Local Preferences:</strong> Browser <code className="font-mono">localStorage</code> is used strictly for offline game high scores, saved query definitions, and demo mode flags.</li>
              <li><strong>No Third-Party Trackers:</strong> No advertising beacons or third-party analytics pixels are bundled.</li>
            </ul>
          </section>

          <section id="retention" style={{ marginBottom: '32px' }}>
            <h2 className="font-display" style={{ fontSize: '18px', marginBottom: '8px' }}>
              5. Retention &amp; Security
            </h2>
            <p style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: '14px' }}>
              Telemetry submitted during evaluation sessions is stored in internal PostgreSQL databases and cleared periodically between benchmark runs. All communications between the browser client and backend APIs travel over encrypted transport.
            </p>
          </section>

          <section id="disclaimer" style={{ marginBottom: '48px' }}>
            <div className="panel" style={{ padding: '16px', borderLeft: '3px solid var(--accent)' }}>
              <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '4px' }}>
                Legal Notice
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Prototype document, not legal advice. SignSight is an academic and competitive research demonstration prototype developed for evaluation purposes.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
