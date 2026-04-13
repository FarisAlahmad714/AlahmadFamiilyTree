'use client'

import {
  useRef, useState, useMemo, Suspense,
  useEffect, forwardRef, useImperativeHandle,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import dagre from '@dagrejs/dagre'
import type { Person } from '@/lib/family-data'
import { useLanguage } from '@/lib/language-context'

const SCALE = 0.016

// ─────────────────────────────────────────
// Layout
// ─────────────────────────────────────────
function computePositions(people: Person[]): {
  map: Map<string, THREE.Vector3>
  treeHeight: number
  centerY: number
  treeWidth: number
} {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150, marginx: 80, marginy: 80 })

  for (const p of people) g.setNode(p.id, { width: 60, height: 60 })
  for (const p of people) { if (p.parentId) g.setEdge(p.parentId, p.id) }
  dagre.layout(g)

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of people) {
    const n = g.node(p.id)
    if (!n) continue
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y
  }
  const cx = (minX + maxX) / 2

  const map = new Map<string, THREE.Vector3>()
  for (const p of people) {
    const n = g.node(p.id)
    if (!n) continue
    map.set(p.id, new THREE.Vector3(
      (n.x - cx) * SCALE,
      (maxY - n.y) * SCALE,
      0
    ))
  }

  return {
    map,
    treeHeight: (maxY - minY) * SCALE,
    centerY: ((maxY - minY) / 2) * SCALE,
    treeWidth: (maxX - minX) * SCALE,
  }
}

// ─────────────────────────────────────────
// Starfield
// ─────────────────────────────────────────
function StarField({ treeWidth, treeHeight }: { treeWidth: number; treeHeight: number }) {
  const COUNT = 14000
  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const sz = new Float32Array(COUNT)
    const spread = Math.max(treeWidth, treeHeight) * 4
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * spread * 2.5
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 2
      pos[i * 3 + 2] = -20 - Math.random() * 180
      sz[i] = 0.05 + Math.random() * 0.18
    }
    return { positions: pos, sizes: sz }
  }, [treeWidth, treeHeight])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#c7d2fe"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// ─────────────────────────────────────────
// Particles flowing upward along branches
// ─────────────────────────────────────────
interface BranchData { from: THREE.Vector3; to: THREE.Vector3; isFemale: boolean }

function BranchParticles({ branches }: { branches: BranchData[] }) {
  const PPB = 6
  const count = branches.length * PPB
  const geoRef = useRef<THREE.BufferGeometry>(null!)

  const posArr = useRef(new Float32Array(count * 3))
  const progArr = useRef(
    new Float32Array(count).map((_, i) => (i % PPB) / PPB)
  )

  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.setAttribute('position', new THREE.BufferAttribute(posArr.current, 3))
    }
  }, [])

  useFrame((_, dt) => {
    const prog = progArr.current
    const pos  = posArr.current
    const speed = 0.18

    for (let b = 0; b < branches.length; b++) {
      const { from, to } = branches[b]
      const mx = (from.x + to.x) / 2
      const my = (from.y + to.y) / 2 + Math.abs(to.y - from.y) * 0.1

      for (let p = 0; p < PPB; p++) {
        const idx = b * PPB + p
        prog[idx] = (prog[idx] + dt * speed) % 1
        const t = prog[idx]
        const ti = 1 - t
        // Quadratic bezier
        pos[idx * 3]     = ti * ti * from.x + 2 * ti * t * mx + t * t * to.x
        pos[idx * 3 + 1] = ti * ti * from.y + 2 * ti * t * my + t * t * to.y
        pos[idx * 3 + 2] = 0.08
      }
    }

    if (geoRef.current?.attributes.position) {
      (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true
    }
  })

  return (
    <points>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial
        size={0.09}
        color="#a5b4fc"
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// ─────────────────────────────────────────
// Ambient ethereal dust drifting upward
// ─────────────────────────────────────────
function AmbientDust({ treeWidth, treeHeight }: { treeWidth: number; treeHeight: number }) {
  const COUNT = 420
  const geoRef = useRef<THREE.BufferGeometry>(null!)
  const posArr = useRef(new Float32Array(COUNT * 3))
  const velArr = useRef(new Float32Array(COUNT * 3))

  useEffect(() => {
    const pos = posArr.current
    const vel = velArr.current
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * treeWidth * 1.4
      pos[i * 3 + 1] = Math.random() * treeHeight * 1.2
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4
      vel[i * 3]     = (Math.random() - 0.5) * 0.25
      vel[i * 3 + 1] = 0.06 + Math.random() * 0.12
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.05
    }
    if (geoRef.current) {
      geoRef.current.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    }
  }, [treeWidth, treeHeight])

  useFrame((_, dt) => {
    const pos = posArr.current
    const vel = velArr.current
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     += vel[i * 3] * dt
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt
      if (pos[i * 3 + 1] > treeHeight * 1.25) pos[i * 3 + 1] = -0.5
      if (Math.abs(pos[i * 3]) > treeWidth * 0.75) vel[i * 3] *= -1
    }
    if (geoRef.current?.attributes.position) {
      (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true
    }
  })

  return (
    <points>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial size={0.055} color="#e0e7ff" transparent opacity={0.28} sizeAttenuation depthWrite={false} />
    </points>
  )
}


// ─────────────────────────────────────────
// Golden pillar of light above patriarch
// ─────────────────────────────────────────
function PatriarchPillar({ position, treeHeight }: { position: THREE.Vector3; treeHeight: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const h = treeHeight + 4

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.04 + Math.sin(clock.elapsedTime * 1.2) * 0.025
  })

  return (
    <group position={[position.x, position.y + h / 2, position.z]}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.08, 0.45, h, 16, 1, true]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.05} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────
// Branch tube — tapered by depth
// ─────────────────────────────────────────
function Branch({ from, to, isFemale, treeHeight }: BranchData & { treeHeight: number }) {
  const geometry = useMemo(() => {
    const mid = new THREE.Vector3(
      (from.x + to.x) / 2,
      (from.y + to.y) / 2 + Math.abs(to.y - from.y) * 0.1,
      0
    )
    const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone())
    // Thicker near root, thinner near leaves
    const depthFraction = treeHeight > 0 ? to.y / treeHeight : 0.5
    const radius = Math.max(0.012, 0.044 * (1 - depthFraction * 0.78))
    return new THREE.TubeGeometry(curve, 10, radius, 6, false)
  }, [from, to, treeHeight])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={isFemale ? '#ec4899' : '#4338ca'}
        emissive={isFemale ? '#be185d' : '#3730a3'}
        emissiveIntensity={0.35}
        transparent
        opacity={0.65}
        roughness={0.55}
        metalness={0.1}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────
// Person sphere with halo ring
// ─────────────────────────────────────────
interface SphereProps {
  person: Person
  position: THREE.Vector3
  isSelected: boolean
  onSelect: (p: Person) => void
  isDark: boolean
}

function PersonSphere({ person, position, isSelected, onSelect, isDark }: SphereProps) {
  const meshRef  = useRef<THREE.Mesh>(null!)
  const haloRef  = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const language = useLanguage()

  const isPatriarch = person.id === 'abubakr'
  const isFemale    = person.gender === 'female'
  const displayName = language === 'ar' && person.firstNameAr ? person.firstNameAr : person.firstName
  const radius      = isPatriarch ? 0.56 : 0.28

  const baseColor    = isPatriarch ? '#f59e0b' : isFemale ? '#ec4899' : '#818cf8'
  const emissiveCol  = isPatriarch ? '#d97706' : isFemale ? '#db2777' : '#6366f1'
  const labelColor   = isDark
    ? (isPatriarch ? '#fde68a' : isFemale ? '#fbcfe8' : '#c7d2fe')
    : (isPatriarch ? '#92400e' : isFemale ? '#9d174d' : '#312e81')

  const seed = useMemo(
    () => (person.id.charCodeAt(0) + (person.id.charCodeAt(1) || 0)) % 100 * 0.063,
    [person.id]
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (meshRef.current) {
      const pulse = isPatriarch
        ? 1 + Math.sin(t * 1.1) * 0.12
        : isSelected || hovered ? 1.35
        : 1 + Math.sin(t * 1.6 + seed) * 0.05
      meshRef.current.scale.setScalar(pulse)
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = isPatriarch
        ? 1.1 + Math.sin(t * 1.5) * 0.55
        : isSelected || hovered ? 2.8
        : 0.65 + Math.sin(t * 2.1 + seed) * 0.22
    }

    if (haloRef.current) {
      haloRef.current.rotation.z = t * (isPatriarch ? 0.55 : 0.3) + seed
      const mat = haloRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = isPatriarch
        ? 0.28 + Math.sin(t * 1.8) * 0.12
        : isSelected || hovered ? 0.45
        : 0.12 + Math.sin(t * 1.4 + seed) * 0.06
    }
  })

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Halo ring */}
      <mesh ref={haloRef}>
        <ringGeometry args={[radius + 0.1, radius + 0.19, isPatriarch ? 48 : 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(person) }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = '' }}
      >
        <sphereGeometry args={[radius, 22, 22]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveCol}
          emissiveIntensity={0.7}
          roughness={0.18}
          metalness={0.6}
        />
      </mesh>

      {/* Name label */}
      <Text
        position={[0, radius + 0.24, 0]}
        fontSize={isPatriarch ? 0.23 : 0.14}
        color={labelColor}
        anchorX="center"
        anchorY="bottom"
        renderOrder={100}
        depthOffset={-10}
      >
        {displayName}
      </Text>
    </group>
  )
}

// ─────────────────────────────────────────
// Scene fog setup
// ─────────────────────────────────────────
function SceneFog({ isDark }: { isDark: boolean }) {
  const { scene } = useThree()
  useEffect(() => {
    scene.fog = new THREE.FogExp2(isDark ? '#020817' : '#fdf8f0', 0.009)
    return () => { scene.fog = null }
  }, [scene, isDark])
  return null
}

// ─────────────────────────────────────────
// WASD / arrow key camera controller
// ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CameraController({ orbitRef }: { orbitRef: React.MutableRefObject<any> }) {
  const keys = useRef(new Set<string>())

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase())
    const up   = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup',   up)
    }
  }, [])

  useFrame(({ camera }, delta) => {
    const k = keys.current
    if (!k.size) return
    const c = orbitRef.current
    const dist = c
      ? new THREE.Vector3().subVectors(camera.position, c.target).length()
      : camera.position.z
    const speed = dist * 0.65

    let dx = 0, dy = 0
    if (k.has('a') || k.has('arrowleft'))  dx -= 1
    if (k.has('d') || k.has('arrowright')) dx += 1
    if (k.has('w') || k.has('arrowup'))    dy += 1
    if (k.has('s') || k.has('arrowdown'))  dy -= 1
    if (dx === 0 && dy === 0) return

    const move = new THREE.Vector3(dx, dy, 0).normalize().multiplyScalar(speed * delta)
    camera.position.add(move)
    if (c?.target) { c.target.add(move); c.update() }
  })

  return null
}

// ─────────────────────────────────────────
// Full scene
// ─────────────────────────────────────────
interface SceneProps {
  people: Person[]
  selectedPersonId: string | null
  onSelectPerson: (p: Person) => void
  isDark: boolean
  positions: Map<string, THREE.Vector3>
  treeHeight: number
  treeWidth: number
  centerY: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionsRef: React.MutableRefObject<TreeView3DHandle>
}

function Scene({
  people, selectedPersonId, onSelectPerson, isDark,
  positions, treeHeight, treeWidth, centerY, actionsRef,
}: SceneProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null!)

  // Pre-compute branch array for particle system
  const branches = useMemo<BranchData[]>(() =>
    people.flatMap((p) => {
      if (!p.parentId) return []
      const from = positions.get(p.parentId)
      const to   = positions.get(p.id)
      if (!from || !to) return []
      return [{ from, to, isFemale: p.gender === 'female' }]
    }),
    [people, positions]
  )

  const patriarchPos = positions.get('abubakr')

  useEffect(() => {
    actionsRef.current = {
      zoomIn() {
        const c = orbitRef.current; if (!c) return
        c.object.position.copy(c.object.position.clone().sub(c.target).multiplyScalar(0.75).add(c.target))
        c.update()
      },
      zoomOut() {
        const c = orbitRef.current; if (!c) return
        c.object.position.copy(c.object.position.clone().sub(c.target).multiplyScalar(1.33).add(c.target))
        c.update()
      },
      fitView() { orbitRef.current?.reset() },
    }
  })

  return (
    <>
      <SceneFog isDark={isDark} />

      {/* ── Dramatic lighting ── */}
      <ambientLight intensity={isDark ? 0.22 : 0.65} />
      {/* Top fill */}
      <pointLight position={[0, treeHeight + 6, 12]} intensity={isDark ? 1.4 : 0.8} color={isDark ? '#818cf8' : '#6366f1'} />
      {/* Left rim — warm pink */}
      <pointLight position={[-treeWidth * 0.55, treeHeight * 0.5, 6]} intensity={0.55} color="#ec4899" />
      {/* Right rim — cool blue */}
      <pointLight position={[ treeWidth * 0.55, treeHeight * 0.5, 6]} intensity={0.4}  color={isDark ? '#38bdf8' : '#f59e0b'} />
      {/* Root glow light */}
      <pointLight position={[0, 1, 5]} intensity={isDark ? 0.7 : 0.35} color="#6366f1" />

      {/* ── Environment ── */}
      <color attach="background" args={[isDark ? '#020817' : '#fdf8f0']} />
      {isDark && <StarField treeWidth={treeWidth} treeHeight={treeHeight} />}
      {isDark && <AmbientDust treeWidth={treeWidth} treeHeight={treeHeight} />}

      {/* ── Patriarch pillar of light ── */}
      {patriarchPos && <PatriarchPillar position={patriarchPos} treeHeight={treeHeight} />}

      {/* ── Branches ── */}
      {branches.map(({ from, to, isFemale }) => (
        <Branch
          key={`b-${from.x.toFixed(3)}-${to.x.toFixed(3)}-${to.y.toFixed(3)}`}
          from={from} to={to} isFemale={isFemale} treeHeight={treeHeight}
        />
      ))}

      {/* ── Particle flows along branches ── */}
      <BranchParticles branches={branches} />

      {/* ── Person spheres ── */}
      {people.map((p) => {
        const pos = positions.get(p.id)
        if (!pos) return null
        return (
          <PersonSphere
            key={p.id}
            person={p}
            position={pos}
            isSelected={selectedPersonId === p.id}
            onSelect={onSelectPerson}
            isDark={isDark}
          />
        )
      })}

      {/* ── Controls ── */}
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        target={[0, centerY, 0]}
        minDistance={2}
        maxDistance={130}
        enableRotate={false}
        screenSpacePanning
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
      <CameraController orbitRef={orbitRef} />

      {/* ── Post-processing ── */}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.15}
          luminanceSmoothing={0.92}
          intensity={isDark ? 2.2 : 0.7}
          mipmapBlur
        />
        <Vignette offset={0.12} darkness={isDark ? 0.75 : 0.35} />
      </EffectComposer>
    </>
  )
}

// ─────────────────────────────────────────
// Public handle & export
// ─────────────────────────────────────────
export interface TreeView3DHandle {
  zoomIn: () => void
  zoomOut: () => void
  fitView: () => void
  zoomToId?: (id: string) => void
}

interface Props {
  people: Person[]
  selectedPersonId: string | null
  onSelectPerson: (p: Person) => void
  isDark: boolean
}

const TreeView3D = forwardRef<TreeView3DHandle, Props>(function TreeView3D(
  { people, selectedPersonId, onSelectPerson, isDark }, ref
) {
  const { map: positions, treeHeight, treeWidth, centerY } = useMemo(
    () => computePositions(people), [people]
  )

  const cameraZ = Math.max(treeHeight * 2.2 + 8, 18)
  const actionsRef = useRef<TreeView3DHandle>({ zoomIn: () => {}, zoomOut: () => {}, fitView: () => {} })

  useImperativeHandle(ref, () => ({
    zoomIn:  () => actionsRef.current.zoomIn(),
    zoomOut: () => actionsRef.current.zoomOut(),
    fitView: () => actionsRef.current.fitView(),
  }))

  return (
    <Canvas
      camera={{ position: [0, centerY, cameraZ], fov: 55 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <Scene
          people={people}
          selectedPersonId={selectedPersonId}
          onSelectPerson={onSelectPerson}
          isDark={isDark}
          positions={positions}
          treeHeight={treeHeight}
          treeWidth={treeWidth}
          centerY={centerY}
          actionsRef={actionsRef}
        />
      </Suspense>
    </Canvas>
  )
})

export default TreeView3D
