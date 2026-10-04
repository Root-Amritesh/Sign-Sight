import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { t } from '../../i18n';
import {
  DashboardIcon,
  AlertIcon,
  MapIcon,
  QueryIcon,
  IngestIcon,
  ModelIcon,
  RegistryIcon,
  DriftIcon,
  AuditIcon,
  SettingsIcon,
  ProfileIcon,
  ChevronIcon,
  OnlineIcon,
} from '../../icons';

interface NavItem {
  path: string;
  labelKey: string;
  fallbackLabel: string;
  adminOnly?: boolean;
  icon: React.FC<{ size?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/app/dashboard', labelKey: 'nav.dashboard', fallbackLabel: 'Dashboard', icon: DashboardIcon },
  { path: '/app/alerts', labelKey: 'nav.alerts', fallbackLabel: 'Alerts', icon: AlertIcon },
  { path: '/app/map', labelKey: 'nav.map', fallbackLabel: 'Threat Map', icon: MapIcon },
  { path: '/app/query', labelKey: 'nav.query', fallbackLabel: 'Query', icon: QueryIcon },
  { path: '/app/ingest', labelKey: 'nav.ingest', fallbackLabel: 'Ingest & Replay', icon: IngestIcon },
  { path: '/app/model', labelKey: 'nav.model', fallbackLabel: 'Model Health', icon: ModelIcon },
  { path: '/app/registry', labelKey: 'nav.registry', fallbackLabel: 'Model Registry', icon: RegistryIcon, adminOnly: true },
  { path: '/app/drift', labelKey: 'nav.drift', fallbackLabel: 'Drift Monitor', icon: DriftIcon },
  { path: '/app/audit', labelKey: 'nav.audit', fallbackLabel: 'Audit Trail', icon: AuditIcon, adminOnly: true },
  { path: '/app/settings', labelKey: 'nav.settings', fallbackLabel: 'Settings', icon: SettingsIcon, adminOnly: true },
  { path: '/app/connection', labelKey: 'nav.connection', fallbackLabel: 'Connection Hub', icon: OnlineIcon },
  { path: '/app/profile', labelKey: 'nav.profile', fallbackLabel: 'Profile', icon: ProfileIcon },
];

export const AppRail: React.FC = () => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const { role } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin');

  return (
    <aside
      style={{
        width: expanded ? 'var(--rail-width-expanded)' : 'var(--rail-width-collapsed)',
        minWidth: expanded ? 'var(--rail-width-expanded)' : 'var(--rail-width-collapsed)',
        backgroundColor: 'var(--bg-1)',
        borderRight: '1px solid var(--line)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        zIndex: 60,
        transition: 'width 140ms ease, min-width 140ms ease',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'space-between' : 'center',
          padding: expanded ? '0 16px' : '0',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {expanded ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                backgroundColor: 'var(--accent)',
                display: 'inline-block',
              }}
            />
            <span
              className="font-display"
              style={{ fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.02em' }}
            >
              SignSight
            </span>
          </div>
        ) : (
          <span
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--accent)',
              display: 'inline-block',
            }}
          />
        )}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            cursor: 'pointer',
            color: 'var(--text-dim)',
            padding: '4px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={expanded ? 'Collapse navigation' : 'Expand navigation'}
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        >
          <ChevronIcon size={14} direction={expanded ? 'left' : 'right'} />
        </button>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
        aria-label="Main Navigation"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const label = t(item.labelKey as Parameters<typeof t>[0], item.fallbackLabel);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={label}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                height: '36px',
                padding: expanded ? '0 16px' : '0',
                justifyContent: expanded ? 'flex-start' : 'center',
                gap: '12px',
                color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                backgroundColor: isActive ? 'var(--bg-2)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                transition: 'background-color 100ms ease, color 100ms ease',
              })}
            >
              <Icon size={18} />
              {expanded && (
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Rail Footer */}
      {expanded && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--line)',
            fontSize: '11px',
            color: 'var(--text-faint)',
          }}
        >
          <div className="font-mono">SIGNSIGHT NIDS</div>
          <div>SOC Console</div>
        </div>
      )}
    </aside>
  );
};
