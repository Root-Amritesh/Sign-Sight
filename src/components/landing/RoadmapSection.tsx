import React from 'react';

export const RoadmapSection: React.FC = () => {
  return (
    <section
      id="roadmap"
      style={{
        padding: '64px 24px',
        backgroundColor: 'var(--bg-1)',
        borderTop: '1px solid var(--line)',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Engineering Transparency
        </div>
        <h2 className="font-display" style={{ fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Roadmap & Known Prototype Limitations
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginTop: '6px' }}>
          A factual account of implemented functionality, current workstreams, and verified architectural bounds.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(320px, 1fr)',
          gap: '32px',
        }}
      >
        {/* Timeline Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="label-caps">Milestone Timeline</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
            {/* Completed */}
            <div
              style={{
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line)',
                borderLeft: '4px solid var(--accent)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 600 }}>
                  MILESTONE 1 — DELIVERED
                </span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>v2.4.1</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>
                <li>Two-stage hybrid ML engine (Isolation Forest into LightGBM).</li>
                <li>Full SOC frontend: 3D globe threat map, query builder, and triage queue.</li>
                <li>Deterministic geometric <code>&lt;Sigil /&gt;</code> generation for all IP artifacts.</li>
                <li>Offline service worker fallback with WebAudio & Canvas spacecraft game.</li>
              </ul>
            </div>

            {/* In Progress */}
            <div
              style={{
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line)',
                borderLeft: '4px solid var(--sev-medium)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="font-mono" style={{ color: 'var(--sev-medium)', fontSize: '12px', fontWeight: 600 }}>
                  MILESTONE 2 — IN PROGRESS
                </span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Q4 2026</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>
                <li>Microsoft Entra ID token exchange backend integration.</li>
                <li>Automated multi-worker hot-swap synchronization via Redis pub/sub.</li>
                <li>Direct MaxMind GeoIP lookup for public non-RFC1918 traffic.</li>
              </ul>
            </div>

            {/* Planned */}
            <div
              style={{
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line)',
                borderLeft: '4px solid var(--text-dim)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>
                  MILESTONE 3 — PLANNED
                </span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>2027</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                <li>Continuous self-supervised retraining pipeline for analyst feedback verdicts.</li>
                <li>Native Zeek & Suricata EVE.json real-time streaming agent.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Known Limitations Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="label-caps">Verified Prototype Limitations</div>

          <div
            style={{
              backgroundColor: 'var(--bg-0)',
              border: '1px solid var(--line-strong)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--sev-medium)' }}>1. Advisory-Only Posture:</strong> SignSight recommends triage actions and generates alerts; it does not inject TCP RST or modify firewall ACL rules automatically.
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--sev-medium)' }}>2. Simulated Geolocation:</strong> RFC1918 private subnets are mapped to deterministic synthetic coordinates with visible <code className="badge-demo">SIMULATED GEO</code> tags.
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--sev-medium)' }}>3. Offline Retraining:</strong> Analyst verdicts are archived for candidate extraction; automated continuous fine-tuning is not executed autonomously without model verification.
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--sev-medium)' }}>4. Single-Tenant Storage:</strong> Audit logs and telemetry are maintained within local PostgreSQL without distributed multi-region sharding in the hackathon prototype.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
