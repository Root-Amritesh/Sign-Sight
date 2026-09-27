/** Motion preferences, shared by the 3D scene and CSS-driven animation. */

import { useEffect, useState, useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotion(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * True when the viewer asked the OS to reduce motion.
 *
 * Reads through useSyncExternalStore so the value stays in sync when the
 * preference is toggled while the page is open — reading matchMedia during
 * render alone would only ever sample it at mount.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, () => false)
}

/**
 * True while the element is anywhere near the viewport. Used to stop the
 * globe's render loop when the hero is scrolled out of view — a WebGL context
 * that keeps drawing an invisible canvas is pure battery burn.
 */
export function useNearViewport(ref: React.RefObject<Element | null>, margin = '200px'): boolean {
  const [near, setNear] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])

  return near
}

/** True while the tab is visible. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
