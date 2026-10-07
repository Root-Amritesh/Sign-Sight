/** React Query setup + the polling cadences from API_SPEC.md §2. */

import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

/**
 * API_SPEC.md §2 recommends short polling (3–5s) over WebSockets for this
 * build: alerts are a one-way server→client flow and polling needs no extra
 * infrastructure. That decision lives here in one constant.
 */
export const POLL_MS = Number(import.meta.env.VITE_ALERT_POLL_MS ?? 5000)

/** Slower cadence for panels that change rarely. */
export const SLOW_POLL_MS = 30_000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // Never retry auth or permission failures — they will not resolve.
        if (error instanceof ApiError && (error.isAuth || error.isForbidden)) return false
        // A 503 means no model is loaded; that is a state, not a blip.
        if (error instanceof ApiError && error.isModelUnavailable) return false
        return failureCount < 2
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
    },
    mutations: { retry: false },
  },
})

/* ── Query key factory ────────────────────────────────────────────── */

export const qk = {
  me: ['auth', 'me'] as const,
  health: ['health'] as const,
  alertStats: (period: string) => ['alerts', 'stats', period] as const,
  alerts: (filters: unknown) => ['alerts', 'list', filters] as const,
  alert: (id: string) => ['alerts', 'detail', id] as const,
  feed: (since: string | null) => ['alerts', 'feed', since] as const,
  modelMetrics: ['metrics', 'model'] as const,
  drift: ['metrics', 'drift'] as const,
  models: ['models', 'list'] as const,
  task: (id: string) => ['ingest', 'task', id] as const,
  audit: (filters: unknown) => ['audit', 'list', filters] as const,
  thresholds: ['config', 'thresholds'] as const,
}
