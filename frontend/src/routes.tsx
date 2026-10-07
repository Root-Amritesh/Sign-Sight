/**
 * Route table and guards.
 *
 * The auth split is deliberate: anything a SOC analyst can see lives under
 * `/app`, and the admin-only routes are checked here rather than in each page
 * so a new page cannot accidentally ship unguarded.
 */

import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { AppShell } from './components/layout/AppShell'
import { BrandMark } from './components/ui/Icon'
import { Button } from './components/ui'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Alerts } from './pages/Alerts'
import { AlertDetail } from './pages/AlertDetail'
import { ModelHealth } from './pages/ModelHealth'
import { Drift } from './pages/Drift'
import { ModelRegistry } from './pages/ModelRegistry'
import { Ingest } from './pages/Ingest'
import { AuditLog } from './pages/AuditLog'
import { Settings } from './pages/Settings'
import { NotFound } from './pages/NotFound'

/** Full-screen boot state shown while the session probe runs. */
function Booting() {
  return (
    <div className="boot">
      <BrandMark size={40} />
      <span className="micro">Establishing session</span>
    </div>
  )
}

/** Requires any authenticated user. */
function RequireAuth() {
  const { user, initialising } = useAuth()
  const location = useLocation()

  if (initialising) return <Booting />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Requires the admin role. Analysts get a 403 rather than a redirect. */
function RequireAdmin() {
  const { user, initialising, isAdmin } = useAuth()

  if (initialising) return <Booting />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Forbidden />
  return <Outlet />
}

function Forbidden() {
  return (
    <div className="page">
      <div className="empty" style={{ marginTop: '4rem' }}>
        <div className="empty-glyph" style={{ color: 'var(--danger)' }}>
          403
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-md)' }}>
          Administrator role required
        </div>
        <div style={{ fontSize: 'var(--fs-sm)' }}>
          Model deployment, the audit log, and threshold configuration are restricted to
          administrators. Ask an admin to grant the role, or sign in with an admin account.
        </div>
        <a href="/app">
          <Button icon="arrowRight">Back to dashboard</Button>
        </a>
      </div>
    </div>
  )
}

/** Public routes bounce a signed-in visitor straight to the dashboard. */
function PublicOnly() {
  const { user, initialising } = useAuth()
  if (initialising) return <Booting />
  if (user) return <Navigate to="/app" replace />
  return <Outlet />
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="alerts/:id" element={<AlertDetail />} />
          <Route path="ingest" element={<Ingest />} />
          <Route path="model" element={<ModelHealth />} />
          <Route path="drift" element={<Drift />} />
          <Route element={<RequireAdmin />}>
            <Route path="models" element={<ModelRegistry />} />
            <Route path="audit" element={<AuditLog />} />
          </Route>
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
