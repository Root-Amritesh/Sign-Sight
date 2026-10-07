import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../api/client';

describe('SignSight ApiClient Core Contract Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.clearAuth();
    vi.restoreAllMocks();
  });

  it('manages JWT access token in memory and refresh token in sessionStorage', () => {
    api.setTokens('access-jwt-123', 'refresh-token-456');
    expect(api.getAccessToken()).toBe('access-jwt-123');
    expect(sessionStorage.getItem('signsight_refresh_token')).toBe('refresh-token-456');

    api.clearAuth();
    expect(api.getAccessToken()).toBeNull();
    expect(sessionStorage.getItem('signsight_refresh_token')).toBeNull();
  });

  it('throws ApiClientError with normalized status and detail on non-200 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({ detail: 'Admin privileges required to rollback model.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    });

    await expect(api.rollbackModel('v1')).rejects.toMatchObject({
      status: 403,
      detail: 'Admin privileges required to rollback model.',
    });
  });

  it('returns valid Degraded health state on HTTP 503 instead of crashing with network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          status: 'degraded',
          checks: { database: 'ok', redis: 'error', celery: 'ok', model: 'ok' },
          timestamp: '2026-10-03T12:00:00Z',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const health = await api.getHealth();
    expect(health.status).toBe('degraded');
    expect(health.checks.redis?.status).toBe('error');
  });
});
