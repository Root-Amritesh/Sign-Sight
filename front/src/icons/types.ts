import type { Severity } from '../types/api';

export interface IconProps {
  size?: number | string;
  className?: string;
  title?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  style?: React.CSSProperties;
}

export interface SigilProps {
  id: string;
  size?: 16 | 24 | 40 | 96 | number;
  severity?: Severity;
  className?: string;
  title?: string;
  showHash?: boolean;
}
