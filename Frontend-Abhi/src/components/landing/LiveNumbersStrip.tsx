import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export const LiveNumbersStrip: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('CHECKING');
  const [modelVersion, setModelVersion] = useState<string>('—');
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const loadHealth = async () => {
      try {
        const h = await api.getHealth();
        if (mounted) {
          setHealthStatus(h.status === 'healthy' ? 'HEALTHY' : 'DEGRADED');
          setModelVersion(h.checks?.model?.version || 'Active');
          setIsLive(true);
        }
      } catch {
        if (mounted) {
          setHealthStatus('OFFLINE');
          setIsLive(false);
        }
      }
    };

    loadHealth();
    const interval = setInterval(loadHealth, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-1)',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        padding: '12px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        fontSize: '12px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px' }}>
        {/* Status Dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className={`status-dot ${isLive ? (healthStatus === 'HEALTHY' ? 'status-dot-live' : 'status-dot-warning') : 'status-dot-offline'}`}
          />
          <span className="label-caps" style={{ color: 'var(--text)' }}>
            BACKEND PIPELINE:
          </span>
          <span className="font-mono" style={{ color: healthStatus === 'HEALTHY' ? 'var(--accent)' : 'var(--sev-high)', fontWeight: 600 }}>
            {healthStatus}
          </span>
        </div>

        {/* Model Loaded */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="label-caps">MODEL VERSION:</span>
          <span className="font-mono" style={{ color: 'var(--text)', fontWeight: 600 }}>
            {modelVersion}
          </span>
        </div>

        {/* Contract Source */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="label-caps">STATUS ENDPOINT:</span>
          <span className="font-mono" style={{ color: 'var(--text-dim)' }}>
            GET /api/health/
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
          SOC INTRUSION DETECTION PLATFORM
        </span>
        <span
          className="sev-tag"
          style={{
            borderColor: isLive ? 'var(--accent)' : 'var(--line-strong)',
            color: isLive ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          {isLive ? 'BACKEND CONNECTED' : 'UNREACHABLE'}
        </span>
      </div>
    </div>
  );
};
