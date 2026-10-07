/**
 * The landing hero: a point-cloud threat globe with live attack arcs.
 *
 * Built with three.js via @react-three/fiber. Arcs are simulated, not real —
 * but they are driven by the same attack classes, severities, and hub
 * geography the SOC sees, so the landing page and the dashboard are telling
 * the same story.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  ARC_FRAG,
  ARC_VERT,
  ATMO_FRAG,
  ATMO_VERT,
  GLOBE_FRAG,
  GLOBE_VERT,
  NODES,
  RING_FRAG,
  RING_VERT,
  STAR_FRAG,
  STAR_VERT,
  buildArc,
  fibonacciSphere,
  getHaloTexture,
  latLonToVec3,
  makeRandom,
  sampleArc,
  weightedNode,
  type HubNode,
} from './globe'

/* ═══════════════════════════════════════════════════════════════════════
   Tunables
   ═══════════════════════════════════════════════════════════════════════ */

export type AttackClass = 'dos' | 'probe' | 'r2l' | 'u2r'

export interface AttackEvent {
  id: number
  from: HubNode
  to: HubNode
  label: AttackClass
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
}

const CLASS_COLOR: Record<AttackClass, string> = {
  dos: '#ff2d55',
  probe: '#f59e0b',
  r2l: '#a855f7',
  u2r: '#22d3ee',
}

const CLASS_WEIGHTS: Array<[AttackClass, number]> = [
  ['dos', 0.42],
  ['probe', 0.3],
  ['r2l', 0.19],
  ['u2r', 0.09],
]

const RADIUS = 1

/** Arc pool size. Each slot is a line + head sprite + impact ring. */
const SLOTS = 9

function pickClass(): AttackClass {
  const roll = Math.random()
  let acc = 0
  for (const [c, w] of CLASS_WEIGHTS) {
    acc += w
    if (roll <= acc) return c
  }
  return 'dos'
}

function severityFor(confidence: number): AttackEvent['severity'] {
  if (confidence >= 0.95) return 'critical'
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.7) return 'medium'
  return 'low'
}

/* ═══════════════════════════════════════════════════════════════════════
   Globe point cloud
   ═══════════════════════════════════════════════════════════════════════ */

function GlobePoints({
  count,
  radius,
  size,
  opacity = 1,
  spin,
}: {
  count: number
  radius: number
  size: number
  opacity?: number
  spin: number
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const groupRef = useRef<THREE.Group>(null)

  const { positions, seeds } = useMemo(() => fibonacciSphere(count, radius), [count, radius])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size },
      uScan: { value: -radius },
      uOpacity: { value: opacity },
      uColorBase: { value: new THREE.Color('#2e7f96') },
      uColorHot: { value: new THREE.Color('#5fe6ff') },
    }),
    [size, opacity, radius],
  )

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta
      // Sweep the scan band bottom to top, then restart.
      const u = matRef.current.uniforms
      u.uScan.value += delta * 0.55
      if (u.uScan.value > radius * 1.15) u.uScan.value = -radius * 1.15
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * spin
    }
  })

  return (
    <group ref={groupRef}>
      {/* Inner shell: occludes the far side so the globe reads as a sphere. */}
      <mesh>
        <sphereGeometry args={[radius * 0.995, 48, 32]} />
        <meshBasicMaterial color="#04070e" transparent opacity={0.94} />
      </mesh>

      {/* Faint wireframe for structure. */}
      <mesh>
        <sphereGeometry args={[radius * 1.001, 28, 18]} />
        <meshBasicMaterial
          color="#1d4a5c"
          wireframe
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={GLOBE_VERT}
          fragmentShader={GLOBE_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Atmosphere halo
   ═══════════════════════════════════════════════════════════════════════ */

function Atmosphere({ radius, color, intensity, power = 3.2 }: { radius: number; color: string; intensity: number; power?: number }) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    }),
    [color, intensity, power],
  )
  return (
    <mesh scale={1.24}>
      <sphereGeometry args={[radius, 40, 28]} />
      <shaderMaterial
        vertexShader={ATMO_VERT}
        fragmentShader={ATMO_FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Hub markers
   ═══════════════════════════════════════════════════════════════════════ */

function HubMarkers({ radius, spin }: { radius: number; spin: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const positions = useMemo(
    () => new Float32Array(NODES.flatMap((n) => latLonToVec3(n.lat, n.lon, radius * 1.008).toArray())),
    [radius],
  )
  const seeds = useMemo(
    () => Float32Array.from(NODES.map((_, i) => (Math.sin(i * 7.13) + 1) / 2)),
    [],
  )

  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#7de8f8') },
    }),
    [],
  )

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
    if (groupRef.current) groupRef.current.rotation.y += delta * spin
  })

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={STAR_VERT}
          fragmentShader={STAR_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Attack arcs
   ═══════════════════════════════════════════════════════════════════════ */

interface SlotState {
  active: boolean
  elapsed: number
  duration: number
  arc: { positions: Float32Array; ts: Float32Array } | null
  destination: THREE.Vector3
  quaternion: THREE.Quaternion
  color: THREE.Color
  landed: boolean
}

function AttackArcs({
  radius,
  spin,
  active,
  spawnEvery,
  onEvent,
}: {
  radius: number
  spin: number
  active: boolean
  spawnEvery: number
  onEvent?: (e: AttackEvent) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const headRefs = useRef<(THREE.Mesh | null)[]>([])
  const ringRefs = useRef<(THREE.Mesh | null)[]>([])
  const ringMaterialRefs = useRef<(THREE.ShaderMaterial | null)[]>([])
  const spawnClock = useRef(0)
  const eventSeq = useRef(0)
  const halo = useMemo(() => getHaloTexture(), [])

  const slots = useRef<SlotState[]>(
    Array.from({ length: SLOTS }, () => ({
      active: false,
      elapsed: 0,
      duration: 1,
      arc: null,
      destination: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      color: new THREE.Color('#22d3ee'),
      landed: false,
    })),
  )

  /**
   * Each slot's line is built imperatively rather than as `<line>` JSX: R3F
   * resolves that intrinsic to the SVG element, which rejects `geometry` and
   * `shaderMaterial`. Mounting the finished object with `<primitive>` avoids
   * the ambiguity entirely.
   */
  const lines = useMemo(
    () =>
      Array.from({ length: SLOTS }, () => {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3))
        geometry.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(0), 1))
        const material = new THREE.ShaderMaterial({
          vertexShader: ARC_VERT,
          fragmentShader: ARC_FRAG,
          uniforms: {
            uHead: { value: 0 },
            uTail: { value: 0.32 },
            uOpacity: { value: 1 },
            uColor: { value: new THREE.Color('#22d3ee') },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
        const line = new THREE.Line(geometry, material)
        line.visible = false
        line.frustumCulled = false
        return line
      }),
    [],
  )

  useFrame((state, delta) => {
    // Keep arcs rotating with the globe so they stay attached to the surface.
    if (groupRef.current) groupRef.current.rotation.y += delta * spin

    if (!active) return

    spawnClock.current += delta
    if (spawnClock.current >= spawnEvery) {
      spawnClock.current = 0
      const free = slots.current.find((s) => !s.active)
      if (free) {
        const from = weightedNode(Math.random())
        let to = weightedNode(Math.random())
        let guard = 0
        while (to.id === from.id && guard < 4) {
          to = weightedNode(Math.random())
          guard += 1
        }
        const label = pickClass()
        const confidence = 0.52 + Math.random() * 0.47

        free.arc = buildArc(
          latLonToVec3(from.lat, from.lon, radius),
          latLonToVec3(to.lat, to.lon, radius),
        )
        free.active = true
        free.elapsed = 0
        free.duration = 0.9 + Math.random() * 0.85
        free.color.set(CLASS_COLOR[label])
        free.destination.copy(latLonToVec3(to.lat, to.lon, radius * 1.005))
        free.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          free.destination.clone().normalize(),
        )
        free.landed = false

        const index = slots.current.indexOf(free)
        const geo = lines[index].geometry
        geo.setAttribute('position', new THREE.BufferAttribute(free.arc.positions, 3))
        geo.setAttribute('aT', new THREE.BufferAttribute(free.arc.ts, 1))
        lines[index].visible = true

        eventSeq.current += 1
        onEvent?.({
          id: eventSeq.current,
          from,
          to,
          label,
          severity: severityFor(confidence),
          confidence,
        })
      }
    }

    // Advance every active slot.
    slots.current.forEach((slot, i) => {
      if (!slot.active || !slot.arc) return
      slot.elapsed += delta
      const t = Math.min(1, slot.elapsed / slot.duration)
      const mat = lines[i].material as THREE.ShaderMaterial
      if (mat) {
        mat.uniforms.uHead.value = t
        mat.uniforms.uColor.value.copy(slot.color)
        mat.uniforms.uOpacity.value = t > 0.96 ? Math.max(0, 1 - (t - 0.96) / 0.04) : 1
      }

      // Head sprite rides the arc.
      const head = headRefs.current[i]
      if (head) {
        const p = sampleArc(slot.arc, t)
        head.position.copy(p)
        // Billboard: the head is a plane, and this group spins, so without
        // re-aiming it the sprite would go edge-on twice per revolution.
        head.lookAt(state.camera.position)
        const mat2 = head.material as THREE.MeshBasicMaterial
        mat2.color.copy(slot.color)
        mat2.opacity = 0.9
        const scale = 0.055 + Math.sin(t * Math.PI) * 0.03
        head.scale.setScalar(scale)
      }

      // Impact ring fires once the arc lands.
      const ring = ringRefs.current[i]
      const ringMat = ringMaterialRefs.current[i]
      if (ring && ringMat) {
        if (!slot.landed && t >= 0.995) slot.landed = true
        if (slot.landed) {
          const rt = Math.min(1, (slot.elapsed / slot.duration - 1) / 0.55)
          ringMat.uniforms.uProgress.value = rt
          ringMat.uniforms.uColor.value.copy(slot.color)
          ringMat.opacity = Math.max(0, 1 - rt)
          ring.visible = rt < 1
        } else {
          ring.visible = false
        }
      }

      if (slot.elapsed > slot.duration * 1.6) {
        slot.active = false
        slot.arc = null
        lines[i].visible = false
        const h = headRefs.current[i]
        if (h) h.visible = false
        const r = ringRefs.current[i]
        if (r) r.visible = false
      }
    })
  })

  return (
    <group ref={groupRef}>
      {lines.map((line, i) => (
        <primitive object={line} key={`arc-${i}`} />
      ))}

      {Array.from({ length: SLOTS }, (_, i) => (
        <group key={`fx-${i}`}>
          <mesh
            ref={(el) => {
              headRefs.current[i] = el as THREE.Mesh | null
            }}
            visible={false}
            frustumCulled={false}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={halo}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh
            ref={(el) => {
              ringRefs.current[i] = el as THREE.Mesh | null
            }}
            visible={false}
            frustumCulled={false}
          >
            <planeGeometry args={[0.42, 0.42]} />
            <shaderMaterial
              ref={(el: THREE.ShaderMaterial | null) => {
                ringMaterialRefs.current[i] = el
              }}
              vertexShader={RING_VERT}
              fragmentShader={RING_FRAG}
              uniforms={{
                uProgress: { value: 0 },
                uColor: { value: new THREE.Color('#22d3ee') },
              }}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}

      {/* Impact rings need their orientation synced to the surface normal. */}
      <ArcRingOrienters ringRefs={ringRefs} slots={slots} />
    </group>
  )
}

/** Keeps each impact ring flat against the globe at its destination. */
function ArcRingOrienters({
  ringRefs,
  slots,
}: {
  ringRefs: React.MutableRefObject<(THREE.Mesh | null)[]>
  slots: React.RefObject<SlotState[]>
}) {
  useFrame(() => {
    ringRefs.current.forEach((ring, i) => {
      if (ring && slots.current[i]?.arc) {
        ring.quaternion.copy(slots.current[i].quaternion)
        ring.position.copy(slots.current[i].destination)
      }
    })
  })
  return null
}

/* ═══════════════════════════════════════════════════════════════════════
   Orbit rings
   ═══════════════════════════════════════════════════════════════════════ */

function OrbitRings({ radius, spin }: { radius: number; spin: number }) {
  const a = useRef<THREE.Group>(null)
  const b = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (a.current) a.current.rotation.z += delta * 0.06 * spin
    if (b.current) b.current.rotation.z -= delta * 0.042 * spin
  })
  return (
    <>
      <group ref={a} rotation={[Math.PI / 2.3, 0, 0]}>
        <mesh>
          <ringGeometry args={[radius * 1.34, radius * 1.348, 128]} />
          <meshBasicMaterial
            color="#22d3ee"
            transparent
            opacity={0.28}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
      <group ref={b} rotation={[Math.PI / 1.75, 0.4, 0]}>
        <mesh>
          <ringGeometry args={[radius * 1.52, radius * 1.524, 128]} />
          <meshBasicMaterial
            color="#a855f7"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Starfield
   ═══════════════════════════════════════════════════════════════════════ */

function Starfield({ count = 900, radius = 26, spin }: { count?: number; radius?: number; spin: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { gl } = useThree()

  const { positions, sizes, seeds } = useMemo(() => {
    const rand = makeRandom(0x5eed)
    const pos = new Float32Array(count * 3)
    const siz = new Float32Array(count)
    const sed = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      // Shell distribution so stars fill the volume, not just a sphere.
      const r = radius * (0.45 + rand() * 0.55)
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      siz[i] = 0.9 + rand() * 1.9
      sed[i] = rand() * 6.28
    }
    return { positions: pos, sizes: siz, seeds: sed }
  }, [count, radius])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(2, gl.getPixelRatio()) },
      uColor: { value: new THREE.Color('#8fc7dd') },
      uOpacity: { value: 0.5 },
    }),
    [gl],
  )

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
    if (groupRef.current) groupRef.current.rotation.y += delta * spin * 0.12
  })

  return (
    <points ref={groupRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={STAR_VERT}
        fragmentShader={STAR_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Pointer parallax
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Nudges the scene toward the cursor.
 *
 * R3F keeps `state.pointer` normalised to -1..1 across the canvas, so this
 * needs no listeners of its own. The offset is applied to the scene group on
 * top of the globe's own spin and eased every frame, so the motion lags the
 * cursor slightly instead of snapping to it. `enabled` is false under reduced
 * motion, where the scene holds a fixed pose.
 */
function Parallax({ enabled, amount = 0.16, children }: { enabled: boolean; amount?: number; children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  const target = useRef(new THREE.Vector2(0, 0))

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    if (enabled) {
      // Slow the ease so the parallax drifts rather than tracks.
      const k = 1 - Math.exp(-delta * 2.6)
      target.current.x += (state.pointer.x * amount - target.current.x) * k
      target.current.y += (state.pointer.y * amount - target.current.y) * k
    } else {
      target.current.set(0, 0)
    }

    group.position.x = target.current.x
    group.position.y = target.current.y
    // Tip very slightly toward the cursor for a sense of depth.
    group.rotation.z = -target.current.x * 0.05
  })

  return <group ref={groupRef}>{children}</group>
}

/* ═══════════════════════════════════════════════════════════════════════
   Public component
   ═══════════════════════════════════════════════════════════════════════ */

export interface GlobeSceneProps {
  /** `hero` is the landing page; `mini` is the reduced version behind /login. */
  variant?: 'hero' | 'mini'
  /** Set false to freeze animation (reduced motion, offscreen, hidden tab). */
  motion?: boolean
  onEvent?: (e: AttackEvent) => void
  className?: string
}

export function GlobeScene({ variant = 'hero', motion = true, onEvent, className }: GlobeSceneProps) {
  const mini = variant === 'mini'
  // A frozen scene holds its pose rather than spinning.
  const spin = motion ? (mini ? 0.035 : 0.055) : 0

  return (
    <div className={className} aria-hidden="true">
      {/*
        frameloop="never" draws a single frame and then stops touching the GPU.
        That is what makes motion={false} a real freeze rather than just a
        pause on spawning arcs — an offscreen or backgrounded hero costs
        nothing, which is the whole point of gating on visibility.
      */}
      <Canvas
        dpr={[1, 1.75]}
        frameloop={motion ? 'always' : 'never'}
        camera={{ position: [0, 0, mini ? 4.1 : 3.5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <Parallax enabled={motion} amount={mini ? 0.07 : 0.16}>
          <Starfield count={mini ? 320 : 900} spin={spin} />
          <group position={[mini ? -0.4 : 0.65, 0, 0]} rotation={[0, mini ? 0.6 : 0, mini ? 0.15 : -0.18]}>
            <GlobePoints count={mini ? 2600 : 9000} radius={RADIUS} size={mini ? 1.5 : 1.75} spin={spin} />
            <HubMarkers radius={RADIUS} spin={spin} />
            <Atmosphere radius={RADIUS} color="#1b7f9c" intensity={mini ? 0.55 : 0.75} />
            {!mini && <OrbitRings radius={RADIUS} spin={spin} />}
            <AttackArcs
              radius={RADIUS}
              spin={spin}
              active={motion}
              spawnEvery={mini ? 2.6 : 1.15}
              onEvent={onEvent}
            />
          </group>
        </Parallax>
      </Canvas>
    </div>
  )
}
