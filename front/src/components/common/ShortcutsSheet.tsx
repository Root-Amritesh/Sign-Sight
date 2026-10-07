import React from 'react';
import { CloseIcon } from '../../icons';

interface ShortcutsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsSheet: React.FC<ShortcutsSheetProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const SHORTCUTS = [
    { key: 'J / K', action: 'Move selection down / up in alert or incident queues' },
    { key: 'Enter', action: 'Open detail view of currently selected item' },
    { key: 'E', action: 'Escalate alert to Tier 2 SOC / Microsoft Teams' },
    { key: 'R', action: 'Mark alert status as RESOLVED' },
    { key: 'T', action: 'Commit verdict: TRUE POSITIVE (Valid Intrusion)' },
    { key: 'F', action: 'Commit verdict: FALSE POSITIVE (Benign Flow)' },
    { key: '/', action: 'Focus search or raw query input' },
    { key: 'Ctrl/Cmd + K', action: 'Open global SOC command palette' },
    { key: '?', action: 'Open / close this keyboard shortcuts reference' },
    { key: 'Esc', action: 'Close modals, drawers, or exit guided demo' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--bg-1)',
          border: '1px solid var(--line-strong)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="label-caps" style={{ color: 'var(--accent)' }}>SOC Power Keys</span>
            <h2 className="font-display" style={{ fontSize: '20px', color: 'var(--text)', marginTop: '2px' }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line)',
                fontSize: '12px',
              }}
            >
              <span style={{ color: 'var(--text-dim)' }}>{s.action}</span>
              <kbd
                className="font-mono"
                style={{
                  padding: '2px 8px',
                  backgroundColor: 'var(--bg-0)',
                  border: '1px solid var(--line-strong)',
                  color: 'var(--accent)',
                  fontWeight: 600,
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-faint)', textAlign: 'center' }}>
          Shortcuts are automatically paused while typing inside inputs and textareas.
        </div>
      </div>
    </div>
  );
};
