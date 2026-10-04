import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DashboardIcon,
  AlertIcon,
  AlertDetailIcon,
  MapIcon,
  GraphIcon,
  QueryIcon,
  IngestIcon,
  ReplayIcon,
  ModelIcon,
  RegistryIcon,
  DriftIcon,
  AuditIcon,
  SettingsIcon,
  ProfileIcon,
  FilterIcon,
  SearchIcon,
  ExportIcon,
  DeployIcon,
  RollbackIcon,
  EscalateIcon,
  ResolveIcon,
  FalsePositiveIcon,
  TruePositiveIcon,
  OnlineIcon,
  OfflineIcon,
  ShieldOpenIcon,
  CloseIcon,
  ChevronIcon,
  WarningIcon,
  ResultsIcon,
  IncidentIcon,
  FeedbackIcon,
  KioskIcon,
  BellIcon,
  CheckIcon,
  DownloadIcon,
} from '../../icons';

export const BrandPage: React.FC = () => {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToken = (hex: string, name: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedToken(name);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const PALETTE = [
    { name: '--bg-0', hex: '#0A0B0C', use: 'App background (tinted dark)' },
    { name: '--bg-1', hex: '#101214', use: 'Panels, toolbars, cards' },
    { name: '--bg-2', hex: '#16191B', use: 'Raised rows, inputs, sub-panels' },
    { name: '--line', hex: '#23282B', use: '1px hairline borders' },
    { name: '--line-strong', hex: '#343B3F', use: 'Hovered or focused borders' },
    { name: '--text', hex: '#E6E8E3', use: 'Primary warm off-white text' },
    { name: '--text-dim', hex: '#8A918C', use: 'Secondary body text' },
    { name: '--text-faint', hex: '#566059', use: 'Tertiary, disabled markers' },
    { name: '--accent', hex: '#B6FF3B', use: 'Single brand accent (lime)' },
    { name: '--sev-critical', hex: '#FF4D3D', use: 'CRITICAL severity tag & alerts' },
    { name: '--sev-high', hex: '#FF9A1F', use: 'HIGH severity tag & alerts' },
    { name: '--sev-medium', hex: '#F2C14E', use: 'MEDIUM severity tag & alerts' },
    { name: '--sev-low', hex: '#4DA3FF', use: 'LOW / INFO severity tag & alerts' },
  ];

  const GLYPHS = [
    { name: 'DashboardIcon', Icon: DashboardIcon },
    { name: 'AlertIcon', Icon: AlertIcon },
    { name: 'AlertDetailIcon', Icon: AlertDetailIcon },
    { name: 'MapIcon', Icon: MapIcon },
    { name: 'GraphIcon', Icon: GraphIcon },
    { name: 'QueryIcon', Icon: QueryIcon },
    { name: 'IngestIcon', Icon: IngestIcon },
    { name: 'ReplayIcon', Icon: ReplayIcon },
    { name: 'ModelIcon', Icon: ModelIcon },
    { name: 'RegistryIcon', Icon: RegistryIcon },
    { name: 'DriftIcon', Icon: DriftIcon },
    { name: 'AuditIcon', Icon: AuditIcon },
    { name: 'SettingsIcon', Icon: SettingsIcon },
    { name: 'ProfileIcon', Icon: ProfileIcon },
    { name: 'ResultsIcon', Icon: ResultsIcon },
    { name: 'IncidentIcon', Icon: IncidentIcon },
    { name: 'FeedbackIcon', Icon: FeedbackIcon },
    { name: 'KioskIcon', Icon: KioskIcon },
    { name: 'BellIcon', Icon: BellIcon },
    { name: 'EscalateIcon', Icon: EscalateIcon },
    { name: 'ResolveIcon', Icon: ResolveIcon },
    { name: 'FalsePositiveIcon', Icon: FalsePositiveIcon },
    { name: 'TruePositiveIcon', Icon: TruePositiveIcon },
    { name: 'DeployIcon', Icon: DeployIcon },
    { name: 'RollbackIcon', Icon: RollbackIcon },
    { name: 'OnlineIcon', Icon: OnlineIcon },
    { name: 'OfflineIcon', Icon: OfflineIcon },
    { name: 'ShieldOpenIcon', Icon: ShieldOpenIcon },
    { name: 'FilterIcon', Icon: FilterIcon },
    { name: 'SearchIcon', Icon: SearchIcon },
    { name: 'ExportIcon', Icon: ExportIcon },
    { name: 'DownloadIcon', Icon: DownloadIcon },
    { name: 'WarningIcon', Icon: WarningIcon },
    { name: 'CloseIcon', Icon: CloseIcon },
    { name: 'CheckIcon', Icon: CheckIcon },
    { name: 'ChevronIcon', Icon: ChevronIcon },
  ];

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
              SignSight Design System &amp; Brand
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            SPECIFICATION MANUAL
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
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Visual Identity
        </div>
        <h1 className="font-display" style={{ fontSize: '36px', color: 'var(--text)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
          Design System &amp; Brand Manual
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginBottom: '36px', lineHeight: 1.6 }}>
          A dense, typographical SOC instrument panel design system. Built with zero third-party component libraries and strict color token constraints.
        </p>

        {/* Section 1: Palette Tokens */}
        <section style={{ marginBottom: '48px' }}>
          <div className="label-caps" style={{ marginBottom: '16px' }}>
            1. Core Color Token Palette
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {PALETTE.map((token) => (
              <div
                key={token.name}
                className="panel"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    height: '40px',
                    backgroundColor: `var(${token.name})`,
                    border: '1px solid var(--line)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>
                    {token.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToken(token.hex, token.name)}
                    className="btn btn-secondary"
                    style={{ height: '20px', fontSize: '10px', padding: '0 6px' }}
                  >
                    {copiedToken === token.name ? 'Copied' : token.hex}
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {token.use}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Typography Specimen */}
        <section style={{ marginBottom: '48px' }}>
          <div className="label-caps" style={{ marginBottom: '16px' }}>
            2. Self-Hosted Typography Hierarchy
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '20px',
            }}
          >
            <div className="panel" style={{ padding: '20px' }}>
              <div className="label-caps">Display Font: Clash Display (600)</div>
              <div className="font-display" style={{ fontSize: '28px', color: 'var(--text)', marginTop: '8px' }}>
                SignSight SOC
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Used for page titles, headings, and key section anchors.
              </div>
            </div>

            <div className="panel" style={{ padding: '20px' }}>
              <div className="label-caps">Body Font: Satoshi (400, 500, 700)</div>
              <div style={{ fontSize: '14px', color: 'var(--text)', marginTop: '8px', lineHeight: 1.5 }}>
                Advisory telemetry and analyst triage guidance with maximum density.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Used for long-form reading, tables, and toolbars.
              </div>
            </div>

            <div className="panel" style={{ padding: '20px' }}>
              <div className="label-caps">Data Font: JetBrains Mono (Tabular)</div>
              <div className="font-mono" style={{ fontSize: '14px', color: 'var(--accent)', marginTop: '8px' }}>
                198.51.100.44 : 0.941
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Used for IPs, scores, ports, hashes, and timestamps.
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Custom Glyph Library */}
        <section style={{ marginBottom: '48px' }}>
          <div className="label-caps" style={{ marginBottom: '16px' }}>
            3. Custom Sharp 1.5px SVG Glyph Library ({GLYPHS.length} Glyphs)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px',
            }}
          >
            {GLYPHS.map(({ name, Icon }) => (
              <div
                key={name}
                className="panel"
                style={{
                  padding: '16px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: 'var(--accent)' }}>
                  <Icon size={24} />
                </div>
                <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                  {name}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Rules from ignore.md */}
        <section style={{ marginBottom: '48px' }}>
          <div className="label-caps" style={{ marginBottom: '16px' }}>
            4. Design Compliance (ignore.md Enforcement)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
            }}
          >
            <div className="panel" style={{ padding: '20px', borderLeft: '3px solid var(--accent)' }}>
              <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
                DO: Required Design Practices
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                <li>Use CSS variables on :root for all colors and fonts.</li>
                <li>Pair every severity color with an explicit text label.</li>
                <li>Support prefers-reduced-motion across every animated element.</li>
                <li>Label all mock transport and client-derived values with DEMO DATA tags.</li>
              </ul>
            </div>

            <div className="panel" style={{ padding: '20px', borderLeft: '3px solid var(--sev-critical)' }}>
              <div className="label-caps" style={{ color: 'var(--sev-critical)', marginBottom: '8px' }}>
                DON&apos;T: Prohibited AI Slop
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                <li>No purple-to-pink gradient buttons or glowing neon boxes.</li>
                <li>No stock illustrations of people at laptops or 3D blobs.</li>
                <li>No third-party component libraries or stock icon packs.</li>
                <li>No dead buttons or fabricated marketing statistics.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight Design System Specification &bull; Microsoft Innovate 2026
      </footer>
    </div>
  );
};
