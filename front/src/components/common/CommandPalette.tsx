import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SearchIcon, CloseIcon } from '../../icons';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Action' | 'System';
  title: string;
  subtitle?: string;
  adminOnly?: boolean;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global key listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const COMMANDS: CommandItem[] = [
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: '/app/dashboard',
      action: () => navigate('/app/dashboard'),
    },
    {
      id: 'nav-alerts',
      category: 'Navigation',
      title: 'Go to Alerts Queue',
      subtitle: '/app/alerts',
      action: () => navigate('/app/alerts'),
    },
    {
      id: 'nav-incidents',
      category: 'Navigation',
      title: 'Go to Incidents Timeline',
      subtitle: '/app/incidents',
      action: () => navigate('/app/incidents'),
    },
    {
      id: 'nav-map',
      category: 'Navigation',
      title: 'Go to Threat Map (3D Globe)',
      subtitle: '/app/map',
      action: () => navigate('/app/map'),
    },
    {
      id: 'nav-query',
      category: 'Navigation',
      title: 'Go to Query Workspace',
      subtitle: '/app/query',
      action: () => navigate('/app/query'),
    },
    {
      id: 'nav-results',
      category: 'Navigation',
      title: 'Go to Results Benchmark',
      subtitle: '/app/results',
      action: () => navigate('/app/results'),
    },
    {
      id: 'nav-registry',
      category: 'Navigation',
      title: 'Go to Model Registry',
      subtitle: '/app/registry',
      adminOnly: true,
      action: () => navigate('/app/registry'),
    },
    {
      id: 'nav-drift',
      category: 'Navigation',
      title: 'Go to Drift Monitor',
      subtitle: '/app/drift',
      action: () => navigate('/app/drift'),
    },
    {
      id: 'nav-feedback',
      category: 'Navigation',
      title: 'Go to Feedback Loop',
      subtitle: '/app/feedback',
      action: () => navigate('/app/feedback'),
    },
    {
      id: 'nav-audit',
      category: 'Navigation',
      title: 'Go to Audit Trail',
      subtitle: '/app/audit',
      adminOnly: true,
      action: () => navigate('/app/audit'),
    },
    {
      id: 'nav-kiosk',
      category: 'Navigation',
      title: 'Open Fullscreen Kiosk Mode',
      subtitle: '/app/kiosk',
      action: () => navigate('/app/kiosk'),
    },
    {
      id: 'act-diagnostics',
      category: 'System',
      title: 'Backend Diagnostics & Health',
      subtitle: '/app/connection',
      action: () => navigate('/app/connection'),
    },
    {
      id: 'act-logout',
      category: 'Action',
      title: 'Sign Out of Session',
      subtitle: `Signed in as ${user?.username || 'analyst'}`,
      action: () => logout(),
    },
  ];

  const visibleCommands = COMMANDS.filter((cmd) => {
    if (cmd.adminOnly && role !== 'admin') return false;
    if (!query) return true;
    return (
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(query.toLowerCase()))
    );
  });

  const handleSelect = (idx: number) => {
    const target = visibleCommands[idx];
    if (target) {
      target.action();
      setIsOpen(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, visibleCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + visibleCommands.length) % Math.max(1, visibleCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-1)',
          border: '1px solid var(--line-strong)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <SearchIcon size={18} />
          <input
            ref={inputRef}
            type="text"
            className="input font-mono"
            style={{
              flex: 1,
              height: '32px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none',
            }}
            placeholder="Type a command, page name or action (Ctrl+K)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn btn-secondary"
            style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CloseIcon size={12} />
          </button>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '6px 0' }}>
          {visibleCommands.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
              No commands matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            visibleCommands.map((cmd, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(idx)}
                  style={{
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? 'var(--bg-2)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', color: isSelected ? 'var(--text)' : 'var(--text-dim)', fontWeight: isSelected ? 600 : 400 }}>
                      {cmd.title}
                    </div>
                    {cmd.subtitle && (
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                        {cmd.subtitle}
                      </div>
                    )}
                  </div>
                  <span className="font-mono label-caps" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                    [{cmd.category}]
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--bg-0)',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-faint)',
          }}
        >
          <span>Use &uarr; &darr; to navigate, Enter to run, Esc to close</span>
          <span className="font-mono">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
};
