/** The single source of truth for sidebar navigation and page titles. */

import type { IconName } from './components/ui/Icon'

export interface NavItem {
  id: string
  to: string
  label: string
  icon: IconName
  /** `end` makes the link inactive on nested routes. */
  end?: boolean
  /**
   * Sidebar group: 0 = Operations, 1 = Intelligence, 2 = Administration.
   * Admin-only routes are filtered out for analysts.
   */
  group: 0 | 1 | 2
  adminOnly?: boolean
  /**
   * Listed here for `titleFor()` and role filtering, but rendered in the nav
   * footer rather than as a grouped item. Every role can reach it.
   */
  standalone?: boolean
}

export const NAV: NavItem[] = [
  { id: 'dashboard', to: '/app', label: 'Dashboard', icon: 'grid', group: 0, end: true },
  { id: 'alerts', to: '/app/alerts', label: 'Alerts', icon: 'bell', group: 0 },
  { id: 'ingest', to: '/app/ingest', label: 'Ingest', icon: 'ingest', group: 0 },
  { id: 'model', to: '/app/model', label: 'Model health', icon: 'pulse', group: 1 },
  { id: 'drift', to: '/app/drift', label: 'Drift', icon: 'drift', group: 1 },
  { id: 'models', to: '/app/models', label: 'Model registry', icon: 'model', group: 2, adminOnly: true },
  { id: 'audit', to: '/app/audit', label: 'Audit log', icon: 'audit', group: 2, adminOnly: true },
  {
    id: 'settings',
    to: '/app/settings',
    label: 'Settings',
    icon: 'sliders',
    group: 2,
    standalone: true,
  },
]

/** The footer entry every signed-in role can open. */
export const SETTINGS_ITEM: NavItem = NAV[NAV.length - 1]

/** Page heading for the top bar, matched against the current pathname. */
export function titleFor(pathname: string): string {
  const exact = NAV.find((n) => n.to === pathname)
  if (exact) return exact.label
  const parent = NAV.filter((n) => n.to !== '/app').find((n) => pathname.startsWith(`${n.to}/`))
  if (parent) return parent.label
  return pathname === '/app' ? 'Dashboard' : 'SignSight'
}
