'use client'

import {
  useRef, useMemo, useEffect, useState,
  forwardRef, useImperativeHandle, Suspense, memo,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Text, useGLTF, Billboard } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Person } from '@/lib/family-data'
import { useLanguage } from '@/lib/language-context'
import type { TreeView3DHandle } from './TreeView3D'

// ── Trunk crown height ────────────────────────────────────────────────────
// Calibrated: Blender Z≈2.4 × GLB_SCALE(4) + GLB_Y(−5.4) = 4.2
const TRUNK_TOP_Y = 4.2

// ── 114 real olive fruit positions extracted from Blender's OliveFruits mesh ─
// Three.js coordinates (scale=4, Y_offset=−5.4). Sorted by Y descending.
// These are the actual ground-truth fruit locations in the GLB model — every
// family member (except the patriarch) is placed at one of these positions.
// Three.js coords: X = Blender_X×4, Y = Blender_Z×4−5.4, Z = −Blender_Y×4
// Extracted fresh from Blender OliveFruits mesh (island centers), sorted Y desc.
const RAW_OLIVE_POSITIONS: [number, number, number][] = [
  [8.287, 7.304, -4.39],
  [8.568, 7.169, -2.522],
  [6.424, 7.098, -4.088],
  [8.469, 6.996, -3.73],
  [7.456, 6.7, -2.956],
  [9.904, 6.467, -2.464],
  [7.98, 6.3, -4.576],
  [9.081, 6.261, -0.875],
  [7.316, 6.156, -5.915],
  [7.633, 6.149, -2.461],
  [7.643, 6.003, -7.881],
  [-8.773, 5.953, -1.474],
  [7.658, 5.766, -6.467],
  [6.316, 5.737, -6.779],
  [-6.499, 5.697, -6.74],
  [1.753, 5.692, 9.926],
  [-6.425, 5.671, -7.139],
  [7.022, 5.558, 1.689],
  [9.153, 5.553, -1.938],
  [9.124, 5.504, -3.736],
  [1.137, 5.412, 9.27],
  [-8.775, 5.399, -4.643],
  [9.391, 5.369, 0.937],
  [8.251, 5.35, -5.639],
  [-4.601, 5.317, -7.872],
  [-6.508, 5.284, -7.199],
  [1.128, 5.245, 9.177],
  [-8.042, 5.227, -4.592],
  [-7.92, 5.148, -2.517],
  [-6.325, 5.091, -7.818],
  [-8.151, 5.075, -2.294],
  [-9.01, 5.058, -3.25],
  [9.885, 5.041, 1.69],
  [10.62, 5.037, -2.968],
  [-9.089, 5.019, -5.341],
  [-6.249, 5.013, -4.685],
  [7.787, 4.986, 0.497],
  [6.857, 4.909, -8.55],
  [8.8, 4.853, -2.618],
  [-2.457, 4.834, 8.847],
  [-9.104, 4.831, -0.319],
  [1.905, 4.824, 9.408],
  [-2.528, 4.814, 9.23],
  [10.398, 4.754, -0.96],
  [1.325, 4.741, 8.588],
  [-9.487, 4.726, -2.824],
  [10.348, 4.66, -2.051],
  [8.078, 4.638, -1.147],
  [0.637, 4.493, 9.332],
  [10.112, 4.462, 1.164],
  [-8.404, 4.449, -2.001],
  [-3.55, 4.412, 7.064],
  [1.487, 4.371, 8.247],
  [-3.2, 4.291, 9.868],
  [6.803, 4.285, -0.359],
  [-7.693, 4.27, -2.024],
  [-9.562, 4.241, -2.631],
  [10.384, 4.234, -1.302],
  [10.851, 4.225, -1.9],
  [-5.444, 4.212, -2.134],
  [-8.047, 4.104, -2.864],
  [-7.281, 4.048, -0.503],
  [8.366, 3.981, 3.181],
  [-2.476, 3.979, 7.381],
  [6.682, 3.948, -3.473],
  [6.42, 3.947, -1.498],
  [-2.622, 3.931, 8.43],
  [2.134, 3.843, 8.871],
  [8.805, 3.745, 0.434],
  [-6.692, 3.742, -1.466],
  [6.7, 3.737, -4.386],
  [1.703, 3.735, 7.171],
  [6.289, 3.691, -0.684],
  [2.267, 3.691, 7.992],
  [1.191, 3.649, 8.418],
  [9.45, 3.595, 4.092],
  [10.578, 3.566, 3.626],
  [9.629, 3.5, 2.743],
  [-7.207, 3.48, -1.228],
  [6.953, 3.466, -2.229],
  [7.609, 3.434, -1.449],
  [-6.605, 3.409, -2.961],
  [9.939, 3.403, 2.285],
  [-9.57, 3.399, 2.96],
  [0.068, 3.38, 6.523],
  [8.289, 3.323, -4.195],
  [6.666, 3.278, 8.411],
  [-10.423, 3.27, 3.557],
  [-8.536, 3.265, 2.379],
  [5.421, 3.193, 7.243],
  [7.395, 3.101, -2.672],
  [7.328, 3.041, -2.584],
  [6.658, 3.001, 8.146],
  [9.818, 2.945, 0.594],
  [6.377, 2.94, 4.235],
  [6.261, 2.911, -2.682],
  [-9.461, 2.895, 3.974],
  [6.868, 2.87, -3.526],
  [5.671, 2.861, 1.877],
  [6.74, 2.844, 4.174],
  [-10.983, 2.832, 1.568],
  [8.753, 2.791, 0.432],
  [4.192, 2.737, 8.638],
  [6.265, 2.708, 3.393],
  [7.371, 2.648, 8.301],
  [5.501, 2.622, 2.291],
  [7.738, 2.596, 2.991],
  [-8.884, 2.518, 1.035],
  [9.524, 2.388, 0.945],
  [8.098, 2.294, 1.233],
  [10.068, 2.245, 0.031],
  [5.674, 2.218, 9.105],
  [10.194, 2.21, 2.771],
  [8.031, 1.425, 1.489],
]

// ── Seeded deterministic random ────────────────────────────────────────────
function seededRand(seed: number): number {
  return ((Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
}

// ── Layout ────────────────────────────────────────────────────────────────
interface LayoutNode { person: Person; position: THREE.Vector3; depth: number }

function computeLayout(people: Person[]): {
  nodes: LayoutNode[]
  nodeMap: Map<string, LayoutNode>
  maxDepth: number
} {
  const childrenOf = new Map<string, Person[]>()
  for (const p of people) {
    if (!p.parentId) continue
    if (!childrenOf.has(p.parentId)) childrenOf.set(p.parentId, [])
    childrenOf.get(p.parentId)!.push(p)
  }

  // Subtree sizes for proportional sector allocation
  const subtreeSize = new Map<string, number>()
  function countSubtree(id: string): number {
    const ch = childrenOf.get(id) ?? []
    const n = 1 + ch.reduce((s, c) => s + countSubtree(c.id), 0)
    subtreeSize.set(id, n)
    return n
  }
  const roots = people.filter(p => !p.parentId)
  roots.forEach(r => countSubtree(r.id))

  const depthOf = new Map<string, number>()
  function setDepth(id: string, d: number) {
    depthOf.set(id, d)
    for (const c of childrenOf.get(id) ?? []) setDepth(c.id, d + 1)
  }
  roots.forEach(r => setDepth(r.id, 0))
  const maxDepth = depthOf.size > 0 ? Math.max(...depthOf.values()) : 1

  // ── Phase 1: compute azimuthal centre for each person ─────────────────
  // Same sector-proportional logic as before — family branches occupy
  // angular slices proportional to their subtree size.
  const azCenterOf = new Map<string, number>()

  function computeAz(id: string, azCenter: number, azWidth: number) {
    azCenterOf.set(id, azCenter)
    const children = childrenOf.get(id) ?? []
    const total = children.reduce((s, c) => s + (subtreeSize.get(c.id) ?? 1), 0)
    let angle = azCenter - azWidth / 2
    for (const c of children) {
      const share = (subtreeSize.get(c.id) ?? 1) / total
      const w = azWidth * share
      computeAz(c.id, angle + w / 2, w)
      angle += w
    }
  }
  roots.forEach((r, i) =>
    computeAz(r.id, (i / Math.max(roots.length, 1)) * Math.PI * 2, Math.PI * 2)
  )

  // ── Phase 2: assign real Blender fruit positions ───────────────────────
  // For each person, find the closest unoccupied Blender fruit that lies
  // within their azimuthal sector and at approximately the right canopy height.
  const fruitPool = RAW_OLIVE_POSITIONS.map(([x, y, z]) => ({
    x, y, z,
    az: Math.atan2(z, x),   // −π … π
    taken: false,
  }))

  const positions = new Map<string, THREE.Vector3>()

  // Process depth-by-depth (patriarch → children → grandchildren …).
  // Within each depth, sort by azimuth so adjacent family branches
  // get adjacent fruit positions.
  const byDepth = new Map<number, string[]>()
  for (const p of people) {
    const d = depthOf.get(p.id) ?? 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(p.id)
  }

  for (let d = 0; d <= maxDepth; d++) {
    const ids = (byDepth.get(d) ?? [])
      .slice()
      .sort((a, b) => (azCenterOf.get(a) ?? 0) - (azCenterOf.get(b) ?? 0))

    for (const id of ids) {
      if (d === 0) {
        // Patriarch stays at the trunk crown — no fruit needed
        positions.set(id, new THREE.Vector3(0, TRUNK_TOP_Y, 0))
        continue
      }

      const targetAz = azCenterOf.get(id) ?? 0
      // t = 0 at depth 1 (top of canopy), 1 at maxDepth (bottom)
      const t = Math.min((d - 1) / Math.max(maxDepth - 1, 1), 1)
      // Target Y slides from top of fruit cluster (Y≈6.8) down to bottom (Y≈1.6)
      const targetY = 6.8 - t * 5.2

      let best = -1
      let bestScore = Infinity
      for (let i = 0; i < fruitPool.length; i++) {
        if (fruitPool[i].taken) continue
        let azDiff = Math.abs(fruitPool[i].az - targetAz)
        if (azDiff > Math.PI) azDiff = 2 * Math.PI - azDiff
        const yDiff = Math.abs(fruitPool[i].y - targetY)
        // Azimuth match is weighted 5× — keeps family branches in the same
        // angular sector of the tree. Y match is secondary (spreads by gen).
        const score = azDiff * 5.0 + yDiff * 0.8
        if (score < bestScore) { bestScore = score; best = i }
      }

      if (best >= 0) {
        fruitPool[best].taken = true
        const { x, y, z } = fruitPool[best]
        positions.set(id, new THREE.Vector3(x, y, z))
      }
    }
  }

  const nodes: LayoutNode[] = people.map(p => ({
    person: p,
    position: positions.get(p.id) ?? new THREE.Vector3(0, TRUNK_TOP_Y, 0),
    depth: depthOf.get(p.id) ?? 0,
  }))
  const nodeMap = new Map(nodes.map(n => [n.person.id, n]))
  return { nodes, nodeMap, maxDepth }
}

// Draco decoder path + preload
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
useGLTF.preload('/olive-tree.glb')
useGLTF.preload('/olive-fruit.glb')

// ── GLB Tree — the Blender olive tree model ────────────────────────────────
const GLB_SCALE = 4
const GLB_Y     = TRUNK_TOP_Y - 2.4 * GLB_SCALE  // 4.2 − 9.6 = −5.4

function GLBTree() {
  const { scene } = useGLTF('/olive-tree.glb')
  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((obj: THREE.Object3D) => {
      if (!(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      const n = mesh.name.toLowerCase()
      const isLeaf  = n.includes('canopy') || n.includes('leaf')
      const isBark  = n.includes('trunk') || n.includes('root') || n.includes('bough') || n.includes('sub_')
      const isFruit = n.includes('fruit')
      if (isLeaf) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#2e3d10', roughness: 0.82, metalness: 0.04,
          side: THREE.DoubleSide,
        })
      } else if (isBark) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#1a0d05', roughness: 0.97, metalness: 0.0,
        })
      } else if (isFruit) {
        // Hide static fruits — the interactive PersonOrbs are the family olives
        mesh.visible = false
      }
    })
    return c
  }, [scene])
  return <primitive object={cloned} position={[0, GLB_Y, 0]} scale={[GLB_SCALE, GLB_SCALE, GLB_SCALE]} />
}

// ── Massive gnarled trunk ─────────────────────────────────────────────────
function OliveTrunk({ isDark }: { isDark: boolean }) {
  // Main trunk — 16 segments, thick base, aggressive gnarl
  const segments = useMemo(() => {
    const NSEG = 16
    const geos: THREE.TubeGeometry[] = []
    const trunkH = TRUNK_TOP_Y + 2.2
    for (let i = 0; i < NSEG; i++) {
      const t0 = i / NSEG
      const t1 = (i + 1) / NSEG
      const y0 = -2.2 + t0 * trunkH
      const y1 = -2.2 + t1 * trunkH
      // Three overlapping wobble frequencies — Palestinian olive-level gnarliness
      const w  = (t: number) => Math.sin(t * 7.3 + 0.5) * 0.32 * Math.sin(t * Math.PI)
                              + Math.sin(t * 11.1 + 2.1) * 0.10 * Math.sin(t * Math.PI * 0.6)
      const w2 = (t: number) => Math.cos(t * 5.1 + 1.8) * 0.26 * Math.sin(t * Math.PI)
                              + Math.cos(t * 9.7 + 0.3) * 0.08 * Math.sin(t * Math.PI * 0.8)
      const from = new THREE.Vector3(w(t0), y0, w2(t0))
      const to   = new THREE.Vector3(w(t1), y1, w2(t1))
      // Base 1.05 → crown 0.24
      const radius = 1.05 - t0 * 0.81
      geos.push(new THREE.TubeGeometry(new THREE.LineCurve3(from, to), 2, Math.max(0.24, radius), 12, false))
    }
    return geos
  }, [])

  // 8 massive surface roots + sub-roots
  const rootGeos = useMemo(() => {
    const geos: THREE.TubeGeometry[] = []
    for (let i = 0; i < 8; i++) {
      const angle  = (i / 8) * Math.PI * 2 + 0.4
      const len    = 1.8 + seededRand(i * 17) * 0.9
      const baseR  = 0.30 + seededRand(i * 7) * 0.14
      const cx     = Math.cos(angle)
      const cz     = Math.sin(angle)
      // Root emerges from trunk base, arcs out and dips flat to ground level
      geos.push(new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(cx * 0.35, -1.4, cz * 0.35),
          new THREE.Vector3(cx * len * 0.50, -1.90, cz * len * 0.50),
          new THREE.Vector3(cx * len,        -2.15, cz * len),
        ), 8, baseR, 8, false,
      ))
      // Sub-root branching off at ~40% along parent
      if (seededRand(i * 31) > 0.35) {
        const sAngle = angle + (seededRand(i * 13) - 0.5) * 1.1
        const sLen   = len * 0.52
        geos.push(new THREE.TubeGeometry(
          new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(cx * len * 0.38, -1.95, cz * len * 0.38),
            new THREE.Vector3(Math.cos(sAngle) * sLen * 0.6, -2.05, Math.sin(sAngle) * sLen * 0.6),
            new THREE.Vector3(Math.cos(sAngle) * sLen,       -2.14, Math.sin(sAngle) * sLen),
          ), 6, baseR * 0.44, 7, false,
        ))
      }
    }
    return geos
  }, [])

  // Second companion trunk — leans hard left, thick and gnarled
  const trunk2Geos = useMemo(() => {
    const NSEG = 9
    const geos: THREE.TubeGeometry[] = []
    const halfH = TRUNK_TOP_Y * 0.72
    for (let i = 0; i < NSEG; i++) {
      const t0 = i / NSEG
      const t1 = (i + 1) / NSEG
      const y0 = -1.6 + t0 * halfH
      const y1 = -1.6 + t1 * halfH
      const lean = 0.65
      const from = new THREE.Vector3(lean * t0 + Math.sin(t0 * 5.8) * 0.16, y0, 0.75 * t0 + Math.cos(t0 * 4.2) * 0.12)
      const to   = new THREE.Vector3(lean * t1 + Math.sin(t1 * 5.8) * 0.16, y1, 0.75 * t1 + Math.cos(t1 * 4.2) * 0.12)
      const r    = 0.62 - t0 * 0.50
      geos.push(new THREE.TubeGeometry(new THREE.LineCurve3(from, to), 2, Math.max(0.12, r), 9, false))
    }
    return geos
  }, [])

  useEffect(() => () => {
    segments.forEach(g => g.dispose())
    rootGeos.forEach(g => g.dispose())
    trunk2Geos.forEach(g => g.dispose())
  }, [segments, rootGeos, trunk2Geos])

  const barkColor = isDark ? '#1e1108' : '#2c1a0a'
  const rootColor = isDark ? '#140c06' : '#1e1208'
  const burlColor = isDark ? '#251509' : '#311e0c'

  return (
    <group>
      {segments.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial color={barkColor} roughness={0.97} metalness={0.03} />
        </mesh>
      ))}
      {trunk2Geos.map((geo, i) => (
        <mesh key={`t2-${i}`} geometry={geo}>
          <meshStandardMaterial color={barkColor} roughness={0.98} metalness={0.02} />
        </mesh>
      ))}
      {rootGeos.map((geo, i) => (
        <mesh key={`r-${i}`} geometry={geo}>
          <meshStandardMaterial color={rootColor} roughness={0.99} />
        </mesh>
      ))}
      {/* Crown junction — cluster of burled knobs where trunk meets boughs */}
      <mesh position={[0, TRUNK_TOP_Y + 0.05, 0]}>
        <sphereGeometry args={[0.58, 12, 9]} />
        <meshStandardMaterial color={burlColor} roughness={0.98} metalness={0.02} />
      </mesh>
      <mesh position={[0.28, TRUNK_TOP_Y + 0.30, 0.18]}>
        <sphereGeometry args={[0.34, 9, 7]} />
        <meshStandardMaterial color={burlColor} roughness={0.99} />
      </mesh>
      <mesh position={[-0.22, TRUNK_TOP_Y + 0.22, -0.20]}>
        <sphereGeometry args={[0.28, 9, 7]} />
        <meshStandardMaterial color={burlColor} roughness={0.99} />
      </mesh>
      <mesh position={[0.10, TRUNK_TOP_Y + 0.55, -0.12]}>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshStandardMaterial color={burlColor} roughness={0.99} />
      </mesh>
    </group>
  )
}

// ── Branch ────────────────────────────────────────────────────────────────
const Branch = memo(function Branch({
  from, to, depth, isDark,
}: { from: THREE.Vector3; to: THREE.Vector3; depth: number; isDark: boolean }) {
  const geo = useMemo(() => {
    // Mid-point bows outward from tree centre and slightly up
    const mid = from.clone().lerp(to, 0.5)
    const outward = new THREE.Vector3(mid.x, 0, mid.z)
    if (outward.length() > 0.001) mid.addScaledVector(outward.normalize(), 0.25)
    mid.y -= from.distanceTo(to) * 0.08  // slight downward sag — olive branches bow under fruit weight
    const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone())
    // Exponential taper — main boughs are thick, twigs are fine
    const r = Math.max(0.022, 0.82 * Math.pow(0.72, depth))
    return new THREE.TubeGeometry(curve, 12, r, 7, false)
  }, [from, to, depth])

  useEffect(() => () => geo.dispose(), [geo])

  // Bark color lightens with depth (younger wood is lighter)
  const col = depth === 0 ? '#1e1108'
    : depth <= 1 ? '#2c1a0a'
    : depth <= 2 ? '#3a2210'
    : depth <= 3 ? '#4a2c14'
    : '#5c3618'

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={isDark ? col : col} roughness={0.95} metalness={0.03} />
    </mesh>
  )
})

// ── Dense leaf cluster at branch endpoints ────────────────────────────────
function LeafClusters({ nodes, isDark }: { nodes: LayoutNode[]; isDark: boolean }) {
  const LEAVES_PER_NODE = 38
  const canopyNodes = useMemo(() => nodes.filter(n => n.depth >= 2), [nodes])
  const COUNT = canopyNodes.length * LEAVES_PER_NODE
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D()
    const mats: THREE.Matrix4[] = []
    canopyNodes.forEach((node, ni) => {
      const clusterR = 0.55 + seededRand(ni * 11) * 0.35
      for (let li = 0; li < LEAVES_PER_NODE; li++) {
        const s = ni * LEAVES_PER_NODE + li
        const phi   = Math.acos(1 - 2 * seededRand(s * 3.1))
        const theta = seededRand(s * 7.3) * Math.PI * 2
        const rr    = clusterR * (0.55 + seededRand(s * 13.7) * 0.45)
        dummy.position.set(
          node.position.x + rr * Math.sin(phi) * Math.cos(theta),
          node.position.y + rr * Math.cos(phi) * 0.75,
          node.position.z + rr * Math.sin(phi) * Math.sin(theta),
        )
        dummy.rotation.set(
          seededRand(s * 5.9) * Math.PI * 2,
          seededRand(s * 11.1) * Math.PI * 2,
          seededRand(s * 17.3) * Math.PI * 2,
        )
        dummy.scale.setScalar(0.5 + seededRand(s * 9.7) * 0.9)
        dummy.updateMatrix()
        mats.push(dummy.matrix.clone())
      }
    })
    return mats
  }, [canopyNodes])

  useEffect(() => {
    if (!meshRef.current || !matrices.length) return
    matrices.forEach((m, i) => meshRef.current.setMatrixAt(i, m))
    meshRef.current.count = matrices.length
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [matrices])

  if (!COUNT) return null
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, Math.max(COUNT, 1)]}>
      <planeGeometry args={[0.048, 0.20]} />
      <meshStandardMaterial
        color={isDark ? '#4d6b38' : '#5e7d44'}
        transparent opacity={isDark ? 0.85 : 0.92}
        side={THREE.DoubleSide} roughness={0.86}
      />
    </instancedMesh>
  )
}

// ── Falling olive leaves ───────────────────────────────────────────────────
function FallingLeaves({ treeHeight }: { treeHeight: number }) {
  const COUNT = 90
  const geoRef   = useRef<THREE.BufferGeometry>(null!)
  const posArr   = useRef(new Float32Array(COUNT * 3))
  const velArr   = useRef(new Float32Array(COUNT * 3))
  const phaseArr = useRef(new Float32Array(COUNT))

  useEffect(() => {
    for (let i = 0; i < COUNT; i++) {
      posArr.current[i*3]   = (Math.random() - 0.5) * 20
      posArr.current[i*3+1] = Math.random() * treeHeight
      posArr.current[i*3+2] = (Math.random() - 0.5) * 20
      velArr.current[i*3]   = (Math.random() - 0.5) * 0.40
      velArr.current[i*3+1] = -(0.14 + Math.random() * 0.28)
      velArr.current[i*3+2] = (Math.random() - 0.5) * 0.40
      phaseArr.current[i]   = Math.random() * Math.PI * 2
    }
    if (geoRef.current)
      geoRef.current.setAttribute('position', new THREE.BufferAttribute(posArr.current, 3))
  }, [treeHeight])

  useFrame((_, dt) => {
    for (let i = 0; i < COUNT; i++) {
      phaseArr.current[i] += dt * 2.1
      const ph = phaseArr.current[i]
      posArr.current[i*3]   += velArr.current[i*3] * dt + Math.sin(ph) * 0.12 * dt
      posArr.current[i*3+1] += velArr.current[i*3+1] * dt
      posArr.current[i*3+2] += velArr.current[i*3+2] * dt + Math.cos(ph * 0.8) * 0.09 * dt
      if (posArr.current[i*3+1] < -2) {
        posArr.current[i*3]   = (Math.random() - 0.5) * 18
        posArr.current[i*3+1] = treeHeight + Math.random() * 4
        posArr.current[i*3+2] = (Math.random() - 0.5) * 18
      }
    }
    if (geoRef.current?.attributes.position)
      (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <points>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial size={0.10} color="#7aaa58" transparent opacity={0.78} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// ── Night stars ───────────────────────────────────────────────────────────
function NightStars() {
  const COUNT = 8000
  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const r     = 70 + seededRand(i * 3.7) * 250
      const theta = seededRand(i * 7.1) * Math.PI * 2
      const phi   = Math.acos(1 - seededRand(i * 11.3) * 1.6)
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      pos[i*3+1] = r * Math.cos(phi) + 20
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return pos
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.09} color="#d8e4ff" transparent opacity={0.50} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// ── Ground ────────────────────────────────────────────────────────────────
function Ground({ isDark }: { isDark: boolean }) {
  return (
    <group position={[0, -2.2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial color={isDark ? '#0d0c07' : '#1e2a0a'} roughness={0.99} />
      </mesh>
      {/* Mossy ring around trunk — wide enough to frame the roots */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.80, 6.5, 48]} />
        <meshStandardMaterial color={isDark ? '#172010' : '#243814'} roughness={0.99} />
      </mesh>
    </group>
  )
}

// ── Person Olive ──────────────────────────────────────────────────────────
// Each family member IS an olive fruit hanging from the tree
interface OrbProps {
  node: LayoutNode
  maxDepth: number
  isSelected: boolean
  onSelect: (p: Person) => void
  isDark: boolean
}

const PersonOrb = memo(function PersonOrb({ node, maxDepth, isSelected, onSelect, isDark }: OrbProps) {
  const { person, position, depth } = node
  const oliveMeshRef = useRef<THREE.Mesh>(null!)
  const glowRef      = useRef<THREE.Mesh>(null!)
  const swayRef      = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)
  const language = useLanguage()

  // Load the actual Blender olive geometry (useGLTF caches — safe per-instance)
  const { scene: fruitScene } = useGLTF('/olive-fruit.glb')
  const oliveFruitGeo = useMemo<THREE.BufferGeometry | null>(() => {
    let geo: THREE.BufferGeometry | null = null
    fruitScene.traverse((obj: THREE.Object3D) => {
      if (!geo && (obj as THREE.Mesh).isMesh) geo = (obj as THREE.Mesh).geometry
    })
    return geo
  }, [fruitScene])

  const isPatriarch = person.id === 'abubakr'
  const isFemale    = person.gender === 'female'
  const isDeceased  = !!person.deathYear

  const displayName = language === 'ar' && person.firstNameAr ? person.firstNameAr : person.firstName
  const initial     = displayName.charAt(0).toUpperCase()

  // Uniform scale applied to the GLB fruit mesh.
  // At scale=1 the olive is 0.099 Three.js units tall (Y-extent from Blender export_yup).
  // oliveHalfH = 0.0495 * oliveScale  →  full height = oliveHalfH * 2
  const oliveScale = isPatriarch ? 8.0 : Math.max(4.0, 6.5 - (depth / Math.max(maxDepth, 1)) * 2.5)
  const oliveHalfH = 0.0495 * oliveScale

  // Realistic olive colours — deep, almost black-green like actual Kalamata olives
  // Emissive is only used as a glow tint when hovered/selected; default is 0.
  const baseColor   = isPatriarch ? '#3a5c12' : isFemale ? '#2a4a18' : '#1a3010'
  const emissiveCol = isPatriarch ? '#7ab020' : isFemale ? '#4a7a28' : '#2a5018'

  const labelCol = isDark
    ? (isPatriarch ? '#c8e870' : isFemale ? '#90cc70' : '#6aaa48')
    : (isPatriarch ? '#2e4208' : isFemale ? '#243618' : '#182a0c')

  // Per-olive seeded values: stable tilt + phase offset
  const seed  = useMemo(() => ((person.id.charCodeAt(0) || 0) + (person.id.charCodeAt(1) || 0)) / 150, [person.id])
  const tiltX = useMemo(() => (seededRand(seed * 100) - 0.5) * 0.30, [seed])
  const tiltZ = useMemo(() => (seededRand(seed * 200) - 0.5) * 0.30, [seed])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 6.28

    // Gentle pendulum sway — feels like hanging in a breeze
    if (swayRef.current) {
      swayRef.current.rotation.x = tiltX + Math.sin(t * 0.65 + seed) * 0.025
      swayRef.current.rotation.z = tiltZ + Math.cos(t * 0.50 + seed * 1.3) * 0.022
    }

    if (oliveMeshRef.current) {
      // Scale: pop up when hovered/selected, gentle patriarch breath
      const want = isPatriarch
        ? 1 + Math.sin(t * 1.1) * 0.05
        : (isSelected || hovered) ? 1.30 : 1.0
      const cur = oliveMeshRef.current.scale.x
      oliveMeshRef.current.scale.set(
        cur + (want - cur) * 0.10,
        cur + (want - cur) * 0.10,
        cur + (want - cur) * 0.10,
      )
      // Emissive: 0 at rest so the actual olive shape is visible from lighting.
      // Only glows when interacted with so the 3D olive geometry reads clearly.
      const mat = oliveMeshRef.current.material as THREE.MeshStandardMaterial
      const wantE = isPatriarch
        ? 0.08 + Math.sin(t * 1.1) * 0.04   // very subtle patriarch shimmer
        : (isSelected || hovered) ? 0.70      // bright glow on interaction
        : isDeceased ? 0.0
        : 0.0                                  // zero — rely on scene lighting
      mat.emissiveIntensity += (wantE - mat.emissiveIntensity) * 0.10
    }

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      // Glow sphere only visible on interaction / patriarch
      const want = isPatriarch ? 0.08 : (isSelected || hovered) ? 0.18 : 0
      mat.opacity += (want - mat.opacity) * 0.12
    }
  })

  // Don't render until the GLB geometry is available (preloaded, so essentially instant)
  if (!oliveFruitGeo) return null

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Glow aura — stays spherical, not inside sway group */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[oliveHalfH * 2.8, 12, 10]} />
        <meshBasicMaterial color={emissiveCol} transparent opacity={0} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/* The olive fruit itself — tilted, swaying in the breeze */}
      <group ref={swayRef}>
        {/* Thin stem connecting to branch above */}
        <mesh position={[0, oliveHalfH + 0.09, 0]}>
          <cylinderGeometry args={[0.010, 0.007, 0.18, 4]} />
          <meshStandardMaterial color="#2a4010" roughness={0.92} />
        </mesh>

        {/* Olive body: actual Blender 3D geometry, scaled per generation */}
        <group scale={[oliveScale, oliveScale, oliveScale]}>
          <mesh
            ref={oliveMeshRef}
            geometry={oliveFruitGeo}
            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(person) }}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = '' }}
          >
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveCol}
              emissiveIntensity={0.0}
              roughness={isPatriarch ? 0.30 : 0.52}
              metalness={0.06}
            />
          </mesh>
        </group>

        {/* Initial — billboarded so it always faces camera from any orbit angle */}
        <Billboard>
          <Text
            position={[0, 0, 0]}
            fontSize={isPatriarch ? 0.22 : Math.max(0.055, oliveHalfH * 0.55)}
            color="#ffffff" anchorX="center" anchorY="middle"
            renderOrder={10}
          >
            {initial}
          </Text>
        </Billboard>
      </group>

      {/* Name label — billboarded so it never appears reversed when orbiting */}
      <Billboard>
        <Text
          position={[0, oliveHalfH + 0.34, 0]}
          fontSize={isPatriarch ? 0.22 : Math.max(0.075, 0.16 - depth * 0.009)}
          color={labelCol} anchorX="center" anchorY="bottom"
          renderOrder={100} maxWidth={2.4}
        >
          {`${displayName}${isDeceased ? ' †' : ''}`}
        </Text>
      </Billboard>
    </group>
  )
})

// ── Scene fog ─────────────────────────────────────────────────────────────
function SceneFog({ isDark }: { isDark: boolean }) {
  const { scene } = useThree()
  useEffect(() => {
    scene.fog = new THREE.FogExp2(isDark ? '#0c0906' : '#e8e0d0', 0.007)
    return () => { scene.fog = null }
  }, [scene, isDark])
  return null
}

// ── Scene ─────────────────────────────────────────────────────────────────
interface SceneProps {
  people: Person[]
  selectedPersonId: string | null
  onSelectPerson: (p: Person) => void
  isDark: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionsRef: React.MutableRefObject<TreeView3DHandle>
}

function Scene({ people, selectedPersonId, onSelectPerson, isDark, actionsRef }: SceneProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null!)
  const { nodes, nodeMap, maxDepth } = useMemo(() => computeLayout(people), [people])
  const treeHeight = TRUNK_TOP_Y

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

  const canopyMid = 3.2  // orbit target at canopy mid-height (boughs Y≈3.8, fruits Y=1.2–7.6)

  return (
    <>
      <color attach="background" args={[isDark ? '#0c0906' : '#e8e0d0']} />
      <SceneFog isDark={isDark} />

      {/* ── Mediterranean lighting ── */}
      <ambientLight intensity={isDark ? 0.16 : 0.58} />
      {/* Golden afternoon sun — upper left */}
      <directionalLight position={[-9, 18, 8]} intensity={isDark ? 1.6 : 2.6} color={isDark ? '#fff3cc' : '#ffe57a'} />
      {/* Cool sky bounce */}
      <directionalLight position={[8, 12, -6]} intensity={isDark ? 0.25 : 0.45} color={isDark ? '#c8d8ff' : '#a5d8ff'} />
      {/* Warm root uplight */}
      <pointLight position={[0, -0.5, 0]} intensity={isDark ? 0.80 : 0.32} color="#dd7a0a" />
      {/* Canopy green rim */}
      <pointLight position={[0, treeHeight * 0.7, 0]} intensity={isDark ? 0.30 : 0.12} color={isDark ? '#44dd44' : '#a5d6a7'} />

      {/* ── Environment ── */}
      {isDark && <NightStars />}
      <Ground isDark={isDark} />

      {/* ── The tree — Blender GLB model ── */}
      <Suspense fallback={null}>
        <GLBTree />
      </Suspense>

      {/* No procedural branches — the GLB tree's bark IS the visual lineage */}

      {/* ── Canopy ── */}
      <LeafClusters nodes={nodes} isDark={isDark} />
      <FallingLeaves treeHeight={treeHeight} />

      {/* ── Family members ── */}
      {nodes.map(n => (
        <PersonOrb
          key={n.person.id}
          node={n}
          maxDepth={maxDepth}
          isSelected={selectedPersonId === n.person.id}
          onSelect={onSelectPerson}
          isDark={isDark}
        />
      ))}

      {/* ── Full 360° rotation ── */}
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping dampingFactor={0.07}
        target={[0, canopyMid, 0]}
        minDistance={3} maxDistance={90}
        minPolarAngle={0.04} maxPolarAngle={Math.PI * 0.87}
        enableRotate screenSpacePanning={false}
      />

      {/* ── Post-processing ── */}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {/* Threshold raised so unlit olive geometry never blooms.
            Bloom fires only when emissive spikes on hover/select. */}
        <Bloom luminanceThreshold={isDark ? 0.52 : 0.60} luminanceSmoothing={0.80}
               intensity={isDark ? 1.2 : 0.35} mipmapBlur />
        <Vignette offset={0.14} darkness={isDark ? 0.58 : 0.24} />
      </EffectComposer>
    </>
  )
}

// ── Public component ───────────────────────────────────────────────────────
interface Props {
  people: Person[]
  selectedPersonId: string | null
  onSelectPerson: (p: Person) => void
  isDark: boolean
}

const OliveTreeView = forwardRef<TreeView3DHandle, Props>(function OliveTreeView(
  { people, selectedPersonId, onSelectPerson, isDark }, ref,
) {
  const actionsRef = useRef<TreeView3DHandle>({ zoomIn: () => {}, zoomOut: () => {}, fitView: () => {} })
  useImperativeHandle(ref, () => ({
    zoomIn:  () => actionsRef.current.zoomIn(),
    zoomOut: () => actionsRef.current.zoomOut(),
    fitView: () => actionsRef.current.fitView(),
  }))

  return (
    <Canvas
      camera={{ position: [16, 18, 28], fov: 54 }}
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
          actionsRef={actionsRef}
        />
      </Suspense>
    </Canvas>
  )
})

export default OliveTreeView
