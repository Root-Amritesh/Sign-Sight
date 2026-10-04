import { env } from '../config/env';
import { authConfig } from '../config/auth';
import { ENDPOINTS, buildPath } from './endpoints';
import {
  HealthCheckResponseSchema,
  LoginResponseSchema,
  GoogleLoginResponseSchema,
  RefreshResponseSchema,
  UserSchema,
  PaginatedAlertsSchema,
  AlertDetailSchema,
  AlertUpdateResponseSchema,
  AlertStatsSchema,
  ModelsListResponseSchema,
  DeployModelResponseSchema,
  RollbackModelResponseSchema,
  ModelMetricsResponseSchema,
  DriftMetricsResponseSchema,
  PaginatedAuditRecordsSchema,
  AlertThresholdsConfigSchema,
  IngestSingleResponseSchema,
  IngestBatchResponseSchema,
  IngestTaskStatusResponseSchema,
  ReplayStartResponseSchema,
  ReplayStopResponseSchema,
  ApiErrorResponseSchema,
} from './schemas';
import {
  adaptAlertDetail,
  adaptAlertListItem,
  adaptAlertStats,
  adaptModelMetrics,
  adaptModelVersion,
  adaptDriftMetrics,
  adaptThresholdsConfig,
  serializeThresholdsConfig,
  diagnostics,
} from './adapters';
import type {
  UIAlertDetail,
  UIAlertListItem,
  UIAlertStats,
  UIModelMetrics,
  UIModelVersion,
  UIDriftMetrics,
  UIThresholdsConfig,
} from './adapters';
import type {
  User,
  AuditRecord,
  IngestSingleResponse,
  IngestBatchResponse,
  IngestTaskStatusResponse,
  ReplayStartResponse,
  ReplayStopResponse,
} from './schemas';

export interface ApiClientError {
  status: number;
  code?: string;
  detail: string;
  errors?: Record<string, string[]>;
  retryAfter?: number;
  requestId?: string;
  isNetworkError?: boolean;
}

const REFRESH_TOKEN_STORAGE_KEY = 'signsight_refresh_token';

class ApiClient {
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];
  private onSessionExpiredHandler?: () => void;

  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Refresh token storage in sessionStorage persists the session across page reloads
   * without writing credentials to localStorage.
   */
  public setTokens(access: string | null, refresh: string | null) {
    this.setAccessToken(access);
    this.setRefreshToken(refresh);
  }

  public clearAuth() {
    this.setTokens(null, null);
  }

  public setRefreshToken(token: string | null) {
    if (token) {
      try {
        sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
      } catch {
        // Fallback to in-memory if storage is restricted
      }
    } else {
      try {
        sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }

  public getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  public setOnSessionExpired(handler: () => void) {
    this.onSessionExpiredHandler = handler;
  }

  public isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return payload.exp <= now + 10; // 10s buffer
    } catch {
      return true;
    }
  }

  private onTokenRefreshed(newToken: string) {
    this.refreshSubscribers.forEach((cb) => cb(newToken));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private getBaseUrl(): string {
    const base = env.apiBaseUrl.replace(/\/$/, '');
    const prefix = env.apiVersionPrefix ? `/${env.apiVersionPrefix.replace(/^\/|\/$/g, '')}` : '';
    return `${base}${prefix}`;
  }

  private async executeFetch(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs = 15000
  ): Promise<Response> {
    const baseUrl = this.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers = new Headers(options.headers || {});

    if (this.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const config: RequestInit = {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      // Handle 401 Unauthorized for silent JWT refresh
      const isAuthEndpoint =
        endpoint.includes(ENDPOINTS.AUTH_LOGIN.path) ||
        endpoint.includes(ENDPOINTS.AUTH_REFRESH.path) ||
        endpoint.includes(ENDPOINTS.AUTH_GOOGLE.path);

      if (response.status === 401 && !isAuthEndpoint) {
        const storedRefreshToken = this.getRefreshToken();
        if (!storedRefreshToken || this.isTokenExpired(storedRefreshToken)) {
          this.accessToken = null;
          this.setRefreshToken(null);
          if (this.onSessionExpiredHandler) this.onSessionExpiredHandler();
          throw {
            status: 401,
            code: 'authentication_failed',
            detail: 'Session expired. Please sign in again.',
          } as ApiClientError;
        }

        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const refreshRes = await this.refreshToken(storedRefreshToken);
            this.accessToken = refreshRes.access;
            if (refreshRes.refresh) {
              this.setRefreshToken(refreshRes.refresh);
              diagnostics.setDifference('refreshHasRotatedToken', true);
            } else {
              diagnostics.setDifference('refreshHasRotatedToken', false);
            }
            this.isRefreshing = false;
            this.onTokenRefreshed(refreshRes.access);
          } catch (refreshErr) {
            this.isRefreshing = false;
            this.accessToken = null;
            this.setRefreshToken(null);
            if (this.onSessionExpiredHandler) this.onSessionExpiredHandler();
            throw refreshErr;
          }
        }

        // Wait for token refresh
        return new Promise<Response>((resolve, reject) => {
          this.addRefreshSubscriber(async (newToken) => {
            try {
              headers.set('Authorization', `Bearer ${newToken}`);
              const retried = await fetch(url, { ...options, headers });
              resolve(retried);
            } catch (err) {
              reject(err);
            }
          });
        });
      }

      return response;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if ((err as Error)?.name === 'AbortError') {
        throw {
          status: 408,
          code: 'request_timeout',
          detail: `Request to ${endpoint} timed out after ${timeoutMs}ms.`,
          isNetworkError: true,
        } as ApiClientError;
      }
      if ((err as ApiClientError)?.status) {
        throw err;
      }
      throw {
        status: 0,
        code: 'network_error',
        detail: `Network error connecting to backend at ${url}. Check server reachability and CORS.`,
        isNetworkError: true,
      } as ApiClientError;
    }
  }

  private async parseResponse<T>(
    endpoint: string,
    response: Response,
    schema?: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } }
  ): Promise<T> {
    const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || undefined;

    let rawJson: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        rawJson = JSON.parse(text);
      } catch {
        rawJson = text;
      }
    }

    if (!response.ok && !(endpoint === ENDPOINTS.HEALTH.path && response.status === 503)) {
      let detail = `Request failed with HTTP ${response.status}`;
      let code: string | undefined;
      let errors: Record<string, string[]> | undefined;
      let retryAfter: number | undefined;

      const retryAfterHeader = response.headers.get('retry-after');
      if (retryAfterHeader) {
        retryAfter = parseInt(retryAfterHeader, 10) || undefined;
      }

      if (rawJson && typeof rawJson === 'object') {
        const errorParse = ApiErrorResponseSchema.safeParse(rawJson);
        if (errorParse.success) {
          detail = errorParse.data.detail || errorParse.data.message || detail;
          code = errorParse.data.code;
          errors = errorParse.data.errors;
          if (errorParse.data.retry_after) retryAfter = errorParse.data.retry_after;
        }
      }

      throw {
        status: response.status,
        code,
        detail,
        errors,
        retryAfter,
        requestId,
      } as ApiClientError;
    }

    if (!schema) {
      return rawJson as T;
    }

    const parseResult = schema.safeParse(rawJson);
    if (!parseResult.success) {
      diagnostics.recordMismatch({
        endpoint,
        fieldPath: JSON.stringify((parseResult.error as { issues?: unknown[] })?.issues || 'schema mismatch'),
        expected: 'Valid contract schema',
        received: rawJson,
        rawPayload: rawJson,
      });
      // Do not crash: return raw payload as fallback
      return rawJson as T;
    }

    return parseResult.data as T;
  }

  // --- API Methods ---

  public async getHealth(): Promise<{
    status: 'healthy' | 'degraded';
    checks: {
      database?: { status: string; latency_ms?: number; error?: string };
      redis?: { status: string; latency_ms?: number; error?: string };
      celery?: { status: string; active_workers?: number; error?: string };
      model?: { status: string; version?: string; loaded_at?: string; error?: string };
    };
    timestamp?: string;
  }> {
    const res = await this.executeFetch(ENDPOINTS.HEALTH.path, { method: 'GET' });
    // Health endpoint can return 200 or 503 (both valid JSON body)
    return this.parseResponse(ENDPOINTS.HEALTH.path, res, HealthCheckResponseSchema);
  }

  public async login(credentials: { username?: string; email?: string; password?: string }): Promise<{
    access: string;
    refresh?: string;
    user?: User;
  }> {
    const payload: Record<string, string> = {};
    const field = authConfig.loginUsernameField;
    const identifier = credentials.username || credentials.email || '';
    payload[field] = identifier;
    payload.password = credentials.password || '';

    const res = await this.executeFetch(ENDPOINTS.AUTH_LOGIN.path, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const parsed = await this.parseResponse(ENDPOINTS.AUTH_LOGIN.path, res, LoginResponseSchema);
    this.setAccessToken(parsed.access);
    if (parsed.refresh) {
      this.setRefreshToken(parsed.refresh);
    }
    diagnostics.setDifference('loginField', field);
    return parsed;
  }

  public async googleLogin(credential: string): Promise<{
    access: string;
    refresh?: string;
    user: User;
    created?: boolean;
  }> {
    const res = await this.executeFetch(ENDPOINTS.AUTH_GOOGLE.path, {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });

    const parsed = await this.parseResponse(ENDPOINTS.AUTH_GOOGLE.path, res, GoogleLoginResponseSchema);
    this.setAccessToken(parsed.access);
    if (parsed.refresh) {
      this.setRefreshToken(parsed.refresh);
    }
    return parsed;
  }

  public async refreshToken(refreshTokenString?: string): Promise<{ access: string; refresh?: string }> {
    const token = refreshTokenString || this.getRefreshToken();
    if (!token) {
      throw {
        status: 401,
        code: 'authentication_failed',
        detail: 'No refresh token available.',
      } as ApiClientError;
    }

    const res = await this.executeFetch(ENDPOINTS.AUTH_REFRESH.path, {
      method: 'POST',
      body: JSON.stringify({ refresh: token }),
    });

    return this.parseResponse(ENDPOINTS.AUTH_REFRESH.path, res, RefreshResponseSchema);
  }

  public async getMe(): Promise<User> {
    const res = await this.executeFetch(ENDPOINTS.AUTH_ME.path, { method: 'GET' });
    return this.parseResponse(ENDPOINTS.AUTH_ME.path, res, UserSchema);
  }

  public async getAlerts(params: Record<string, string | number | undefined> = {}): Promise<{
    count: number;
    next?: string | null;
    previous?: string | null;
    results: UIAlertListItem[];
  }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') query.append(key, String(val));
    });
    const qs = query.toString();
    const path = `${ENDPOINTS.ALERTS_LIST.path}${qs ? `?${qs}` : ''}`;
    const res = await this.executeFetch(path, { method: 'GET' });
    const parsed = await this.parseResponse(path, res, PaginatedAlertsSchema);
    return {
      count: parsed.count,
      next: parsed.next,
      previous: parsed.previous,
      results: parsed.results.map(adaptAlertListItem),
    };
  }

  public async getAlertDetail(id: string): Promise<UIAlertDetail> {
    const path = buildPath(ENDPOINTS.ALERT_DETAIL.path, { id });
    const res = await this.executeFetch(path, { method: 'GET' });
    const parsed = await this.parseResponse(path, res, AlertDetailSchema);
    return adaptAlertDetail(parsed);
  }

  public async updateAlert(
    id: string,
    patch: { status?: string; resolution?: string | null; notes?: string | null }
  ): Promise<{ id: string; status: string; resolution?: string | null; notes?: string | null; updatedAt?: string }> {
    const path = buildPath(ENDPOINTS.ALERT_UPDATE.path, { id });
    const res = await this.executeFetch(path, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    const parsed = await this.parseResponse(path, res, AlertUpdateResponseSchema);
    return {
      id: parsed.id,
      status: parsed.status,
      resolution: parsed.resolution,
      notes: parsed.notes,
      updatedAt: parsed.updated_at,
    };
  }

  public async getStats(period = '24h'): Promise<UIAlertStats> {
    const path = `${ENDPOINTS.ALERTS_STATS.path}?period=${encodeURIComponent(period)}`;
    const res = await this.executeFetch(path, { method: 'GET' });
    const parsed = await this.parseResponse(path, res, AlertStatsSchema);
    return adaptAlertStats(parsed);
  }

  public async getModelsList(): Promise<{ activeVersion?: string; models: UIModelVersion[] }> {
    const res = await this.executeFetch(ENDPOINTS.MODELS_LIST.path, { method: 'GET' });
    const parsed = await this.parseResponse(ENDPOINTS.MODELS_LIST.path, res, ModelsListResponseSchema);
    return {
      activeVersion: parsed.active_version,
      models: parsed.models.map(adaptModelVersion),
    };
  }

  public async deployModel(version: string): Promise<{ version: string; status?: string; message?: string }> {
    const res = await this.executeFetch(ENDPOINTS.MODEL_DEPLOY.path, {
      method: 'POST',
      body: JSON.stringify({ version }),
    });
    return this.parseResponse(ENDPOINTS.MODEL_DEPLOY.path, res, DeployModelResponseSchema);
  }

  public async rollbackModel(version: string): Promise<{ version: string; status?: string; message?: string }> {
    const res = await this.executeFetch(ENDPOINTS.MODEL_ROLLBACK.path, {
      method: 'POST',
      body: JSON.stringify({ version }),
    });
    return this.parseResponse(ENDPOINTS.MODEL_ROLLBACK.path, res, RollbackModelResponseSchema);
  }

  public async getModelMetrics(): Promise<UIModelMetrics> {
    const res = await this.executeFetch(ENDPOINTS.METRICS_MODEL.path, { method: 'GET' });
    const parsed = await this.parseResponse(ENDPOINTS.METRICS_MODEL.path, res, ModelMetricsResponseSchema);
    return adaptModelMetrics(parsed);
  }

  public async getDriftMetrics(): Promise<UIDriftMetrics> {
    const res = await this.executeFetch(ENDPOINTS.METRICS_DRIFT.path, { method: 'GET' });
    const parsed = await this.parseResponse(ENDPOINTS.METRICS_DRIFT.path, res, DriftMetricsResponseSchema);
    return adaptDriftMetrics(parsed);
  }

  public async getAuditLogs(params: Record<string, string | number | undefined> = {}): Promise<{
    count: number;
    next?: string | null;
    previous?: string | null;
    results: AuditRecord[];
  }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') query.append(key, String(val));
    });
    const qs = query.toString();
    const path = `${ENDPOINTS.AUDIT_LOGS.path}${qs ? `?${qs}` : ''}`;
    const res = await this.executeFetch(path, { method: 'GET' });
    return this.parseResponse(path, res, PaginatedAuditRecordsSchema);
  }

  public async getThresholdsConfig(): Promise<UIThresholdsConfig> {
    const res = await this.executeFetch(ENDPOINTS.CONFIG_THRESHOLDS_GET.path, { method: 'GET' });
    const parsed = await this.parseResponse(ENDPOINTS.CONFIG_THRESHOLDS_GET.path, res, AlertThresholdsConfigSchema);
    return adaptThresholdsConfig(parsed);
  }

  public async updateThresholdsConfig(config: UIThresholdsConfig): Promise<UIThresholdsConfig> {
    const body = serializeThresholdsConfig(config, config.detectedKey);
    const res = await this.executeFetch(ENDPOINTS.CONFIG_THRESHOLDS_PUT.path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    const parsed = await this.parseResponse(ENDPOINTS.CONFIG_THRESHOLDS_PUT.path, res, AlertThresholdsConfigSchema);
    return adaptThresholdsConfig(parsed);
  }

  public async ingestSingle(flowData: Record<string, unknown>): Promise<IngestSingleResponse> {
    const res = await this.executeFetch(ENDPOINTS.INGEST_SINGLE.path, {
      method: 'POST',
      body: JSON.stringify(flowData),
    });
    return this.parseResponse(ENDPOINTS.INGEST_SINGLE.path, res, IngestSingleResponseSchema);
  }

  public async ingestBatch(file: File): Promise<IngestBatchResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await this.executeFetch(ENDPOINTS.INGEST_BATCH.path, {
      method: 'POST',
      body: formData,
    });
    return this.parseResponse(ENDPOINTS.INGEST_BATCH.path, res, IngestBatchResponseSchema);
  }

  public async getIngestTaskStatus(taskId: string): Promise<IngestTaskStatusResponse> {
    const path = buildPath(ENDPOINTS.INGEST_TASK_STATUS.path, { taskId });
    const res = await this.executeFetch(path, { method: 'GET' });
    return this.parseResponse(path, res, IngestTaskStatusResponseSchema);
  }

  public async startReplay(params: {
    dataset_path: string;
    records_per_second?: number;
    max_records?: number;
  }): Promise<ReplayStartResponse> {
    const res = await this.executeFetch(ENDPOINTS.INGEST_REPLAY_START.path, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return this.parseResponse(ENDPOINTS.INGEST_REPLAY_START.path, res, ReplayStartResponseSchema);
  }

  public async stopReplay(): Promise<ReplayStopResponse> {
    const res = await this.executeFetch(ENDPOINTS.INGEST_REPLAY_STOP.path, {
      method: 'POST',
    });
    return this.parseResponse(ENDPOINTS.INGEST_REPLAY_STOP.path, res, ReplayStopResponseSchema);
  }

  /**
   * Diagnostic helper: runs a single read-only GET test against an endpoint.
   */
  public async testEndpoint(
    endpoint: string,
    _role?: string
  ): Promise<{ status: number | 'NETWORK_ERROR' | 'CORS_ERROR'; latencyMs: number; passed: boolean; shapeMismatch?: string; errorDetail?: string }> {
    const start = performance.now();
    try {
      const res = await this.executeFetch(endpoint, { method: 'GET' }, 8000);
      const latencyMs = Math.round(performance.now() - start);
      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      // Check if 200/201 or 503 (for health)
      const passed = res.ok || (endpoint.includes(ENDPOINTS.HEALTH.path) && res.status === 503);
      return {
        status: res.status,
        latencyMs,
        passed,
        errorDetail: !passed ? (typeof parsed === 'object' && (parsed as { detail?: string })?.detail) || `HTTP ${res.status}` : undefined,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const errorObj = err as ApiClientError;
      return {
        status: errorObj.isNetworkError ? 'NETWORK_ERROR' : errorObj.status || 'NETWORK_ERROR',
        latencyMs,
        passed: false,
        errorDetail: errorObj.detail || 'Connection failed',
      };
    }
  }
}

export const api = new ApiClient();
