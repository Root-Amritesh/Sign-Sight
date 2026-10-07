import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { env } from '../../config/env';
import { diagnostics, type ContractCheckResult } from '../../api/adapters/diagnostics';
import { useAuth } from '../../context/AuthContext';
import { Glyph } from '../../icons/glyphs';

export const ConnectionPage: React.FC = () => {
  const { role, isAuthenticated } = useAuth();
  const [healthData, setHealthData] = useState<{
    status: 'healthy' | 'degraded';
    checks: Record<string, { status: string; latency_ms?: number; error?: string; version?: string }>;
    timestamp?: string;
  } | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);

  const [contractResults, setContractResults] = useState<ContractCheckResult[]>(diagnostics.getContractResults());
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [copied, setCopied] = useState(false);

  const checkHealth = async () => {
    setIsHealthLoading(true);
    setHealthError(null);
    try {
      const res = await api.getHealth();
      setHealthData(res as typeof healthData);
    } catch (err: unknown) {
      const errorObj = err as { detail?: string; message?: string };
      setHealthError(errorObj.detail || errorObj.message || 'Unable to connect to /health/ endpoint.');
      setHealthData(null);
    } finally {
      setIsHealthLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const runContractCheck = async () => {
    setIsRunningCheck(true);
    const endpointsToTest: Array<{ path: string; role: 'public' | 'any' | 'analyst' | 'admin' }> = [
      { path: '/health/', role: 'public' },
    ];

    if (isAuthenticated) {
      endpointsToTest.push(
        { path: '/auth/me/', role: 'any' },
        { path: '/alerts/?page=1&page_size=5', role: 'analyst' },
        { path: '/alerts/stats/?period=24h', role: 'analyst' },
        { path: '/metrics/model/', role: 'any' },
        { path: '/metrics/drift/', role: 'any' }
      );

      if (role === 'admin') {
        endpointsToTest.push(
          { path: '/models/', role: 'admin' },
          { path: '/audit/?page=1&page_size=5', role: 'admin' },
          { path: '/config/alert-thresholds/', role: 'admin' }
        );
      }
    }

    const results: ContractCheckResult[] = [];
    for (const ep of endpointsToTest) {
      const res = await api.testEndpoint(ep.path, ep.role);
      results.push({
        endpoint: ep.path,
        method: 'GET',
        status: res.status,
        latencyMs: res.latencyMs,
        passed: res.passed,
        errorDetail: res.errorDetail,
      });
    }

    diagnostics.setContractResults(results);
    setContractResults(results);
    setIsRunningCheck(false);
  };

  const handleCopyReport = () => {
    const report = diagnostics.generateReport();
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const diffs = diagnostics.getDifferences();
  const mismatches = diagnostics.getMismatches();

  return (
    <div className="connection-page" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 600 }}>Backend Connection & Contract Hub</h1>
          <p style={{ color: 'var(--text-dim)', margin: '4px 0 0 0', fontSize: '13px' }}>
            Live status, endpoint verification, schema difference detection, and diagnostic reporting.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={checkHealth} disabled={isHealthLoading} className="btn-secondary" style={{ padding: '6px 14px' }}>
            <Glyph name="search" size={14} /> Refresh Health
          </button>
          <button onClick={handleCopyReport} className="btn-secondary" style={{ padding: '6px 14px' }}>
            <Glyph name="copy" size={14} /> {copied ? 'Report Copied' : 'Copy Diagnostics'}
          </button>
        </div>
      </div>

      {/* Grid Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Environment & Proxy Card */}
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
              Connection Config
            </span>
            <span className="badge-mono">VITE_API_BASE_URL</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Base URL: </span>
              <code style={{ color: 'var(--accent)' }}>{env.apiBaseUrl}</code>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Proxy Target: </span>
              <code>{env.devProxyTarget}</code>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Poll Interval: </span>
              <code>{env.pollIntervalMs}ms</code>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Auth State: </span>
              <span style={{ color: isAuthenticated ? 'var(--accent)' : 'var(--text-dim)' }}>
                {isAuthenticated ? `Signed in (${role})` : 'Unauthenticated'}
              </span>
            </div>
          </div>
        </div>

        {/* Backend Health Card */}
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
              GET /api/health/ Status
            </span>
            {healthData ? (
              <span style={{
                color: healthData.status === 'healthy' ? 'var(--accent)' : 'var(--sev-high)',
                fontWeight: 600,
                fontSize: '11px',
                textTransform: 'uppercase'
              }}>
                ● {healthData.status}
              </span>
            ) : (
              <span style={{ color: 'var(--sev-critical)', fontSize: '11px', textTransform: 'uppercase' }}>
                ● Unreachable
              </span>
            )}
          </div>

          {isHealthLoading ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Pinging /api/health/...</div>
          ) : healthData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              {Object.entries(healthData.checks || {}).map(([key, val]) => (
                <div key={key} style={{ background: 'var(--bg-2)', padding: '6px 8px', border: '1px solid var(--line)' }}>
                  <div style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '10px' }}>{key}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ color: val?.status === 'up' || val?.status === 'loaded' ? 'var(--accent)' : 'var(--sev-critical)' }}>
                      {val?.status || 'unknown'}
                    </span>
                    {val?.latency_ms !== undefined && <span style={{ color: 'var(--text-dim)' }}>{val.latency_ms}ms</span>}
                    {val?.version && <span style={{ color: 'var(--text-dim)' }}>{val.version}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--sev-critical)', fontSize: '13px' }}>
              {healthError || 'Backend is not responding. Ensure the backend server is running on http://localhost:8000.'}
            </div>
          )}
        </div>

        {/* Detected Schema Variants */}
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
              Detected API Variants
            </span>
            <span className="badge-mono">Auto-Adapting</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Login field:</span>
              <code>{diffs.loginField}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Threshold novelty field:</span>
              <code>{diffs.thresholdField}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Token rotation:</span>
              <code>{String(diffs.refreshHasRotatedToken)}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Verification Section */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>Automated Read-Only Contract Check</h2>
            <p style={{ color: 'var(--text-dim)', margin: '4px 0 0 0', fontSize: '12px' }}>
              Runs GET requests across all accessible endpoints for role <strong style={{ color: 'var(--text)' }}>{role}</strong> to verify contract compliance.
            </p>
          </div>
          <button
            onClick={runContractCheck}
            disabled={isRunningCheck}
            className="btn-primary"
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Glyph name="online" size={14} />
            {isRunningCheck ? 'Testing Endpoints...' : 'Run Contract Check'}
          </button>
        </div>

        {contractResults.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Method</th>
                  <th style={{ padding: '8px' }}>Endpoint</th>
                  <th style={{ padding: '8px' }}>HTTP Code</th>
                  <th style={{ padding: '8px' }}>Latency</th>
                  <th style={{ padding: '8px' }}>Notes / Error</th>
                </tr>
              </thead>
              <tbody>
                {contractResults.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-2)' }}>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: r.passed ? 'rgba(182, 255, 59, 0.12)' : 'rgba(255, 77, 61, 0.12)',
                        color: r.passed ? 'var(--accent)' : 'var(--sev-critical)',
                        border: `1px solid ${r.passed ? 'var(--accent)' : 'var(--sev-critical)'}`,
                      }}>
                        {r.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{r.method}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{r.endpoint}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{r.status}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{r.latencyMs}ms</td>
                    <td style={{ padding: '8px', color: r.errorDetail ? 'var(--sev-critical)' : 'var(--text-dim)', fontSize: '12px' }}>
                      {r.errorDetail || 'Contract verified'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-2)', border: '1px dashed var(--line)' }}>
            Click &quot;Run Contract Check&quot; to probe the backend contract endpoints.
          </div>
        )}
      </div>

      {/* Schema Mismatches Log */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', margin: '0 0 12px 0', fontWeight: 600 }}>Response Shape Variance Log</h2>
        {mismatches.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mismatches.map((m, idx) => (
              <div key={idx} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <code style={{ color: 'var(--accent)' }}>{m.endpoint}</code>
                  <span style={{ color: 'var(--text-dim)' }}>{m.timestamp}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--sev-medium)' }}>Field mismatch: {m.fieldPath}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
            No schema mismatches detected. All received payloads conform to Zod contract schemas.
          </div>
        )}
      </div>
    </div>
  );
};
