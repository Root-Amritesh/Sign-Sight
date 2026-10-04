import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  style,
  className = '',
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        backgroundColor: 'var(--bg-2)',
        border: '1px solid var(--line)',
        display: 'inline-block',
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

export const SkeletonRow: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          height="14px"
          style={{
            flex: i === 0 ? '0 0 70px' : i === 1 ? '0 0 130px' : 1,
          }}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Skeleton width="40%" height="12px" />
      <Skeleton width="70%" height="24px" />
      <Skeleton width="100%" height="40px" />
    </div>
  );
};
