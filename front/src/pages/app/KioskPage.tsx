import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { ThreatGlobe3D } from './ThreatGlobe3D';
import { Sigil } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import type { GeoNode } from './MapFlat';
import { CloseIcon, PauseIcon, PlayIcon } from '../../icons';

export const KioskPage: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState<number>(0); // 0: Globe, 1: Live Feed, 2: Severity Counts, 3: Drift Line
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCursorHidden, setIsCursorHidden] = useState<boolean>(false);

  const navigate = useNavigate();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: alertsRes } = useQuery({
    queryKey: ['kioskAlerts'],
    queryFn: () => api.getAlerts({ page_size: 40 }),
    refetchInterval: 8000,
  });

  const { data: stats } = useQuery({
    queryKey: ['kioskStats'],
    queryFn: () => api.getStats(),
    refetchInterval: 10000,
  });

  const { data: drift } = useQuery({
    queryKey: ['kioskDrift'],
    queryFn: () => api.getDriftMetrics(),
    refetchInterval: 15000,
  });

  const alerts = alertsRes?.results || [];

  const geoNodes: GeoNode[] = useMemo(() => {
    return [];
  }, []);

  // Auto-cycle every 20 seconds unless paused
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 4);
    }, 20000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Hide cursor after 5s idle and handle Esc exit
  useEffect(() => {
    const resetIdleTimer = () => {
      setIsCursorHidden(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsCursorHidden(true);
      }, 5000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/app/dashboard');
      } else if (e.key === ' ') {
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [navigate]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-0)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        cursor: isCursorHidden ? 'none' : 'default',
      }}
    >
      {/* Top HUD */}
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'var(--bg-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
          <h1 className="font-display" style={{ fontSize: '20px', color: 'var(--text)', margin: 0 }}>
            SignSight SOC Kiosk Display
          </h1>
          <span className="font-mono label-caps" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
            SLIDE {activeSlide + 1} / 4
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}
          >
            {isPaused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
            <span>{isPaused ? 'Resume Cycling' : 'Pause'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/dashboard')}
            className="btn btn-secondary"
            style={{ height: '32px', width: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Exit Kiosk Mode (Esc)"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      {/* Main Slide Viewport */}
      <main style={{ flex: 1, padding: '24px', overflow: 'hidden', position: 'relative' }}>
        {/* Slide 0: Threat Globe */}
        {activeSlide === 0 && (
          <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
              <div className="label-caps" style={{ color: 'var(--accent)' }}>GEOSPATIAL TOPOLOGY</div>
              <h2 className="font-display" style={{ fontSize: '28px', color: 'var(--text)', margin: '4px 0 0 0' }}>
                Global Threat Topology (Zero Fabricated Coordinates)
              </h2>
            </div>
            <ThreatGlobe3D
              geoNodes={geoNodes}
              filteredAlerts={alerts as any}
              selectedNode={null}
              onSelectNode={() => {}}
              selectedCountry={null}
              onSelectCountry={() => {}}
              isRotating={true}
              onToggleRotating={() => {}}
            />
          </div>
        )}

        {/* Slide 1: Live Alert Feed Table */}
        {activeSlide === 1 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div className="label-caps" style={{ color: 'var(--accent)' }}>HIGH-THROUGHPUT INGEST</div>
              <h2 className="font-display" style={{ fontSize: '28px', color: 'var(--text)', margin: '4px 0 0 0' }}>
                Real-Time Triage Stream
              </h2>
            </div>
            <div className="panel" style={{ flex: 1, padding: 0, overflowY: 'auto' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Alert ID / Sigil</th>
                    <th>Attack Family</th>
                    <th>Stage 1 Anomaly</th>
                    <th>Stage 2 Confidence</th>
                    <th>Ingest Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 15).map((a) => (
                    <tr key={a.id}>
                      <td><SeverityTag severity={a.severity} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sigil id={a.id} size={18} severity={a.severity} />
                          <span className="font-mono">{a.id}</span>
                        </div>
                      </td>
                      <td className="font-mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{a.predictedLabel.toUpperCase()}</td>
                      <td className="font-mono" style={{ color: 'var(--accent)' }}>{a.anomalyScore !== undefined ? a.anomalyScore.toFixed(3) : '—'}</td>
                      <td className="font-mono">{(a.confidence * 100).toFixed(0)}%</td>
                      <td className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{new Date(a.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Slide 2: Severity Distribution */}
        {activeSlide === 2 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '960px', margin: '0 auto', gap: '32px' }}>
            <div>
              <div className="label-caps" style={{ color: 'var(--accent)' }}>TELEMETRY STATS</div>
              <h2 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', margin: '4px 0 0 0' }}>
                Severity Distribution Breakdown
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div className="panel" style={{ padding: '24px', borderLeft: '4px solid var(--sev-critical)' }}>
                <div className="label-caps">Critical Threats</div>
                <div className="font-mono" style={{ fontSize: '36px', color: 'var(--sev-critical)', marginTop: '8px', fontWeight: 700 }}>
                  {stats?.bySeverity.critical ?? 0}
                </div>
              </div>
              <div className="panel" style={{ padding: '24px', borderLeft: '4px solid var(--sev-high)' }}>
                <div className="label-caps">High Severity</div>
                <div className="font-mono" style={{ fontSize: '36px', color: 'var(--sev-high)', marginTop: '8px', fontWeight: 700 }}>
                  {stats?.bySeverity.high ?? 0}
                </div>
              </div>
              <div className="panel" style={{ padding: '24px', borderLeft: '4px solid var(--sev-medium)' }}>
                <div className="label-caps">Medium Severity</div>
                <div className="font-mono" style={{ fontSize: '36px', color: 'var(--sev-medium)', marginTop: '8px', fontWeight: 700 }}>
                  {stats?.bySeverity.medium ?? 0}
                </div>
              </div>
              <div className="panel" style={{ padding: '24px', borderLeft: '4px solid var(--sev-low)' }}>
                <div className="label-caps">Low / Info</div>
                <div className="font-mono" style={{ fontSize: '36px', color: 'var(--sev-low)', marginTop: '8px', fontWeight: 700 }}>
                  {(stats?.bySeverity.low ?? 0) + (stats?.bySeverity.info ?? 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slide 3: Drift Telemetry */}
        {activeSlide === 3 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '840px', margin: '0 auto', gap: '24px' }}>
            <div>
              <div className="label-caps" style={{ color: 'var(--accent)' }}>STATISTICAL DIVERGENCE</div>
              <h2 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', margin: '4px 0 0 0' }}>
                Feature Concept Drift Monitor
              </h2>
            </div>
            <div className="panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="label-caps">Current Population Stability Index (PSI)</span>
                <span className="font-mono" style={{ fontSize: '20px', color: 'var(--accent)', fontWeight: 700 }}>
                  {drift?.latestSnapshot?.anomalyScoreDrift?.psiScore !== undefined
                    ? drift.latestSnapshot.anomalyScoreDrift.psiScore.toFixed(3)
                    : drift?.latestSnapshot?.labelDrift?.driftScore !== undefined
                    ? drift.latestSnapshot.labelDrift.driftScore.toFixed(3)
                    : '0.000'}
                </span>
              </div>
              <div style={{ height: '12px', backgroundColor: 'var(--bg-0)', border: '1px solid var(--line)', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: `${(drift?.latestSnapshot?.labelDrift?.warningThreshold ?? 0.1) * 250}%`,
                    top: '-4px',
                    bottom: '-4px',
                    width: '2px',
                    backgroundColor: 'var(--sev-high)',
                  }}
                  title={`Warning Threshold (${drift?.latestSnapshot?.labelDrift?.warningThreshold ?? 0.1})`}
                />
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(
                      100,
                      ((drift?.latestSnapshot?.anomalyScoreDrift?.psiScore ??
                        drift?.latestSnapshot?.labelDrift?.driftScore ??
                        0) /
                        0.4) *
                        100
                    )}%`,
                    backgroundColor: 'var(--accent)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                <span>0.00 (Nominal Fit)</span>
                <span style={{ color: 'var(--sev-high)' }}>
                  Warning Threshold ({drift?.latestSnapshot?.labelDrift?.warningThreshold ?? 0.1})
                </span>
                <span>Critical Threshold ({drift?.latestSnapshot?.labelDrift?.criticalThreshold ?? 0.25})</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
