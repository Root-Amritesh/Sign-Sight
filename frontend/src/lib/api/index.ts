/**
 * Single import point for the API layer.
 *
 * `VITE_USE_MOCK=true`  → in-browser mock (no backend needed)
 * `VITE_USE_MOCK=false` → real Django/DRF API at VITE_API_BASE_URL
 *
 * The surface is identical either way, so no page or component ever branches
 * on which backend is live.
 */

import { httpApi, type SignSightApi } from './endpoints'
import { mockApi } from './mock'

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'

export const api: SignSightApi = USE_MOCK ? (mockApi as unknown as SignSightApi) : httpApi

export { ApiError, tokenStore, subscribeUnauthorized } from './client'
export type * from './types'
export type { SignSightApi } from './endpoints'
