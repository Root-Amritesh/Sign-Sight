import type { Severity } from '../types/api';

/**
 * FNV-1a 32-bit hashing algorithm.
 * Deterministic hash for string inputs.
 */
export function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // Multiply by 32-bit FNV prime 16777619
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 seeded pseudo-random number generator.
 * Produces deterministic sequence of 32-bit floats [0, 1).
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SigilData {
  hashHex: string;
  grid: boolean[][]; // 5x5 boolean grid (horizontally mirrored)
  frameType: number; // 0 to 5
  scanLines: number[]; // Y coordinates for scan lines
  strokeColor: string;
}

export function generateSigilData(id: string, severity?: Severity): SigilData {
  const hash = fnv1a(id);
  const hashHex = `0x${hash.toString(16).padStart(8, '0').toUpperCase()}`;
  const prng = mulberry32(hash);

  // 1. Generate 5x5 grid with horizontal mirroring
  // Columns: 0, 1, 2 are generated, 3 mirrors 1, 4 mirrors 0.
  const grid: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const active = prng() > 0.45;
      grid[r][c] = active;
      grid[r][4 - c] = active;
    }
  }

  // 2. Select frame shape (0 to 5)
  const frameType = Math.floor(prng() * 6);

  // 3. Scan line cuts (0 to 2 lines)
  const scanLineCount = Math.floor(prng() * 3);
  const scanLines: number[] = [];
  for (let i = 0; i < scanLineCount; i++) {
    scanLines.push(4 + Math.floor(prng() * 16));
  }

  // 4. Color logic: critical & high severity get severity color
  let strokeColor = 'currentColor';
  if (severity === 'critical') {
    strokeColor = 'var(--sev-critical)';
  } else if (severity === 'high') {
    strokeColor = 'var(--sev-high)';
  }

  return {
    hashHex,
    grid,
    frameType,
    scanLines,
    strokeColor,
  };
}

export const hashStringToUint32 = fnv1a;

export function generateSigilSvgString(id: string, size = 96, severity?: Severity): string {
  const data = generateSigilData(id, severity);
  let rects = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (data.grid[r][c]) {
        rects += `<rect x="${c * 4}" y="${r * 4}" width="3.2" height="3.2" fill="${data.strokeColor}" />`;
      }
    }
  }

  let scans = '';
  data.scanLines.forEach((y) => {
    scans += `<line x1="0" y1="${y}" x2="24" y2="${y}" stroke="${data.strokeColor}" stroke-width="0.75" stroke-dasharray="1 2" />`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" stroke="${data.strokeColor}" stroke-width="1" />
    <g transform="translate(2, 2)">${rects}</g>
    ${scans}
  </svg>`;
}

