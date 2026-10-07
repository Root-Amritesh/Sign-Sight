import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-1)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-sm)',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      {icon && <div style={{ marginBottom: '16px', color: 'var(--text-dim)' }}>{icon}</div>}
      <h3 className="font-display" style={{ fontSize: '18px', color: 'var(--text)', margin: '0 0 8px 0' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.5, maxWidth: '440px', margin: '0 0 20px 0' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn btn-primary" style={{ height: '32px', fontSize: '12px' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};
