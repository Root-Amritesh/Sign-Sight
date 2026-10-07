/**
 * Centralized, typed API endpoints table.
 * All API paths, HTTP methods, and RBAC roles are defined here.
 * No raw URL path strings should exist anywhere else.
 */

export type UserRole = 'analyst' | 'admin' | 'any' | 'public';

export interface EndpointDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  role: UserRole;
  description: string;
}

export const ENDPOINTS = {
  // Auth & Health (Public / Any)
  AUTH_LOGIN: {
    path: '/auth/login/',
    method: 'POST',
    role: 'public',
    description: 'Obtain JWT access and refresh tokens',
  },
  AUTH_GOOGLE: {
    path: '/auth/google/',
    method: 'POST',
    role: 'public',
    description: 'Authenticate via Google OAuth ID token',
  },
  AUTH_REFRESH: {
    path: '/auth/refresh/',
    method: 'POST',
    role: 'public',
    description: 'Refresh JWT access token',
  },
  AUTH_ME: {
    path: '/auth/me/',
    method: 'GET',
    role: 'any',
    description: 'Get current user profile and role',
  },
  HEALTH: {
    path: '/health/',
    method: 'GET',
    role: 'public',
    description: 'System health check (database, redis, celery, model status)',
  },

  // Ingestion (Analyst+ / Admin)
  INGEST_SINGLE: {
    path: '/ingest/',
    method: 'POST',
    role: 'analyst',
    description: 'Ingest single network flow record (41 NSL-KDD features)',
  },
  INGEST_BATCH: {
    path: '/ingest/batch/',
    method: 'POST',
    role: 'admin',
    description: 'Upload CSV file for asynchronous batch processing',
  },
  INGEST_TASK_STATUS: {
    path: '/ingest/tasks/:taskId/',
    method: 'GET',
    role: 'admin',
    description: 'Check progress of batch ingestion task',
  },
  INGEST_REPLAY_START: {
    path: '/ingest/replay/',
    method: 'POST',
    role: 'admin',
    description: 'Start live traffic replay from dataset',
  },
  INGEST_REPLAY_STOP: {
    path: '/ingest/replay/stop/',
    method: 'POST',
    role: 'admin',
    description: 'Stop active live replay task',
  },

  // Alerts (Analyst+)
  ALERTS_LIST: {
    path: '/alerts/',
    method: 'GET',
    role: 'analyst',
    description: 'List and filter alerts (paginated)',
  },
  ALERT_DETAIL: {
    path: '/alerts/:id/',
    method: 'GET',
    role: 'analyst',
    description: 'Retrieve full alert details with probabilities and explanation',
  },
  ALERT_UPDATE: {
    path: '/alerts/:id/',
    method: 'PATCH',
    role: 'analyst',
    description: 'Update alert status (viewed, escalated, resolved)',
  },
  ALERTS_STATS: {
    path: '/alerts/stats/',
    method: 'GET',
    role: 'analyst',
    description: 'Aggregate alert statistics (by severity, status, label)',
  },

  // Model Management & Metrics
  MODELS_LIST: {
    path: '/models/',
    method: 'GET',
    role: 'admin',
    description: 'List all deployed model versions',
  },
  MODEL_DEPLOY: {
    path: '/models/deploy/',
    method: 'POST',
    role: 'admin',
    description: 'Deploy new model version with server-side validation checks',
  },
  MODEL_ROLLBACK: {
    path: '/models/rollback/',
    method: 'POST',
    role: 'admin',
    description: 'Rollback to a previously validated model version',
  },
  METRICS_MODEL: {
    path: '/metrics/model/',
    method: 'GET',
    role: 'any',
    description: 'Active model evaluation metrics (Stage 1 & Stage 2)',
  },
  METRICS_DRIFT: {
    path: '/metrics/drift/',
    method: 'GET',
    role: 'any',
    description: 'Prediction distribution & anomaly score drift metrics',
  },

  // Audit Logs (Admin)
  AUDIT_LOGS: {
    path: '/audit/',
    method: 'GET',
    role: 'admin',
    description: 'Query immutable audit trail records',
  },

  // Alert Threshold Configuration (Admin)
  CONFIG_THRESHOLDS_GET: {
    path: '/config/alert-thresholds/',
    method: 'GET',
    role: 'admin',
    description: 'Get alert thresholds and severity rules',
  },
  CONFIG_THRESHOLDS_PUT: {
    path: '/config/alert-thresholds/',
    method: 'PUT',
    role: 'admin',
    description: 'Update alert thresholds and severity rules',
  },
} as const satisfies Record<string, EndpointDefinition>;

export type EndpointKey = keyof typeof ENDPOINTS;

/**
 * Builds the resolved path by interpolating URL parameters.
 */
export function buildPath(path: string, params: Record<string, string | number> = {}): string {
  let resolved = path;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`:${key}`, encodeURIComponent(String(value)));
  }
  return resolved;
}
