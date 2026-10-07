/**
 * The signed-in shell: fixed sidebar, sticky top bar, page frame.
 *
 * Navigation comes from `src/nav.ts`, so adding a page means adding one
 * entry there and one route in `src/routes.tsx`.
 */

import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { POLL_MS, qk } from '../../lib/query'
import { useAuth } from '../../lib/auth'
import { initials, num } from '../../lib/format'
import { NAV, SETTINGS_ITEM, titleFor, type NavItem } from '../../nav'
import { BrandMark, Icon } from '../ui/Icon'

const GROUP_LABELS = ['Operations', 'Intelligence', 'Administration'] as const

/** Remounts the routed page on every navigation so entry animations replay. */
function AnimatedOutlet() {
  const { pathname } = useLocation()
  return <Outlet key={pathname} />
}

export function AppShell() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  const { data: stats } = useQuery({
    queryKey: qk.alertStats('24h'),
    queryFn: ({ signal }) => api.alerts.stats('24h', signal),
    refetchInterval: POLL_MS,
    staleTime: POLL_MS,
  })

  const { data: health } = useQuery({
    queryKey: qk.health,
    queryFn: ({ signal }) => api.metrics.health(signal),
    refetchInterval: 30_000,
  })

  const openCount = stats?.by_status?.new ?? 0
  const healthState = health?.status ?? 'degraded'
  const groups = groupNav(isAdmin)

  return (
    <div className="app">
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

      <aside className="nav" data-open={navOpen}>
        <Link to="/app" className="nav-brand">
          <BrandMark size={24} />
          <span className="brand-name">
            Sign<em>Sight</em>
          </span>
        </Link>

        <nav className="nav-scroll">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const count = item.id === 'alerts' && openCount > 0 ? openCount : null
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.end}
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                  >
                    <Icon name={item.icon} size={15} />
                    <span>{item.label}</span>
                    {count !== null && (
                      <span className="nav-count nav-count-alert">{num(count)}</span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="nav-foot">
          <NavLink
            to={SETTINGS_ITEM.to}
            onClick={() => setNavOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            <Icon name={SETTINGS_ITEM.icon} size={15} />
            <span>{SETTINGS_ITEM.label}</span>
          </NavLink>
          <button
            type="button"
            className="nav-item"
            style={{ width: '100%', cursor: 'pointer' }}
            onClick={() => {
              setNavOpen(false)
              logout()
              navigate('/login', { replace: true })
            }}
          >
            <Icon name="logout" size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <button
            type="button"
            className="btn btn-ghost btn-sm nav-toggle"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
          >
            <Icon name="menu" size={16} />
          </button>

          <div className="top-title">
            <h1>{titleFor(location.pathname)}</h1>
            <span className="micro">
              {isAdmin ? 'Administrator' : 'Analyst'} · {user?.username ?? '—'}
            </span>
          </div>

          <div className="top-tools">
            <span
              className={`health-pill health-pill-${
                healthState === 'healthy' ? 'up' : healthState === 'degraded' ? 'degraded' : 'down'
              }`}
            >
              <span className="pulse-dot" style={{ color: 'currentColor' }} />
              {healthState === 'healthy'
                ? 'Model ready'
                : healthState === 'degraded'
                  ? 'Degraded'
                  : 'No model'}
            </span>

            <Link to="/app/alerts" className="btn btn-ghost btn-sm" aria-label="Alerts">
              <Icon name="bell" size={15} />
              {openCount > 0 && <span className="nav-count nav-count-alert">{num(openCount)}</span>}
            </Link>

            <div className="who">
              <span className="avatar">{initials(user?.username)}</span>
              <span className="mono who-name">{user?.username}</span>
            </div>
          </div>
        </header>

        <AnimatedOutlet />
      </div>
    </div>
  )
}

function groupNav(isAdmin: boolean): Array<{ label: string; items: NavItem[] }> {
  const visible = NAV.filter((n) => !n.standalone && (!n.adminOnly || isAdmin))
  return GROUP_LABELS.map((label, index) => ({
    label,
    items: visible.filter((n) => n.group === index),
  })).filter((g) => g.items.length > 0)
}
