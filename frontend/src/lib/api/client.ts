/**
 * HTTP client for the SignSight REST API (API_SPEC.md / D9).
 *
 * Responsibilities:
 *  - prefix the base URL
 *  - attach the JWT bearer token
 *  - transparently refresh an expired access token (single-flight, so N
 *    concurrent 401s trigger exactly one refresh call)
 *  - normalise every failure into an `ApiError` that carries the documented
 *    `{ detail, code, errors }` body plus the HTTP status
 */

import type { ApiErrorBody } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: Record<string, string[]> | undefined
  readonly body: unknown

  constructor(status: number, body: unknown, fallback: string) {
    const parsed = (body ?? {}) as ApiErrorBody
    super(typeof parsed.detail === 'string' ? parsed.detail : fallback)
    this.name = 'ApiError'
    this.status = status
    this.code = typeof parsed.code === 'string' ? parsed.code : `http_${status}`
    this.errors = parsed.errors
    this.body = body
  }

  /** Field-level messages from a 400, ready to drop into form state. */
  get fieldErrors(): Record<string, string[]> {
    return this.errors ?? {}
  }

  get isAuth(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  /** 503 with no model loaded — ingestion degrades but does not crash. */
  get isModelUnavailable(): boolean {
    return this.status === 503
  }
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '')

const ACCESS_KEY = 'signsight.access'
const REFRESH_KEY = 'signsight.refresh'

/** Listeners notified when a refresh fails, so the app can bounce to /login. */
const onUnauthorized = new Set<() => void>()

export function subscribeUnauthorized(fn: () => void): () => void {
  onUnauthorized.add(fn)
  return () => onUnauthorized.delete(fn)
}

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh?: string): void {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Send a FormData body as-is (batch CSV upload). */
  formData?: FormData
  signal?: AbortSignal
  /** Internal: prevents infinite refresh recursion. */
  _isRetry?: boolean
  /** Skip the Authorization header (login, health). */
  anonymous?: boolean
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** In-flight refresh promise, so parallel 401s share one round trip. */
let refreshInFlight: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokenStore.refresh
  if (!refresh) return false

  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
      if (!res.ok) {
        tokenStore.clear()
        return false
      }
      const data = (await res.json()) as { access: string; refresh?: string }
      tokenStore.set(data.access, data.refresh ?? refresh)
      return true
    } catch {
      return false
    } finally {
      // Cleared on the next tick so awaiting callers all observe the result.
      setTimeout(() => {
        refreshInFlight = null
      }, 0)
    }
  })()

  return refreshInFlight
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, signal, _isRetry = false, anonymous = false } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (!anonymous) {
    const access = tokenStore.access
    if (access) headers.Authorization = `Bearer ${access}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    signal,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  })

  if (res.status === 401 && !_isRetry && !anonymous) {
    const ok = await refreshAccessToken()
    if (ok) return request<T>(path, { ...options, _isRetry: true })
    tokenStore.clear()
    onUnauthorized.forEach((fn) => fn())
    throw new ApiError(401, await parseBody(res), 'Session expired. Sign in again.')
  }

  const payload = await parseBody(res)

  if (!res.ok) {
    throw new ApiError(res.status, payload, `Request failed with status ${res.status}`)
  }

  return payload as T
}

/** Serialises filters into a query string, dropping empty values. */
export function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      // The API takes comma-separated lists: ?severity=critical,high
      if (value.length) search.set(key, value.join(','))
    } else if (typeof value === 'number' && !Number.isFinite(value)) {
      continue
    } else {
      search.set(key, String(value))
    }
  }
  const str = search.toString()
  return str ? `?${str}` : ''
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown, opts?: { anonymous?: boolean }) =>
    request<T>(path, { method: 'POST', body, ...opts }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', formData }),
}
