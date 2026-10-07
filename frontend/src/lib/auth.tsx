/**
 * Auth context: JWT in localStorage, profile fetched from `GET /auth/me/`.
 *
 * The session probe is a React Query rather than a hand-rolled effect so
 * loading, error, and retry states are handled once, in one place. A 401
 * anywhere in the app (via `subscribeUnauthorized`) drops the session and
 * sends the user back to /login.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, tokenStore, subscribeUnauthorized, USE_MOCK, type Role, type User } from './api'
import { qk } from './query'

interface AuthState {
  user: User | null
  /** True until the initial session probe finishes. */
  initialising: boolean
  isAdmin: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * Whether a session exists at all, read once at mount. In mock mode the
 * username is kept in sessionStorage; against the real API the presence of an
 * access token is enough to justify the probe.
 */
function detectSession(): boolean {
  if (USE_MOCK) return Boolean(sessionStorage.getItem('signsight.mockUser'))
  return Boolean(tokenStore.access || tokenStore.refresh)
}

function clearSession() {
  tokenStore.clear()
  if (USE_MOCK) sessionStorage.removeItem('signsight.mockUser')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  // `false` for a signed-out visitor, so the probe never fires for them.
  const [hasSession, setHasSession] = useState(detectSession)

  const probe = useQuery({
    queryKey: qk.me,
    queryFn: ({ signal }) => api.auth.me(signal),
    enabled: hasSession,
    staleTime: 60_000,
    retry: false,
  })

  // A rejected probe means the stored credentials are no longer good. The
  // state change happens during render (React's documented alternative to a
  // syncing effect); the effect below only touches the token store.
  if (hasSession && probe.isError) setHasSession(false)

  useEffect(() => {
    if (probe.isError) clearSession()
  }, [probe.isError])

  // Any 401 refresh failure ends the session.
  useEffect(
    () =>
      subscribeUnauthorized(() => {
        clearSession()
        setHasSession(false)
      }),
    [setHasSession],
  )

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.auth.login({ username, password })
      tokenStore.set(res.access, res.refresh)
      if (USE_MOCK) sessionStorage.setItem('signsight.mockUser', res.user.username)
      setHasSession(true)
      // Seed the cache so the shell has a profile on the very first render.
      queryClient.setQueryData(qk.me, res.user)
      return res.user
    },
    [queryClient, setHasSession],
  )

  const logout = useCallback(() => {
    clearSession()
    setHasSession(false)
    queryClient.removeQueries({ queryKey: qk.me })
  }, [queryClient, setHasSession])

  const user = probe.data ?? null
  const initialising = hasSession && probe.isPending

  const value = useMemo<AuthState>(
    () => ({
      user,
      initialising,
      isAdmin: user?.role === 'admin',
      login,
      logout,
      hasRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    }),
    [user, initialising, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
