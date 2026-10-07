import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sigil } from '../../icons';
import { t } from '../../i18n';

export const ProfilePage: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
          {t('profile.title', 'Analyst Session & Account Profile')}
        </h1>
        <span className="font-mono label-caps" style={{ color: 'var(--text-dim)' }}>
          ROLE: {user?.role.toUpperCase() || 'ANALYST'}
        </span>
      </div>

      <div
        className="panel"
        style={{
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '160px 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left: User Sigil */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Sigil id={user?.username || user?.email || 'analyst'} size={96} showHash />
          <div className="label-caps" style={{ marginTop: '8px' }}>User Credential Sigil</div>
        </div>

        {/* Right: User Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div className="label-caps" style={{ marginBottom: '4px' }}>Username / ID</div>
            <div className="font-mono" style={{ fontSize: '15px', color: 'var(--text)' }}>
              {user?.username || '—'}
            </div>
          </div>

          <div>
            <div className="label-caps" style={{ marginBottom: '4px' }}>Email Address</div>
            <div className="font-mono" style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              {user?.email || '—'}
            </div>
          </div>

          <div>
            <div className="label-caps" style={{ marginBottom: '4px' }}>Role Clearance</div>
            <span
              className="sev-tag"
              style={{
                borderColor: user?.role === 'admin' ? 'var(--accent)' : 'var(--line-strong)',
                color: user?.role === 'admin' ? 'var(--accent)' : 'var(--text)',
                backgroundColor: 'transparent',
              }}
            >
              {user?.role.toUpperCase() || 'ANALYST'}
            </span>
          </div>

          <div>
            <div className="label-caps" style={{ marginBottom: '4px' }}>Authentication State</div>
            <div className="font-mono" style={{ fontSize: '12px', color: isAuthenticated ? 'var(--accent)' : 'var(--text-dim)' }}>
              {isAuthenticated ? 'Active JWT In-Memory Session (Single Flight Refresh)' : 'Unauthenticated'}
            </div>
          </div>
        </div>
      </div>

      {/* Security Audit Notice */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="label-caps" style={{ marginBottom: '10px' }}>
          Active Session &amp; Security Policy
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
          Per security policy F1, your JWT access token is held exclusively in non-persistent browser memory. Refresh token is stored in sessionStorage. On token expiry or 401 response, a single-flight mutex refreshes the session transparently.
        </p>

        <button type="button" onClick={logout} className="btn btn-secondary">
          Sign Out of Active Session
        </button>
      </div>
    </div>
  );
};
