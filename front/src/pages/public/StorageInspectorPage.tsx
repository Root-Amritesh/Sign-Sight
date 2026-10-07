import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface StorageKeyItem {
  key: string;
  scope: 'localStorage' | 'sessionStorage' | 'Memory';
  purpose: string;
  currentValue: string;
}

export const StorageInspectorPage: React.FC = () => {
  const [items, setItems] = useState<StorageKeyItem[]>([]);
  const [clearedMessage, setClearedMessage] = useState<string | null>(null);

  const refreshStorageInventory = () => {
    const list: StorageKeyItem[] = [
      {
        key: 'signsight_demo_mode',
        scope: 'localStorage',
        purpose: 'Stores boolean flag indicating if mock offline transport is active.',
        currentValue: localStorage.getItem('signsight_demo_mode') || 'NOT SET',
      },
      {
        key: 'signsight_tour_completed',
        scope: 'localStorage',
        purpose: 'Stores first-run analyst tour dismissal flag.',
        currentValue: localStorage.getItem('signsight_tour_completed') || 'NOT SET',
      },
      {
        key: 'signsight_saved_queries',
        scope: 'localStorage',
        purpose: 'In-browser saved structured filter sets from Query Workspace.',
        currentValue: localStorage.getItem('signsight_saved_queries') ? 'SAVED FILTER SETS PRESENT' : 'EMPTY',
      },
      {
        key: 'signsight_game_highscore',
        scope: 'localStorage',
        purpose: 'Highest score attained in offline Spacecraft Defense game.',
        currentValue: localStorage.getItem('signsight_game_highscore') || '0',
      },
      {
        key: 'signsight_pinned_alerts',
        scope: 'localStorage',
        purpose: 'Pinned alert IDs saved by analyst.',
        currentValue: localStorage.getItem('signsight_pinned_alerts') || 'EMPTY',
      },
      {
        key: 'JWT Access Token',
        scope: 'Memory',
        purpose: 'Short-lived bearer token maintained exclusively in JavaScript runtime heap.',
        currentValue: 'EPHEMERAL (VOLATILE)',
      },
    ];
    setItems(list);
  };

  useEffect(() => {
    refreshStorageInventory();
  }, []);

  const handleClearAllStorage = () => {
    if (window.confirm('Are you sure you want to clear all SignSight local browser state? This will reset demo mode, saved queries, and high scores.')) {
      try {
        localStorage.removeItem('signsight_demo_mode');
        localStorage.removeItem('signsight_tour_completed');
        localStorage.removeItem('signsight_saved_queries');
        localStorage.removeItem('signsight_game_highscore');
        localStorage.removeItem('signsight_pinned_alerts');
        sessionStorage.clear();
        setClearedMessage('All SignSight browser keys purged successfully.');
        refreshStorageInventory();
        setTimeout(() => setClearedMessage(null), 3000);
      } catch (err: unknown) {
        setClearedMessage(`Error clearing storage: ${(err as Error).message}`);
      }
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
              SignSight Storage Inspector
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            BROWSER DATA INVENTORY
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/privacy" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Privacy Policy</Link>
          <Link to="/auth" className="btn btn-primary" style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}>
            Console Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '840px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Client-Side Storage
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
          <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Browser Storage &amp; Cache State
          </h1>
          <button
            type="button"
            onClick={handleClearAllStorage}
            className="btn btn-secondary"
            style={{ height: '32px', borderColor: 'var(--sev-critical)', color: 'var(--sev-critical)', fontSize: '12px' }}
          >
            Clear All Local Data
          </button>
        </div>

        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginBottom: '24px', lineHeight: 1.6 }}>
          SignSight does not use marketing trackers or analytics pixels. The list below discloses every storage key accessed in your browser.
        </p>

        {clearedMessage && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              fontSize: '12px',
              marginBottom: '16px',
            }}
          >
            {clearedMessage}
          </div>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Key Name</th>
                <th>Storage Scope</th>
                <th>Purpose</th>
                <th>Current State</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.key}>
                  <td className="font-mono" style={{ color: 'var(--text)' }}>
                    {it.key}
                  </td>
                  <td>
                    <span className="font-mono label-caps" style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                      {it.scope}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                    {it.purpose}
                  </td>
                  <td className="font-mono" style={{ fontSize: '11px', color: 'var(--accent)' }}>
                    {it.currentValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight Local Storage Disclosure &bull; Microsoft Innovate 2026
      </footer>
    </div>
  );
};
