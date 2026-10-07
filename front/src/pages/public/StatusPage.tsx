import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export const StatusPage: React.FC = () => {
  const [health, setHealth] = useState<{
    status: 'healthy' | 'degraded';
    checks: {
      database?: { status: string; latency_ms?: number; error?: string };
      redis?: { status: string; latency_ms?: number; error?: string };
      celery?: { status: string; active_workers?: number; error?: string };
      model?: { status: string; version?: string; loaded_at?: string; error?: string };
    };
    timestamp?: string;
  } | null>(null);
  const [sampledLatency, setSampledLatency] = useState<number | null>(null);
  const [swRegistered, setSwRegistered] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        if (mounted) setSwRegistered(regs.length > 0);
      });
    }

    const sampleHealth = async () => {
      const start = performance.now();
      try {
        const res = await api.getHealth();
        const duration = performance.now() - start;
        if (mounted) {
          setHealth(res);
          setSampledLatency(Math.round(duration));
          setIsConnected(true);
        }
      } catch {
        if (mounted) {
          setIsConnected(false);
          setSampledLatency(null);
        }
      }
    };

    sampleHealth();
    const interval = setInterval(sampleHealth, 8000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
              SignSight System Status
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            LIVE HEALTH MONITOR
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/app/connection" style={{ color: 'var(--accent)', fontSize: '12px' }}>Connection Hub</Link>
          <Link to="/auth" className="btn btn-primary" style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}>
            Console Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Operational Telemetry
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
          <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
            Infrastructure &amp; Pipeline Status
          </h1>
          <span className="sev-tag" style={{ borderColor: isConnected ? 'var(--accent)' : 'var(--line-strong)', color: isConnected ? 'var(--accent)' : 'var(--text-dim)' }}>
            {isConnected ? 'BACKEND CONNECTED' : 'UNREACHABLE'}
          </span>
        </div>

        {/* Status Metric Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {/* Backend Ingestion Health */}
          <div className="panel" style={{ padding: '20px' }}>
            <div className="label-caps">Inference Backend</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <span className={`status-dot ${!isConnected ? 'status-dot-offline' : health?.status === 'healthy' ? 'status-dot-live' : 'status-dot-warning'}`} />
              <span className="font-mono" style={{ fontSize: '16px', color: 'var(--text)', fontWeight: 600 }}>
                {!isConnected ? 'OFFLINE' : health?.status === 'healthy' ? 'HEALTHY' : 'DEGRADED'}
              </span>
            </div>
          </div>

          {/* Client-Sampled Round-Trip Latency */}
          <div className="panel" style={{ padding: '20px' }}>
            <div className="label-caps">GET /api/health/ Latency</div>
            <div className="font-mono" style={{ fontSize: '20px', color: 'var(--accent)', marginTop: '6px' }}>
              {sampledLatency !== null ? `${sampledLatency} ms` : '—'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Measured via browser fetch benchmark
            </div>
          </div>

          {/* Active Model */}
          <div className="panel" style={{ padding: '20px' }}>
            <div className="label-caps">Active Model Version</div>
            <div className="font-mono" style={{ fontSize: '16px', color: 'var(--text)', marginTop: '8px' }}>
              {health?.checks?.model?.version || '—'}
            </div>
          </div>

          {/* Connectivity / Service Worker */}
          <div className="panel" style={{ padding: '20px' }}>
            <div className="label-caps">Browser Shell State</div>
            <div className="font-mono" style={{ fontSize: '14px', color: 'var(--text)', marginTop: '8px' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'} &bull; {swRegistered ? 'SW CACHED' : 'STANDALONE'}
            </div>
          </div>
        </div>

        {/* Backend Checks Breakdown */}
        <div className="panel" style={{ padding: '24px' }}>
          <div className="label-caps" style={{ marginBottom: '12px' }}>
            Subsystem Health Checks (GET /api/health/)
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Status</th>
                  <th>Latency / Detail</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Database (PostgreSQL)</td>
                  <td>
                    <span className="font-mono" style={{ color: health?.checks?.database?.status === 'healthy' ? 'var(--accent)' : 'var(--sev-high)' }}>
                      {health?.checks?.database?.status?.toUpperCase() || '—'}
                    </span>
                  </td>
                  <td className="font-mono">{health?.checks?.database?.latency_ms !== undefined ? `${health.checks.database.latency_ms}ms` : '—'}</td>
                  <td className="font-mono" style={{ color: 'var(--sev-critical)' }}>{health?.checks?.database?.error || '—'}</td>
                </tr>
                <tr>
                  <td>Cache &amp; Broker (Redis)</td>
                  <td>
                    <span className="font-mono" style={{ color: health?.checks?.redis?.status === 'healthy' ? 'var(--accent)' : 'var(--sev-high)' }}>
                      {health?.checks?.redis?.status?.toUpperCase() || '—'}
                    </span>
                  </td>
                  <td className="font-mono">{health?.checks?.redis?.latency_ms !== undefined ? `${health.checks.redis.latency_ms}ms` : '—'}</td>
                  <td className="font-mono" style={{ color: 'var(--sev-critical)' }}>{health?.checks?.redis?.error || '—'}</td>
                </tr>
                <tr>
                  <td>Async Task Worker (Celery)</td>
                  <td>
                    <span className="font-mono" style={{ color: health?.checks?.celery?.status === 'healthy' ? 'var(--accent)' : 'var(--sev-high)' }}>
                      {health?.checks?.celery?.status?.toUpperCase() || '—'}
                    </span>
                  </td>
                  <td className="font-mono">Workers: {health?.checks?.celery?.active_workers ?? '—'}</td>
                  <td className="font-mono" style={{ color: 'var(--sev-critical)' }}>{health?.checks?.celery?.error || '—'}</td>
                </tr>
                <tr>
                  <td>Inference Model (IF + LightGBM)</td>
                  <td>
                    <span className="font-mono" style={{ color: health?.checks?.model?.status === 'healthy' ? 'var(--accent)' : 'var(--sev-high)' }}>
                      {health?.checks?.model?.status?.toUpperCase() || '—'}
                    </span>
                  </td>
                  <td className="font-mono">Loaded: {health?.checks?.model?.loaded_at ? new Date(health.checks.model.loaded_at).toLocaleTimeString() : '—'}</td>
                  <td className="font-mono" style={{ color: 'var(--sev-critical)' }}>{health?.checks?.model?.error || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight Operational Telemetry &bull; Microsoft Innovate 2026
      </footer>
    </div>
  );
};
