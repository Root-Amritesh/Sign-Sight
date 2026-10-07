import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { CopyIcon, CheckIcon, ChevronIcon } from '../../icons';

interface ApiEndpointItem {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  role: string;
  description: string;
  requestBody?: string;
  sampleResponse: Record<string, unknown>;
}

const API_ENDPOINTS: ApiEndpointItem[] = [
  {
    method: 'POST',
    path: '/auth/login/',
    role: 'public',
    description: 'Exchange username and password credentials for a short-lived JWT access token and refresh token cookie.',
    requestBody: '{\n  "username": "analyst",\n  "password": "analyst123"\n}',
    sampleResponse: {
      access: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: { username: 'analyst', role: 'analyst', email: 'analyst@signsight.internal' },
    },
  },
  {
    method: 'GET',
    path: '/auth/health/',
    role: 'public',
    description: 'Returns inference worker health state, model version, and last telemetry ingest timestamp.',
    sampleResponse: {
      status: 'healthy',
      model_version: 'if-lgbm-v2.4.1',
      last_ingest: '2026-09-28T14:32:10Z',
      active_workers: 4,
    },
  },
  {
    method: 'GET',
    path: '/alerts/',
    role: 'analyst+',
    description: 'Retrieve paginated alert queue with support for severity, status, attack family, and date range filters.',
    sampleResponse: {
      count: 420,
      next: 'http://localhost:8000/api/alerts/?page=2',
      results: [
        {
          id: 'alt-891024',
          timestamp: '2026-09-28T14:30:00Z',
          source_ip: '198.51.100.44',
          attack_family: 'dos',
          severity: 'critical',
          anomaly_score: 0.942,
          confidence: 0.98,
        },
      ],
    },
  },
  {
    method: 'POST',
    path: '/ingest/',
    role: 'analyst+',
    description: 'Submit raw NetFlow 5-tuple vector for real-time 2-stage inference and automated triage grading.',
    requestBody: '{\n  "src_ip": "198.51.100.44",\n  "dst_ip": "10.0.0.12",\n  "service": "http",\n  "count": 512,\n  "serror_rate": 0.98\n}',
    sampleResponse: {
      classified: true,
      anomaly_score: 0.942,
      attack_family: 'dos',
      confidence: 0.98,
      alert_id: 'alt-940182',
    },
  },
  {
    method: 'GET',
    path: '/metrics/model/',
    role: 'analyst+',
    description: 'Returns PR-AUC, P95 inference latency, noise floor thresholds, and per-class precision/recall matrices.',
    sampleResponse: {
      active_version: 'if-lgbm-v2.4.1',
      pr_auc: 0.941,
      latency_p95_ms: 1.42,
      noise_floor: 0.35,
    },
  },
  {
    method: 'POST',
    path: '/models/deploy/',
    role: 'admin',
    description: 'Hot-swap the active inference pipeline to a target registered version bundle.',
    requestBody: '{\n  "version": "if-lgbm-v2.4.1"\n}',
    sampleResponse: {
      success: true,
      version: 'if-lgbm-v2.4.1',
      deployed_at: '2026-09-28T14:32:00Z',
    },
  },
];

export const ApiExplorerPage: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [tryResults, setTryResults] = useState<Record<number, string>>({});
  const [isExecuting, setIsExecuting] = useState<number | null>(null);

  const { isAuthenticated } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

  const copyCurl = (item: ApiEndpointItem, idx: number) => {
    let curl = `curl -X ${item.method} "${apiBase}${item.path}"`;
    if (item.role !== 'public') {
      curl += ' \\\n  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>"';
    }
    if (item.requestBody) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${item.requestBody.replace(/\n/g, '')}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTryEndpoint = async (item: ApiEndpointItem, idx: number) => {
    setIsExecuting(idx);
    try {
      if (item.path.includes('/auth/health')) {
        const res = await api.getHealth();
        setTryResults((prev) => ({ ...prev, [idx]: JSON.stringify(res, null, 2) }));
      } else if (item.path.includes('/metrics/model')) {
        const res = await api.getModelMetrics();
        setTryResults((prev) => ({ ...prev, [idx]: JSON.stringify(res, null, 2) }));
      } else if (item.path.includes('/alerts/')) {
        const res = await api.getAlerts({ limit: 2 });
        setTryResults((prev) => ({ ...prev, [idx]: JSON.stringify(res, null, 2) }));
      } else {
        setTryResults((prev) => ({ ...prev, [idx]: JSON.stringify(item.sampleResponse, null, 2) }));
      }
    } catch (err: unknown) {
      setTryResults((prev) => ({ ...prev, [idx]: `Execution failed: ${(err as Error).message}` }));
    } finally {
      setIsExecuting(null);
    }
  };

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
              SignSight API Explorer
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            BASE: {apiBase}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/docs" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Documentation</Link>
          <Link to="/auth" className="btn btn-primary" style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}>
            Console Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          REST Interface
        </div>
        <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
          SignSight Backend API Map
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginBottom: '32px', lineHeight: 1.6 }}>
          Standardized Django Rest Framework endpoints with JWT authentication and role-based access control.
        </p>

        {/* Endpoints Table / Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {API_ENDPOINTS.map((item, idx) => {
            const isExpanded = expandedIndex === idx;
            const canTry = item.role === 'public' || isAuthenticated;

            return (
              <div
                key={item.path}
                style={{
                  backgroundColor: 'var(--bg-1)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Endpoint Header Bar */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span
                      className="font-mono"
                      style={{
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor:
                          item.method === 'GET'
                            ? 'rgba(77, 163, 255, 0.15)'
                            : item.method === 'POST'
                            ? 'rgba(182, 255, 59, 0.15)'
                            : 'rgba(255, 154, 31, 0.15)',
                        color:
                          item.method === 'GET'
                            ? 'var(--sev-low)'
                            : item.method === 'POST'
                            ? 'var(--accent)'
                            : 'var(--sev-high)',
                        border: '1px solid currentColor',
                      }}
                    >
                      {item.method}
                    </span>
                    <span className="font-mono" style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>
                      {item.path}
                    </span>
                    <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
                      [{item.role}]
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{item.description.slice(0, 60)}...</span>
                    <ChevronIcon size={16} direction={isExpanded ? 'up' : 'down'} />
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '18px',
                      borderTop: '1px solid var(--line)',
                      backgroundColor: 'var(--bg-2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
                      {item.description}
                    </div>

                    {/* Request / Response Split */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                      }}
                    >
                      {/* Left: cURL Snippet */}
                      <div style={{ position: 'relative' }}>
                        <div className="label-caps" style={{ marginBottom: '6px' }}>cURL Example</div>
                        <pre
                          className="font-mono"
                          style={{
                            backgroundColor: 'var(--bg-0)',
                            border: '1px solid var(--line)',
                            padding: '12px',
                            fontSize: '11px',
                            color: 'var(--text-dim)',
                            margin: 0,
                            overflowX: 'auto',
                            minHeight: '120px',
                          }}
                        >
                          <code>
                            {`curl -X ${item.method} "${apiBase}${item.path}"`}
                            {item.role !== 'public' ? ' \\\n  -H "Authorization: Bearer <JWT>"' : ''}
                            {item.requestBody ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${item.requestBody}'` : ''}
                          </code>
                        </pre>
                        <button
                          type="button"
                          onClick={() => copyCurl(item, idx)}
                          className="btn btn-secondary"
                          style={{ position: 'absolute', top: '24px', right: '8px', height: '22px', fontSize: '10px', padding: '0 6px' }}
                        >
                          {copiedIndex === idx ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                        </button>
                      </div>

                      {/* Right: Response Preview */}
                      <div>
                        <div className="label-caps" style={{ marginBottom: '6px' }}>
                          {tryResults[idx] ? 'Live API Execution Response' : 'Sample Response Schema'}
                        </div>
                        <pre
                          className="font-mono"
                          style={{
                            backgroundColor: 'var(--bg-0)',
                            border: '1px solid var(--line)',
                            padding: '12px',
                            fontSize: '11px',
                            color: tryResults[idx] ? 'var(--accent)' : 'var(--text-dim)',
                            margin: 0,
                            overflowX: 'auto',
                            minHeight: '120px',
                          }}
                        >
                          <code>{tryResults[idx] || JSON.stringify(item.sampleResponse, null, 2)}</code>
                        </pre>
                      </div>
                    </div>

                    {/* Try it action bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                        {!canTry ? 'Requires authenticated session to execute against live backend.' : 'Ready to execute live query.'}
                      </div>
                      <button
                        type="button"
                        disabled={!canTry || isExecuting === idx}
                        onClick={() => handleTryEndpoint(item, idx)}
                        className="btn btn-primary"
                        style={{ height: '28px', fontSize: '11px', padding: '0 12px' }}
                      >
                        {isExecuting === idx ? 'Executing...' : 'Execute Request (Try It)'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight REST API Specification &bull; Microsoft Innovate 2026
      </footer>
    </div>
  );
};
