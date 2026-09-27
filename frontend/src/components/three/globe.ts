/**
 * Globe point cloud, attack arcs, and impact rings — the geometry and GLSL
 * behind the landing hero. Kept separate from the React components so the
 * math is readable on its own.
 */

import * as THREE from 'three'

/* ═══════════════════════════════════════════════════════════════════════
   Landmarks the arcs connect between. Real coordinates so the arc endpoints
   land in plausible places; the SOC reading is "attacks originating here".
   ═══════════════════════════════════════════════════════════════════════ */

export interface HubNode {
  id: string
  city: string
  country: string
  lat: number
  lon: number
  /** Relative share of outbound attacks — big hubs glow brighter. */
  weight: number
}

export const NODES: HubNode[] = [
  { id: 'nyc', city: 'New York', country: 'US', lat: 40.71, lon: -74.01, weight: 1 },
  { id: 'lhr', city: 'London', country: 'GB', lat: 51.51, lon: -0.13, weight: 0.95 },
  { id: 'fra', city: 'Frankfurt', country: 'DE', lat: 50.11, lon: 8.68, weight: 0.8 },
  { id: 'dxb', city: 'Dubai', country: 'AE', lat: 25.2, lon: 55.27, weight: 0.55 },
  { id: 'sgr', city: 'Singapore', country: 'SG', lat: 1.35, lon: 103.82, weight: 0.9 },
  { id: 'nrt', city: 'Tokyo', country: 'JP', lat: 35.68, lon: 139.69, weight: 0.85 },
  { id: 'syd', city: 'Sydney', country: 'AU', lat: -33.87, lon: 151.21, weight: 0.5 },
  { id: 'cpt', city: 'Cape Town', country: 'ZA', lat: -33.92, lon: 18.42, weight: 0.3 },
  { id: 'gru', city: 'São Paulo', country: 'BR', lat: -23.55, lon: -46.63, weight: 0.6 },
  { id: 'yyz', city: 'Toronto', country: 'CA', lat: 43.65, lon: -79.38, weight: 0.5 },
  { id: 'svo', city: 'Moscow', country: 'RU', lat: 55.75, lon: 37.62, weight: 0.7 },
  { id: 'bom', city: 'Mumbai', country: 'IN', lat: 19.08, lon: 72.88, weight: 0.65 },
]

/** Picks a node, weighted so busy hubs appear more often. */
export function weightedNode(random: number): HubNode {
  const total = NODES.reduce((s, n) => s + n.weight, 0)
  let acc = random * total
  for (const n of NODES) {
    acc -= n.weight
    if (acc <= 0) return n
  }
  return NODES[0]
}

/**
 * mulberry32 — a small deterministic PRNG. Using a seeded generator rather
 * than Math.random keeps the starfield identical across remounts, so the hero
 * does not visibly reshuffle when React re-renders it.
 */
export function makeRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Fibonacci sphere — even point distribution, no polar clustering
   ═══════════════════════════════════════════════════════════════════════ */

export function fibonacciSphere(count: number, radius: number): {
  positions: Float32Array
  seeds: Float32Array
} {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const golden = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    positions[i * 3] = Math.cos(theta) * r * radius
    positions[i * 3 + 1] = y * radius
    positions[i * 3 + 2] = Math.sin(theta) * r * radius
    // Pseudo-random per-point phase without pulling in a PRNG dependency.
    seeds[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1
  }
  return { positions, seeds }
}

/* ═══════════════════════════════════════════════════════════════════════
   Attack arcs — great-circle path with an altitude bump
   ═══════════════════════════════════════════════════════════════════════ */

export function buildArc(
  from: THREE.Vector3,
  to: THREE.Vector3,
  segments = 72,
  height = 0.26,
): { positions: Float32Array; ts: Float32Array } {
  const positions = new Float32Array((segments + 1) * 3)
  const ts = new Float32Array(segments + 1)
  const fromN = from.clone().normalize()
  const toN = to.clone().normalize()
  const baseRadius = from.length()
  const angle = fromN.angleTo(toN)

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    // Spherical interpolation between the two unit vectors.
    const sinAngle = Math.sin(angle) || 1e-6
    const a = Math.sin((1 - t) * angle) / sinAngle
    const b = Math.sin(t * angle) / sinAngle
    const p = fromN.clone().multiplyScalar(a).add(toN.clone().multiplyScalar(b))
    // Bulge the midpoint away from the surface so the arc reads as a hop.
    const lift = 1 + height * Math.sin(Math.PI * t) * (0.4 + angle)
    p.normalize().multiplyScalar(baseRadius * lift)
    positions[i * 3] = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
    ts[i] = t
  }
  return { positions, ts }
}

export function sampleArc(arc: { positions: Float32Array }, t: number): THREE.Vector3 {
  const n = arc.positions.length / 3 - 1
  const i = Math.max(0, Math.min(n - 1, Math.round(t * n)))
  return new THREE.Vector3(arc.positions[i * 3], arc.positions[i * 3 + 1], arc.positions[i * 3 + 2])
}

/* ═══════════════════════════════════════════════════════════════════════
   Shaders
   ═══════════════════════════════════════════════════════════════════════ */

export const GLOBE_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uScan;
  varying float vSeed;
  varying float vFres;
  varying float vBand;
  varying float vY;

  void main() {
    vSeed = aSeed;
    vY = position.y;

    // Slow twinkle so the surface never looks static.
    float tw = 0.55 + 0.45 * sin(uTime * 0.9 + aSeed * 24.0);
    // Bright band that sweeps the globe pole to pole.
    vBand = exp(-pow((position.y - uScan) * 7.0, 2.0));

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vec3 v = normalize(-mv.xyz);
    vFres = pow(1.0 - max(dot(n, v), 0.0), 2.3);

    gl_PointSize = uSize * (0.8 + tw * 0.45 + vBand * 0.7) * (260.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

export const GLOBE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uOpacity;
  uniform vec3 uColorBase;
  uniform vec3 uColorHot;
  varying float vSeed;
  varying float vFres;
  varying float vBand;
  varying float vY;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.06, d);

    vec3 col = mix(uColorBase, uColorHot, clamp(vBand * 1.25, 0.0, 1.0));
    col += uColorHot * vBand * 0.55;
    // Slightly brighter toward the equator, like a real terminator glow.
    col *= 0.82 + 0.28 * (1.0 - abs(vY));

    float a = soft * (0.16 + vFres * 0.84) * uOpacity;
    a += soft * vBand * 0.35 * uOpacity;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`

export const ARC_VERT = /* glsl */ `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const ARC_FRAG = /* glsl */ `
  precision highp float;
  uniform float uHead;
  uniform float uTail;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vT;

  void main() {
    // Bright leading edge travelling along the arc.
    float lead = exp(-pow((vT - uHead) * 26.0, 2.0));
    // Fading comet tail behind it.
    float inTail = step(vT, uHead) * step(uHead - uTail, vT);
    float fade = 1.0 - smoothstep(uHead - uTail, uHead, vT);

    float a = (inTail * fade * 0.34 + lead * 0.95) * uOpacity;
    vec3 col = mix(uColor, vec3(1.0), lead * 0.55);
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`

export const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vTw = 0.4 + 0.6 * sin(uTime * 0.6 + aSeed * 30.0);
    gl_PointSize = aSize * uPixelRatio * vTw;
    gl_Position = projectionMatrix * mv;
  }
`

export const STAR_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTw;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, soft * vTw * uOpacity);
  }
`

/* ═══════════════════════════════════════════════════════════════════════
   Impact ring — expands and fades where an arc lands
   ═══════════════════════════════════════════════════════════════════════ */

export const RING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const RING_FRAG = /* glsl */ `
  precision mediump float;
  uniform float uProgress;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    // A thin annulus whose radius grows with progress.
    float r = length(vUv - 0.5) * 2.0;
    float edge = smoothstep(uProgress, uProgress - 0.22, r) * smoothstep(uProgress - 0.44, uProgress - 0.2, r);
    float a = edge * (1.0 - uProgress) * 0.95;
    if (a < 0.006) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

export const ATMO_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vViewW = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const ATMO_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewW)), 0.0), uPower);
    gl_FragColor = vec4(uColor, f * uIntensity);
  }
`

/* ═══════════════════════════════════════════════════════════════════════
   Halo sprite texture for arc heads (radial gradient, generated once)
   ═══════════════════════════════════════════════════════════════════════ */

let haloTexture: THREE.Texture | null = null

export function getHaloTexture(): THREE.Texture {
  if (haloTexture) return haloTexture
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  haloTexture = new THREE.CanvasTexture(canvas)
  return haloTexture
}
