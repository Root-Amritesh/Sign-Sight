import React from 'react';
import type { SigilProps } from './types';
import { generateSigilData } from './sigilGenerator';

export const Sigil: React.FC<SigilProps> = ({
  id,
  size = 24,
  severity,
  className,
  title,
  showHash,
}) => {
  const data = generateSigilData(id, severity);
  const isLarge = size >= 96 || showHash;

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        verticalAlign: 'middle',
      }}
      className={className}
      title={title || `Sigil for ${id}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ color: data.strokeColor, flexShrink: 0 }}
        aria-hidden={title ? undefined : true}
      >
        {/* Background container boundary */}
        <rect
          x="1"
          y="1"
          width="22"
          height="22"
          fill="var(--bg-1)"
          stroke="var(--line)"
          strokeWidth="0.75"
        />

        {/* 5x5 Mirrored Cell Grid (each cell 2x2 with 0.5 spacing, centered around (6..18)) */}
        <g fill="currentColor">
          {data.grid.map((row, r) =>
            row.map((active, c) => {
              if (!active) return null;
              return (
                <rect
                  key={`cell-${r}-${c}`}
                  x={6 + c * 2.4}
                  y={6 + r * 2.4}
                  width="1.8"
                  height="1.8"
                  fill="currentColor"
                />
              );
            })
          )}
        </g>

        {/* Outer Frame Shape */}
        {data.frameType === 0 && (
          // Diamond frame
          <polygon
            points="12,2 22,12 12,22 2,12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="miter"
          />
        )}
        {data.frameType === 1 && (
          // Hexagon frame
          <polygon
            points="6.5,2 17.5,2 22,12 17.5,22 6.5,22 2,12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="miter"
          />
        )}
        {data.frameType === 2 && (
          // Notch-square frame
          <polygon
            points="4,2 20,2 22,4 22,20 20,22 4,22 2,20 2,4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="miter"
          />
        )}
        {data.frameType === 3 && (
          // Chevron frame
          <polygon
            points="2,6 12,2 22,6 22,18 12,22 2,18"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="miter"
          />
        )}
        {data.frameType === 4 && (
          // Ring-cut frame
          <circle
            cx="12"
            cy="12"
            r="9.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="14 3 8 3"
          />
        )}
        {data.frameType === 5 && (
          // Slash / Crosshair frame
          <g stroke="currentColor" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" strokeWidth="1.2" />
            <line x1="3" y1="3" x2="7" y2="7" />
            <line x1="21" y1="3" x2="17" y2="7" />
            <line x1="3" y1="21" x2="7" y2="17" />
            <line x1="21" y1="21" x2="17" y2="17" />
          </g>
        )}

        {/* Scan-Line Cuts */}
        {data.scanLines.map((y, idx) => (
          <line
            key={`scan-${idx}`}
            x1="2"
            y1={y}
            x2="22"
            y2={y}
            stroke="var(--bg-0)"
            strokeWidth="1.5"
          />
        ))}
        {data.scanLines.map((y, idx) => (
          <line
            key={`scan-accent-${idx}`}
            x1="2"
            y1={y}
            x2="22"
            y2={y}
            stroke="var(--accent)"
            strokeWidth="0.75"
            strokeDasharray="2 3"
          />
        ))}
      </svg>

      {/* Full Hash Mono Readout (Shown at size >= 96 or when explicitly requested) */}
      {isLarge && (
        <span
          className="font-mono"
          style={{
            fontSize: '11px',
            color: 'var(--text-dim)',
            letterSpacing: '0.04em',
          }}
        >
          {data.hashHex}
        </span>
      )}
    </div>
  );
};
