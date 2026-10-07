import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const location = useLocation();

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
          color: 'var(--sev-critical)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: '16px',
        }}
      >
        404
      </div>
      <h1 className="font-display" style={{ fontSize: '20px', marginBottom: '8px' }}>
        Route Not Found
      </h1>
      <p style={{ color: 'var(--text-dim)', maxWidth: '480px', marginBottom: '16px' }}>
        The requested URL path was not found on this server.
      </p>
      <div
        className="font-mono"
        style={{
          padding: '6px 12px',
          backgroundColor: 'var(--bg-2)',
          border: '1px solid var(--line)',
          fontSize: '12px',
          color: 'var(--accent)',
          marginBottom: '24px',
        }}
      >
        {location.pathname}
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link to="/" className="btn btn-primary">
          Return to Overview
        </Link>
        <Link to="/offline" className="btn btn-secondary">
          Try Offline Game
        </Link>
      </div>
    </div>
  );
};
