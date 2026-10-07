import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const ServerErrorPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as { requestId?: string; message?: string } | undefined;

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
        500
      </div>
      <h1 className="font-display" style={{ fontSize: '20px', marginBottom: '8px' }}>
        Internal Server Error
      </h1>
      <p style={{ color: 'var(--text-dim)', maxWidth: '440px', marginBottom: '16px' }}>
        {state?.message || 'The server encountered an unhandled exception while processing the request.'}
      </p>
      {state?.requestId && (
        <div
          className="font-mono"
          style={{
            backgroundColor: 'var(--bg-2)',
            border: '1px solid var(--line)',
            padding: '6px 12px',
            fontSize: '11px',
            color: 'var(--text-dim)',
            marginBottom: '24px',
          }}
        >
          REQUEST ID: {state.requestId}
        </div>
      )}
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Retry Request
        </button>
        <Link to="/" className="btn btn-secondary">
          Return Home
        </Link>
      </div>
    </div>
  );
};
