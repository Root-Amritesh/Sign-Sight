import React from 'react';
import type { Severity } from '../../types/api';

interface SeverityTagProps {
  severity: Severity;
  className?: string;
  style?: React.CSSProperties;
}

export const SeverityTag: React.FC<SeverityTagProps> = ({ severity, className, style }) => {
  const normSev = (severity || 'low').toLowerCase() as Severity;
  return (
    <span
      className={`sev-tag sev-tag-${normSev} ${className || ''}`}
      style={style}
    >
      {normSev.toUpperCase()}
    </span>
  );
};
