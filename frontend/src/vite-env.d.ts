/// <reference types="vite/client" />

/** Import-meta env typing. */

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_MOCK?: string
  readonly VITE_PROXY_TARGET?: string
  readonly VITE_ALERT_POLL_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
