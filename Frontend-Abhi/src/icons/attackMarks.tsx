import React from 'react';
import type { AttackFamily, Severity } from '../types/api';
import type { IconProps } from './types';

interface AttackMarkProps extends IconProps {
  family: AttackFamily | string;
  severity?: Severity;
}

export const AttackMark: React.FC<AttackMarkProps> = ({
  family: rawFamily,
  size = 20,
  severity,
  className,
  title,
}) => {
  const family = (rawFamily || '').toLowerCase();
  let strokeColor = 'currentColor';
  if (severity === 'critical') strokeColor = 'var(--sev-critical)';
  else if (severity === 'high') strokeColor = 'var(--sev-high)';
  else if (severity === 'medium') strokeColor = 'var(--sev-medium)';
  else if (severity === 'low') strokeColor = 'var(--sev-low)';

  const markTitle = title || `Attack family: ${family.toUpperCase()}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden={title ? undefined : true}
      style={{ verticalAlign: 'middle', flexShrink: 0 }}
    >
      <title>{markTitle}</title>

      {/* DoS: Stacked converging arrows (swarm) */}
      {family === 'dos' && (
        <g>
          <path d="M4 6L12 11L20 6" />
          <path d="M4 11L12 16L20 11" />
          <path d="M4 16L12 21L20 16" />
          {/* Scan line motif */}
          <line x1="2" y1="12" x2="22" y2="12" strokeWidth="0.75" strokeDasharray="2 3" />
        </g>
      )}

      {/* Probe: Circle with a radial tick (scout) */}
      {family === 'probe' && (
        <g>
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="12" x2="19" y2="5" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          {/* Scan line cut */}
          <line x1="4" y1="12" x2="20" y2="12" strokeWidth="0.75" strokeDasharray="1 3" />
        </g>
      )}

      {/* R2L: Door shape with a break (intruder) */}
      {family === 'r2l' && (
        <g>
          <path d="M5 21V3H19V21" />
          <line x1="5" y1="21" x2="19" y2="21" />
          {/* Broken lock / intrusion break */}
          <line x1="14" y1="11" x2="14" y2="13" strokeWidth="2.5" />
          <path d="M11 11L8 14M8 11L11 14" strokeWidth="1" />
        </g>
      )}

      {/* U2R: Upward chevron over a horizontal bar (privilege climb) */}
      {family === 'u2r' && (
        <g>
          <path d="M5 13L12 6L19 13" />
          <path d="M7 17L12 12L17 17" />
          <line x1="4" y1="20" x2="20" y2="20" strokeWidth="2" />
        </g>
      )}

      {/* Normal / Novel-Suspicious */}
      {family === 'normal' && (
        <g>
          <circle cx="12" cy="12" r="8" />
          <line x1="6" y1="18" x2="18" y2="6" strokeWidth="1.2" />
        </g>
      )}
    </svg>
  );
};

export const getAttackFamilyMark = (family: AttackFamily): React.FC<IconProps> => {
  return (props: IconProps) => <AttackMark family={family} {...props} />;
};

