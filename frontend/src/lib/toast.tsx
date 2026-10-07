/** Lightweight toast queue for mutation feedback (resolve, deploy, replay…). */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiError } from './api'

export type ToastKind = 'info' | 'ok' | 'warn' | 'error'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  body?: string
}

interface ToastApi {
  push: (kind: ToastKind, title: string, body?: string) => void
  ok: (title: string, body?: string) => void
  info: (title: string, body?: string) => void
  warn: (title: string, body?: string) => void
  error: (title: string, body?: string) => void
  /** Turns an ApiError into a human-readable toast. */
  fromError: (error: unknown, title?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const GLYPH: Record<ToastKind, string> = {
  info: '›',
  ok: '✓',
  warn: '!',
  error: '✕',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, title: string, body?: string) => {
      seq.current += 1
      const id = seq.current
      setToasts((prev) => [...prev.slice(-3), { id, kind, title, body }])
      window.setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4200)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      push,
      ok: (title, body) => push('ok', title, body),
      info: (title, body) => push('info', title, body),
      warn: (title, body) => push('warn', title, body),
      error: (title, body) => push('error', title, body),
      fromError: (error, title = 'Request failed') => {
        if (error instanceof ApiError) {
          // Prefer the field-level detail when the API sent one.
          const fieldDetail = error.errors
            ? Object.entries(error.errors)
                .slice(0, 2)
                .map(([field, msgs]) => `${field}: ${msgs.join(' ')}`)
                .join(' · ')
            : ''
          const body = fieldDetail || error.message
          const kind = error.status >= 500 ? 'error' : error.status >= 400 ? 'warn' : 'info'
          push(kind, error.code === 'authentication_failed' ? 'Authentication failed' : title, body)
          return
        }
        if (error instanceof Error) {
          push('error', title, error.message)
          return
        }
        push('error', title, String(error))
      },
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismiss(t.id)}>
            <span
              className="mono"
              style={{ color: `var(--${t.kind === 'ok' ? 'ok' : t.kind === 'error' ? 'danger' : t.kind === 'warn' ? 'warn' : 'cyan'})` }}
            >
              {GLYPH[t.kind]}
            </span>
            <div className="grow">
              <div className="toast-title">{t.title}</div>
              {t.body && <div className="toast-body">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
