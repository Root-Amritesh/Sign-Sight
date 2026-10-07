import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
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

      {/* Content */}
      <main style={{ maxWidth: '68ch', margin: '48px auto', padding: '0 24px', flex: 1, width: '100%' }}>
        <Link
          to="/"
          style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '24px', display: 'inline-block' }}
        >
          &larr; Back to Overview
        </Link>

        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          MICROSOFT INNOVATE 2026 &bull; CYBERSECURITY TRACK
        </div>

        <h1 className="font-display" style={{ fontSize: '32px', letterSpacing: '-0.02em', marginBottom: '16px' }}>
          About Team Code Of Thrones
        </h1>

        <p style={{ color: 'var(--text)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
          SignSight was conceived and built for Microsoft Innovate 2026 to address a fundamental shortcoming in signature-based enterprise network security: zero-day variants and volumetric novel attacks consistently evade static signature rules.
        </p>

        {/* Problem Statement Card */}
        <div className="panel" style={{ padding: '20px', marginBottom: '32px' }}>
          <div className="label-caps" style={{ marginBottom: '6px' }}>Problem Statement</div>
          <div className="font-display" style={{ fontSize: '18px', color: 'var(--text)' }}>
            &ldquo;Catch the Attack the Signatures Miss&rdquo;
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
            By decoupling statistical anomaly detection (Isolation Forest) from attack classification (LightGBM), the system isolates unprofiled traffic anomalies while retaining actionable multi-class categorisation and MITRE ATT&amp;CK mappings for the security operations analyst.
          </p>
        </div>

        {/* Team Members List */}
        <div className="panel" style={{ padding: '20px', marginBottom: '32px' }}>
          <div className="label-caps" style={{ marginBottom: '14px' }}>Project Contributors</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  Team Lead &amp; Frontend Systems
                </span>
                <span className="label-caps">Frontend Architecture</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Built React 18 application shell, 3D geospatial projection, deterministic Sigil cryptographic system, and offline game.
              </p>
            </div>

            <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  Machine Learning Engineer
                </span>
                <span className="label-caps">Pipelines &amp; Drift</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Engineered two-stage pipeline, Isolation Forest hyperparameter tuning, and LightGBM multi-class model training.
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  Backend Telemetry Architect
                </span>
                <span className="label-caps">API &amp; Ingestion</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Implemented Django REST Framework endpoints, JWT rotation, NetFlow ingestion pipelines, and benchmark replay.
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="panel" style={{ padding: '20px' }}>
          <div className="label-caps" style={{ marginBottom: '10px' }}>Architecture &amp; Stack</div>
          <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-dim)' }}>
            <li><strong style={{ color: 'var(--text)' }}>Frontend:</strong> React 18, TypeScript, Vite, TanStack Query, D3 (d3-geo, d3-force), Canvas 2D.</li>
            <li><strong style={{ color: 'var(--text)' }}>Design System:</strong> Custom CSS variables, dark high-density theme, hairline 1px borders, zero component libraries.</li>
            <li><strong style={{ color: 'var(--text)' }}>Backend:</strong> Python, Django REST Framework, JWT Token Rotation, Google OAuth.</li>
            <li><strong style={{ color: 'var(--text)' }}>ML Pipeline:</strong> Scikit-learn (Isolation Forest), LightGBM, Wasserstein concept drift scoring.</li>
          </ul>
        </div>
      </main>
    </div>
  );
};
