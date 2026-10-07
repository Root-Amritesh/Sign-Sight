import React from 'react';

interface ProbabilityBarProps {
  label: string;
  value: number; // 0 to 1
  color?: string;
  icon?: React.ReactNode;
}

export const ProbabilityBar: React.FC<ProbabilityBarProps> = ({
  label,
  value,
  color = 'var(--accent)',
  icon,
}) => {
  const percent = Math.min(100, Math.max(0, Math.round(value * 100)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon}
          <span style={{ color: 'var(--text)' }}>{label}</span>
        </div>
        <span className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>

      <div
        style={{
          height: '6px',
          backgroundColor: 'var(--bg-2)',
          border: '1px solid var(--line)',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            backgroundColor: color,
            transition: 'width 200ms ease-out',
          }}
        />
      </div>
    </div>
  );
};
