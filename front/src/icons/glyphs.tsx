import React from 'react';
import type { IconProps } from './types';

const defaultSvgProps = (size: number | string = 24, title?: string, className?: string, ariaHidden?: boolean | 'true' | 'false', style?: React.CSSProperties) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
  className,
  'aria-hidden': title ? undefined : ariaHidden ?? true,
  style: { verticalAlign: 'middle', flexShrink: 0, ...style },
});

export const DashboardIcon: React.FC<IconProps> = ({ size = 24, title = 'Dashboard', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <rect x="3" y="3" width="8" height="8" />
    <rect x="13" y="3" width="8" height="5" />
    <rect x="13" y="11" width="8" height="10" />
    <rect x="3" y="14" width="8" height="7" />
    {/* Scan line cut */}
    <line x1="1" y1="12" x2="23" y2="12" strokeWidth="0.75" strokeDasharray="1 3" />
  </svg>
);

export const AlertIcon: React.FC<IconProps> = ({ size = 24, title = 'Alert', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="12,2 22,20 2,20" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <line x1="12" y1="16" x2="12" y2="17.5" strokeWidth="2" />
    <line x1="2" y1="12" x2="22" y2="12" strokeWidth="0.75" strokeDasharray="2 2" />
  </svg>
);

export const AlertDetailIcon: React.FC<IconProps> = ({ size = 24, title = 'Alert Detail', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <rect x="3" y="3" width="18" height="18" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="10" y1="9" x2="10" y2="21" />
    <circle cx="6.5" cy="6" r="1" fill="currentColor" />
    <line x1="1" y1="15" x2="23" y2="15" strokeWidth="0.75" strokeDasharray="1 2" />
  </svg>
);

export const MapIcon: React.FC<IconProps> = ({ size = 24, title = 'Map', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
    <line x1="1" y1="12" x2="23" y2="12" strokeWidth="0.75" strokeDasharray="2 3" />
  </svg>
);

export const GraphIcon: React.FC<IconProps> = ({ size = 24, title = 'Graph', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="8" r="3" />
    <circle cx="12" cy="18" r="3" />
    <line x1="8.5" y1="7" x2="15.5" y2="7.5" />
    <line x1="7.5" y1="8.5" x2="10.5" y2="15.5" />
    <line x1="16.5" y1="10.5" x2="13.5" y2="15.5" />
  </svg>
);

export const QueryIcon: React.FC<IconProps> = ({ size = 24, title = 'Query', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polyline points="4,17 10,11 4,5" />
    <line x1="12" y1="19" x2="20" y2="19" strokeWidth="2" />
    {/* Scan cut */}
    <line x1="2" y1="12" x2="22" y2="12" strokeWidth="0.75" strokeDasharray="1 2" />
  </svg>
);

export const IngestIcon: React.FC<IconProps> = ({ size = 24, title = 'Ingest', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <rect x="4" y="4" width="16" height="16" />
    <path d="M12 7V17M12 17L8 13M12 17L16 13" />
    <line x1="2" y1="12" x2="22" y2="12" strokeWidth="0.75" strokeDasharray="2 2" />
  </svg>
);

export const ReplayIcon: React.FC<IconProps> = ({ size = 24, title = 'Replay', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="5,4 15,12 5,20" />
    <line x1="19" y1="4" x2="19" y2="20" strokeWidth="2" />
  </svg>
);

export const ModelIcon: React.FC<IconProps> = ({ size = 24, title = 'Model', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    {/* Hexagonal neural node core with scan-line */}
    <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />
    <circle cx="12" cy="12" r="3" />
    <line x1="2" y1="12" x2="22" y2="12" strokeWidth="0.75" strokeDasharray="2 3" />
  </svg>
);

export const RegistryIcon: React.FC<IconProps> = ({ size = 24, title = 'Registry', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <path d="M4 4H20V9H4Z" />
    <path d="M4 11H20V16H4Z" />
    <path d="M4 18H20V21H4Z" />
    <circle cx="7" cy="6.5" r="0.8" fill="currentColor" />
    <circle cx="7" cy="13.5" r="0.8" fill="currentColor" />
  </svg>
);

export const DriftIcon: React.FC<IconProps> = ({ size = 24, title = 'Drift', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <path d="M3 18L8 13L13 16L21 6" />
    <polyline points="16,6 21,6 21,11" />
    {/* Threshold baseline */}
    <line x1="3" y1="12" x2="21" y2="12" strokeWidth="0.75" strokeDasharray="3 3" />
  </svg>
);

export const AuditIcon: React.FC<IconProps> = ({ size = 24, title = 'Audit', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <path d="M14 2H6V22H18V6L14 2Z" />
    <line x1="14" y1="2" x2="14" y2="6" />
    <line x1="14" y1="6" x2="18" y2="6" />
    <line x1="9" y1="11" x2="15" y2="11" />
    <line x1="9" y1="15" x2="15" y2="15" />
    <line x1="2" y1="13" x2="22" y2="13" strokeWidth="0.75" strokeDasharray="1 2" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 24, title = 'Settings', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.9 4.9L7.1 7.1M16.9 16.9L19.1 19.1M4.9 19.1L7.1 16.9M16.9 7.1L19.1 4.9" />
  </svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ size = 24, title = 'Profile', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <rect x="7" y="4" width="10" height="8" />
    <path d="M4 20C4 16.5 7.5 15 12 15C16.5 15 20 16.5 20 20" />
    <line x1="2" y1="12" x2="22" y2="12" strokeWidth="0.75" strokeDasharray="2 3" />
  </svg>
);

export const LogoutIcon: React.FC<IconProps> = ({ size = 24, title = 'Logout', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <path d="M9 21H4V3H9" />
    <polyline points="15,7 20,12 15,17" />
    <line x1="20" y1="12" x2="8" y2="12" />
  </svg>
);

export const FilterIcon: React.FC<IconProps> = ({ size = 24, title = 'Filter', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="3,4 21,4 14,13 14,20 10,18 10,13" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 24, title = 'Search', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <circle cx="10.5" cy="10.5" r="7" />
    <line x1="15.5" y1="15.5" x2="21" y2="21" strokeWidth="2" />
    <line x1="2" y1="10.5" x2="19" y2="10.5" strokeWidth="0.75" strokeDasharray="1 2" />
  </svg>
);

export const ExportIcon: React.FC<IconProps> = ({ size = 24, title = 'Export', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <path d="M4 14V20H20V14" />
    <line x1="12" y1="3" x2="12" y2="15" />
    <polyline points="7,8 12,3 17,8" />
  </svg>
);

export const DeployIcon: React.FC<IconProps> = ({ size = 24, title = 'Deploy', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="12,2 19,10 14,10 14,22 10,22 10,10 5,10" />
    <line x1="2" y1="10" x2="22" y2="10" strokeWidth="0.75" strokeDasharray="2 3" />
  </svg>
);

export const RollbackIcon: React.FC<IconProps> = ({ size = 24, title = 'Rollback', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polyline points="4,9 9,4 9,8 16,8 C19,8 20,11 20,14 C20,18 17,20 13,20" />
  </svg>
);

export const EscalateIcon: React.FC<IconProps> = ({ size = 24, title = 'Escalate', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="12,4 4,14 10,14 10,20 14,20 14,14 20,14" />
  </svg>
);

export const ResolveIcon: React.FC<IconProps> = ({ size = 24, title = 'Resolve', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <rect x="3" y="3" width="18" height="18" />
    <polyline points="7,12 10.5,15.5 17,9" strokeWidth="2" />
  </svg>
);

export const FalsePositiveIcon: React.FC<IconProps> = ({ size = 24, title = 'False Positive', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <circle cx="12" cy="12" r="9" />
    <line x1="8" y1="8" x2="16" y2="16" />
  </svg>
);

export const TruePositiveIcon: React.FC<IconProps> = ({ size = 24, title = 'True Positive', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="12,2 22,12 12,22 2,12" />
    <polyline points="8,12 11,15 16,9" strokeWidth="1.8" />
  </svg>
);

export const OnlineIcon: React.FC<IconProps> = ({ size = 24, title = 'Online', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="none" />
    <path d="M5 12A7 7 0 0 1 19 12" />
    <path d="M2 12A10 10 0 0 1 22 12" />
  </svg>
);

export const OfflineIcon: React.FC<IconProps> = ({ size = 24, title = 'Offline', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <circle cx="12" cy="12" r="3" />
    <line x1="3" y1="3" x2="21" y2="21" stroke="var(--sev-critical)" strokeWidth="2" />
  </svg>
);

export const ShieldOpenIcon: React.FC<IconProps> = ({ size = 24, title = 'Shield', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    {/* Open perimeter shield with crosshair cut (NOT a shield with checkmark) */}
    <path d="M12 2L4 5V11C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 11V5L12 2Z" />
    <line x1="12" y1="7" x2="12" y2="17" strokeWidth="1" />
    <line x1="7" y1="12" x2="17" y2="12" strokeWidth="1" />
  </svg>
);

export const SigilPlaceholderIcon: React.FC<IconProps> = ({ size = 24, title = 'Sigil Placeholder', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <rect x="3" y="3" width="18" height="18" strokeDasharray="3 3" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 24, title = 'Close', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <line x1="5" y1="5" x2="19" y2="19" strokeWidth="2" />
    <line x1="19" y1="5" x2="5" y2="19" strokeWidth="2" />
  </svg>
);

export const ChevronIcon: React.FC<IconProps & { direction?: 'left' | 'right' | 'up' | 'down' }> = ({
  size = 24,
  title = 'Chevron',
  direction = 'right',
  className,
  'aria-hidden': ah,
  style,
}) => {
  const points = {
    right: '9,5 16,12 9,19',
    left: '15,5 8,12 15,19',
    up: '5,15 12,8 19,15',
    down: '5,9 12,16 19,9',
  }[direction];

  return (
    <svg {...defaultSvgProps(size, title, className, ah, style)}>
      <title>{title}</title>
      <polyline points={points} />
    </svg>
  );
};

export const CopyIcon: React.FC<IconProps> = ({ size = 24, title = 'Copy', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <rect x="8" y="8" width="12" height="12" />
    <path d="M16 8V4H4V16H8" />
  </svg>
);

export const WarningIcon: React.FC<IconProps> = ({ size = 24, title = 'Warning', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="12,3 22,20 2,20" />
    <line x1="12" y1="9" x2="12" y2="14" strokeWidth="2" />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size = 24, title = 'Play', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="6,4 19,12 6,20" />
  </svg>
);

export const PauseIcon: React.FC<IconProps> = ({ size = 24, title = 'Pause', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <line x1="8" y1="5" x2="8" y2="19" strokeWidth="2.5" />
    <line x1="16" y1="5" x2="16" y2="19" strokeWidth="2.5" />
  </svg>
);

export const SkipIcon: React.FC<IconProps> = ({ size = 24, title = 'Skip', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polygon points="5,5 14,12 5,19" />
    <line x1="18" y1="5" x2="18" y2="19" strokeWidth="2" />
  </svg>
);

export const IncidentIcon: React.FC<IconProps> = ({ size = 24, title = 'Incident', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <rect x="3" y="3" width="18" height="18" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    <line x1="8" y1="8" x2="12" y2="16" />
    <line x1="16" y1="8" x2="12" y2="16" />
  </svg>
);

export const ResultsIcon: React.FC<IconProps> = ({ size = 24, title = 'Results', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <line x1="4" y1="20" x2="20" y2="20" strokeWidth="1.5" />
    <rect x="6" y="11" width="3" height="9" />
    <rect x="11" y="6" width="3" height="14" fill="currentColor" fillOpacity="0.2" />
    <rect x="16" y="3" width="3" height="17" />
  </svg>
);

export const FeedbackIcon: React.FC<IconProps> = ({ size = 24, title = 'Feedback', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <path d="M4 4H20V16H8L4 20V4Z" />
    <polyline points="9,10 11.5,12.5 15.5,8" strokeWidth="1.5" />
  </svg>
);

export const KioskIcon: React.FC<IconProps> = ({ size = 24, title = 'Kiosk', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <rect x="3" y="4" width="18" height="13" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="17" x2="12" y2="20" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ size = 24, title = 'Notifications', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <path d="M6 9C6 5.686 8.686 3 12 3C15.314 3 18 5.686 18 9V14L20 17H4L6 14V9Z" />
    <path d="M9 17C9 18.657 10.343 20 12 20C13.657 20 15 18.657 15 17" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 24, title = 'Check', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <polyline points="4,12 9,17 20,6" strokeWidth="2" />
  </svg>
);

export const ArrowUpIcon: React.FC<IconProps> = ({ size = 24, title = 'Up', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <line x1="12" y1="19" x2="12" y2="5" strokeWidth="1.5" />
    <polyline points="5,12 12,5 19,12" strokeWidth="1.5" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 24, title = 'Download', className, 'aria-hidden': ah, style }) => (
  <svg {...defaultSvgProps(size, title, className, ah, style)}>
    <title>{title}</title>
    <path d="M4 17V20H20V17" />
    <line x1="12" y1="4" x2="12" y2="15" strokeWidth="1.5" />
    <polyline points="7,10 12,15 17,10" strokeWidth="1.5" />
  </svg>
);
export const Glyph: React.FC<IconProps & { name: string; direction?: 'left' | 'right' | 'up' | 'down' }> = ({
  name,
  size = 24,
  title,
  className,
  'aria-hidden': ah,
  style,
  direction,
}) => {
  switch (name.toLowerCase()) {
    case 'dashboard':
      return <DashboardIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'alert':
      return <AlertIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'alert-detail':
      return <AlertDetailIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'map':
      return <MapIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'graph':
      return <GraphIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'query':
      return <QueryIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'ingest':
      return <IngestIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'replay':
      return <ReplayIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'model':
      return <ModelIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'registry':
      return <RegistryIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'drift':
      return <DriftIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'audit':
      return <AuditIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'settings':
      return <SettingsIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'profile':
      return <ProfileIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'logout':
      return <LogoutIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'filter':
      return <FilterIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'search':
      return <SearchIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'export':
      return <ExportIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'deploy':
      return <DeployIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'rollback':
      return <RollbackIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'escalate':
      return <EscalateIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'resolve':
      return <ResolveIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'false-positive':
    case 'falsepositive':
    case 'fp':
      return <FalsePositiveIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'true-positive':
    case 'truepositive':
    case 'tp':
      return <TruePositiveIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'online':
      return <OnlineIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'offline':
      return <OfflineIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'shield':
      return <ShieldOpenIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'sigil':
      return <SigilPlaceholderIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'close':
      return <CloseIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'chevron':
      return <ChevronIcon size={size} title={title} className={className} aria-hidden={ah} style={style} direction={direction} />;
    case 'copy':
      return <CopyIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'warning':
      return <WarningIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'play':
      return <PlayIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'pause':
      return <PauseIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'skip':
      return <SkipIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'incident':
      return <IncidentIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'results':
      return <ResultsIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'feedback':
      return <FeedbackIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'kiosk':
      return <KioskIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'bell':
      return <BellIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'check':
      return <CheckIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'up':
      return <ArrowUpIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    case 'download':
      return <DownloadIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
    default:
      return <SigilPlaceholderIcon size={size} title={title} className={className} aria-hidden={ah} style={style} />;
  }
};
