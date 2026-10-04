import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ForbiddenPage: React.FC = () => {
  const location = useLocation();
  const { role } = useAuth();
  const state = location.state as { requiredRole?: string } | undefined;
  const requiredRole = state?.requiredRole || 'admin';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        backgroundColor: 'var(--bg-0)',
        color: 'var(--text)',
        textAlign: 'center',
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: '72px',
          fontWeight: 700,
          color: 'var(--sev-high)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: '16px',
        }}
      >
        403
      </div>
      <h1 className="font-display" style={{ fontSize: '20px', marginBottom: '8px' }}>
        Access Restricted
      </h1>
      <p style={{ color: 'var(--text-dim)', maxWidth: '440px', marginBottom: '16px' }}>
        This module requires elevated privileges.
      </p>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: 'var(--bg-2)',
          border: '1px solid var(--line)',
          padding: '8px 16px',
          fontSize: '12px',
          marginBottom: '24px',
        }}
      >
        <span className="label-caps">YOUR ROLE:</span>
        <span className="font-mono" style={{ color: 'var(--text)' }}>
          {role}
        </span>
        <span style={{ color: 'var(--line-strong)' }}>|</span>
        <span className="label-caps">REQUIRED:</span>
        <span className="font-mono" style={{ color: 'var(--accent)' }}>
          {requiredRole}
        </span>
      </div>
      <Link to="/app/dashboard" className="btn btn-primary">
        Return to Dashboard
      </Link>
    </div>
  );
};
