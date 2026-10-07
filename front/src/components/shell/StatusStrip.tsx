import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { t } from '../../i18n';
import { Glyph } from '../../icons/glyphs';

export const StatusStrip: React.FC = () => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<{
    status: 'healthy' | 'degraded';
    checks: Record<string, { status: string; version?: string }>;
  } | null>(null);
  const [isReachable, setIsReachable] = useState<boolean>(true);

  const fetchHealth = async () => {
    try {
      const res = await api.getHealth();
      setHealth(res as typeof health);
      setIsReachable(true);
    } catch {
      setIsReachable(false);
      setHealth(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchHealth();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if (mounted) fetchHealth();
      }
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const modelCheck = health?.checks?.model;
  const isModelLoaded = modelCheck?.status === 'loaded' || Boolean(modelCheck?.version);
  const modelVersion = modelCheck?.version || (isModelLoaded ? 'Active' : 'No Model Loaded');

  return (
    <header
      style={{
        height: 'var(--header-height, 40px)',
        backgroundColor: 'var(--bg-1)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left items: Health dot, Model Version, Connection link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link
          to="/app/connection"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'inherit' }}
          title="Open Backend Connection & Contract Hub"
        >
          <span
            className={`status-dot ${
              !isReachable ? 'status-dot-offline' : health?.status === 'healthy' ? 'status-dot-live' : 'status-dot-degraded'
            }`}
          />
          <span className="label-caps" style={{ color: !isReachable ? 'var(--sev-critical)' : 'var(--text)' }}>
            {!isReachable ? 'BACKEND OFFLINE' : health?.status === 'healthy' ? 'BACKEND ONLINE' : 'DEGRADED (503)'}
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="label-caps">{t('status.model', 'Model')}:</span>
          <span
            className="font-mono"
            style={{
              color: isModelLoaded ? 'var(--text)' : 'var(--sev-high)',
              fontSize: '11px',
            }}
          >
            {modelVersion}
          </span>
        </div>

        <Link
          to="/app/connection"
          className="btn btn-secondary"
          style={{ height: '22px', fontSize: '11px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Glyph name="search" size={12} />
          <span>Connection Hub</span>
        </Link>
      </div>

      {/* Right items: Role tag, Username & Sign Out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="sev-tag"
              style={{
                borderColor: user.role === 'admin' ? 'var(--accent)' : 'var(--line-strong)',
                color: user.role === 'admin' ? 'var(--accent)' : 'var(--text-dim)',
                backgroundColor: 'transparent',
              }}
            >
              {user.role}
            </span>
            <span className="font-mono" style={{ color: 'var(--text)' }}>
              {user.username}
            </span>
            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary"
              style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            className="btn btn-primary"
            style={{ height: '24px', fontSize: '11px', padding: '0 10px', textDecoration: 'none' }}
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
