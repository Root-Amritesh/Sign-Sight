/**
 * Lazy wrapper around the WebGL globe.
 *
 * three.js and react-three-fiber are ~900 kB gzipped over 200 kB. The SOC
 * console never needs them, so the scene is split out and only downloaded when
 * a page that actually shows a globe mounts. Until then the wrapper renders
 * nothing — the canvas sits on a dark background either way, so there is no
 * visible pop-in beyond the scene appearing a moment later.
 */

import { Suspense, lazy } from 'react'
import type { GlobeSceneProps } from './GlobeScene'

const GlobeScene = lazy(() => import('./GlobeScene').then((m) => ({ default: m.GlobeScene })))

export function LazyGlobe(props: GlobeSceneProps) {
  return (
    <Suspense fallback={null}>
      <GlobeScene {...props} />
    </Suspense>
  )
}

export type { GlobeSceneProps, AttackEvent } from './GlobeScene'
