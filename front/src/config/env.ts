/**
 * Environment configuration for SignSight Frontend.
 * This is the ONLY file that reads import.meta.env.
 */

export interface EnvConfig {
  apiBaseUrl: string;
  devProxyTarget: string;
  googleClientId?: string;
  pollIntervalMs: number;
  apiVersionPrefix: string;
}

function resolveEnv(): EnvConfig {
  const env = import.meta.env;

  const apiBaseUrl = (env.VITE_API_BASE_URL as string) || '/api';
  const devProxyTarget = (env.VITE_DEV_PROXY_TARGET as string) || 'http://localhost:8000';
  const googleClientId = (env.VITE_GOOGLE_CLIENT_ID as string) || undefined;
  const pollIntervalMs = Number(env.VITE_POLL_INTERVAL_MS) || 5000;
  const apiVersionPrefix = (env.VITE_API_VERSION_PREFIX as string) || '';

  return {
    apiBaseUrl,
    devProxyTarget,
    googleClientId,
    pollIntervalMs,
    apiVersionPrefix,
  };
}

export const env: EnvConfig = resolveEnv();

/**
 * Validates critical environment configuration.
 * Returns an array of error messages if invalid.
 */
export function validateEnv(): string[] {
  const errors: string[] = [];
  if (!env.apiBaseUrl) {
    errors.push('VITE_API_BASE_URL is not set.');
  }
  if (isNaN(env.pollIntervalMs) || env.pollIntervalMs < 1000) {
    errors.push('VITE_POLL_INTERVAL_MS must be a number >= 1000.');
  }
  return errors;
}
