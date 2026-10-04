import React from 'react';
import { Link } from 'react-router-dom';

export const SessionExpiredPage: React.FC = () => {
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
          fontSize: '48px',
          fontWeight: 700,
          color: 'var(--sev-medium)',
          letterSpacing: '-0.02em',
          marginBottom: '16px',
        }}
      >
        SESSION EXPIRED
      </div>
      <h1 className="font-display" style={{ fontSize: '18px', marginBottom: '8px' }}>
        Authentication Credentials Required
      </h1>
      <p style={{ color: 'var(--text-dim)', maxWidth: '440px', marginBottom: '24px' }}>
        Your authentication token has expired and silent rotation could not be completed.
      </p>
      <Link to="/auth" className="btn btn-primary">
        Sign In Again
      </Link>
    </div>
  );
};
