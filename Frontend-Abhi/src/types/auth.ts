export type UserRole = 'visitor' | 'analyst' | 'admin';

export interface User {
  id: number | string;
  username: string;
  email?: string;
  role: 'analyst' | 'admin';
  date_joined?: string;
  last_login?: string | null;
}

export interface AuthResponse {
  access: string;
  refresh?: string;
  user?: User;
}

export interface AuthHealth {
  status: 'healthy' | 'degraded';
  checks: {
    database?: { status: string; latency_ms?: number; error?: string };
    redis?: { status: string; latency_ms?: number; error?: string };
    celery?: { status: string; active_workers?: number; error?: string };
    model?: { status: string; version?: string; loaded_at?: string; error?: string };
  };
  timestamp?: string;
}
