/**
 * Inline icon set — 24×24, stroke-based, inherits `currentColor`.
 * Hand-rolled rather than pulling an icon package: the set is small, and it
 * keeps the bundle lean.
 */

export type IconName =
  | 'shield'
  | 'grid'
  | 'bell'
  | 'pulse'
  | 'model'
  | 'drift'
  | 'ingest'
  | 'audit'
  | 'sliders'
  | 'logout'
  | 'user'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'check'
  | 'x'
  | 'warning'
  | 'eye'
  | 'refresh'
  | 'play'
  | 'stop'
  | 'upload'
  | 'search'
  | 'database'
  | 'server'
  | 'cpu'
  | 'arrowRight'
  | 'info'
  | 'lock'
  | 'clock'
  | 'target'
  | 'layers'
  | 'branch'
  | 'terminal'
  | 'plus'
  | 'menu'
  | 'power'
  | 'scale'
  | 'radar'
  | 'flask'
  | 'link'
  | 'download'

const PATHS: Record<IconName, string> = {
  shield: 'M12 3 4.5 6v6.2c0 4.4 3.1 7.6 7.5 8.8 4.4-1.2 7.5-4.4 7.5-8.8V6L12 3Z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  bell: 'M18 15V10a6 6 0 1 0-12 0v5l-1.6 2.4h15.2L18 15ZM10 20.2a2 2 0 0 0 4 0',
  pulse: 'M3 12h3.5l2-5.5 3.2 11 2.4-7.2 1.5 1.7H21',
  model: 'M12 2.6 20 7v10l-8 4.4L4 17V7l8-4.4ZM12 2.6V12m0 0 8-5m-8 5-8-5m8 5v9.4',
  drift: 'M3 17.5 9 11l3.5 3.5L21 6M21 6h-4.5M21 6v4.5M3 21h18',
  ingest: 'M12 3v11m0 0 4-4m-4 4-4-4M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17',
  audit: 'M8 3h8l4 4v14H4V3h4Zm8 0v4h4M8 11h8M8 15h8M8 18h5',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 4.5v5M9 14.5v5',
  logout: 'M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-6A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h6a1.5 1.5 0 0 0 1.5-1.5V17M9 12h11m0 0-3.5-3.5M20 12l-3.5 3.5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  chevronRight: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronDown: 'M5 9l7 7 7-7',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  x: 'M5.5 5.5l13 13m0-13-13 13',
  warning: 'M12 3.5 21.5 20h-19L12 3.5Zm0 6v5m0 3v.5',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4.5V10h-5.5',
  play: 'M7 4.5 19 12 7 19.5v-15Z',
  stop: 'M6.5 6.5h11v11h-11z',
  upload: 'M12 16V4.5m0 0L8 8.5m4-4 4 4M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.2-2.3L20 20',
  database: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Zm8 3v12c0 1.7-3.6 3-8 3s-8-1.3-8-3V6m16 6c0 1.7-3.6 3-8 3s-8-1.3-8-3',
  server: 'M4 4.5h16v6H4zM4 13.5h16v6H4zM7.5 7.5h.01M7.5 16.5h.01M11 7.5h6M11 16.5h6',
  cpu: 'M8 8h8v8H8zM5 10h3M5 14h3M16 10h3M16 14h3M10 5v3M14 5v3M10 16v3M14 16v3',
  arrowRight: 'M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v.5m0 3.5v6',
  lock: 'M7 10.5V7.8a5 5 0 0 1 10 0v2.7M5.5 10.5h13v9h-13z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3.5 2',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  layers: 'M12 3 3 7.5l9 4.5 9-4.5L12 3ZM3 12.5 12 17l9-4.5M3 17 12 21.5 21 17',
  branch: 'M7 4.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 11a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm10-11a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-8 2v9m8-9v1.5a3 3 0 0 1-3 3H9',
  terminal: 'M5 5.5h14v13H5zM8.5 10l2.5 2.5-2.5 2.5M13.5 15.5h3',
  plus: 'M12 5v14M5 12h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  power: 'M12 4v8M7.5 6.5a7 7 0 1 0 9 0',
  scale: 'M12 4v16M6 8h12M6 8 3.5 14h5L6 8Zm12 0-2.5 6h5L18 8ZM8 20h8',
  radar: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 12l7-4',
  flask: 'M9 3h6M10 3v6.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.5V3M7.5 15h9',
  link: 'M10 14a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7L11.5 6.8M14 10a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.3-1.3',
  download: 'M12 4v11m0 0 4-4m-4 4-4-4M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15',
}

/** Icons that read better filled than stroked. */
const FILLED = new Set<IconName>(['play', 'grid', 'stop'])

interface IconProps {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

export function Icon({ name, size = 16, className, strokeWidth = 1.6 }: IconProps) {
  const filled = FILLED.has(name)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={PATHS[name]}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.18 : 0}
      />
    </svg>
  )
}

/** The SignSight shield mark, used in the nav, landing, and login. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 2.5 27 7v8.6c0 6.6-4.6 11.6-11 13.9C9.6 27.2 5 22.2 5 15.6V7l11-4.5Z"
        stroke="var(--cyan)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M16 2.5 27 7l-11 4.6L5 7l11-4.5Z" fill="var(--cyan)" fillOpacity="0.14" />
      <circle cx="16" cy="15" r="3.4" stroke="var(--ink)" strokeWidth="1.4" />
      <circle cx="16" cy="15" r="1.4" fill="var(--danger)" />
      <path d="M11.5 22.5 16 27l4.5-4.5" stroke="var(--cyan)" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}
