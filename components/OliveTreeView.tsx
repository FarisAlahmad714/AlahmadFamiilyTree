'use client'

import {
  useRef, useMemo, useEffect, useState,
  forwardRef, useImperativeHandle, Suspense, memo,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Text, useGLTF, Billboard, Sky } from '@react-three/drei'
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

// ── Bough fruit pools (fruits grouped by their actual Blender bough) ────────
// Each named bough (N/S/E/W/NE/NW/SE + T2a/T2b) gets its own fruit pool.
// Family branches are locked to specific boughs so families never mix.
const BOUGH_AZ: Record<string, number> = {
  'Bough_E':    2.6  * (Math.PI / 180),
  'Bough_T2b':  16.3 * (Math.PI / 180),
  'Bough_SE':   57.7 * (Math.PI / 180),
  'Bough_S':   100.8 * (Math.PI / 180),
  'Bough_W':  -177.7 * (Math.PI / 180),
  'Bough_NW': -129.9 * (Math.PI / 180),
  'Bough_NE':  -40.4 * (Math.PI / 180),
  'Bough_N':   -8.3  * (Math.PI / 180),
  'Bough_T2a': -18.1 * (Math.PI / 180),
}
const BOUGH_FRUITS: Record<string, [number, number, number][]> = {
  'Bough_E': [
    [9.391, 5.369, 0.937], [7.787, 4.986, 0.497], [10.112, 4.462, 1.164],
    [8.805, 3.745, 0.434], [9.818, 2.945, 0.594], [8.753, 2.791, 0.432],
    [9.524, 2.388, 0.945], [8.098, 2.294, 1.233], [10.068, 2.245, 0.031],
  ],
  'Bough_T2b': [
    [7.022, 5.558, 1.689], [9.885, 5.041, 1.69],  [8.366, 3.981, 3.181],
    [9.45,  3.595, 4.092], [10.578,3.566, 3.626],  [9.629, 3.5,   2.743],
    [9.939, 3.403, 2.285], [6.377, 2.94,  4.235],  [5.671, 2.861, 1.877],
    [6.74,  2.844, 4.174], [6.265, 2.708, 3.393],  [5.501, 2.622, 2.291],
    [7.738, 2.596, 2.991], [10.194,2.21,  2.771],  [8.031, 1.425, 1.489],
  ],
  'Bough_SE': [
    [1.905, 4.824, 9.408], [2.134, 3.843, 8.871], [1.703, 3.735, 7.171],
    [2.267, 3.691, 7.992], [6.666, 3.278, 8.411], [5.421, 3.193, 7.243],
    [6.658, 3.001, 8.146], [4.192, 2.737, 8.638], [7.371, 2.648, 8.301],
    [5.674, 2.218, 9.105],
  ],
  'Bough_S': [
    [1.753, 5.692, 9.926],  [1.137, 5.412, 9.27],   [1.128, 5.245, 9.177],
    [-2.457,4.834, 8.847],  [-2.528,4.814, 9.23],   [1.325, 4.741, 8.588],
    [0.637, 4.493, 9.332],  [-3.55, 4.412, 7.064],  [1.487, 4.371, 8.247],
    [-3.2,  4.291, 9.868],  [-2.476,3.979, 7.381],  [-2.622,3.931, 8.43],
    [1.191, 3.649, 8.418],  [0.068, 3.38,  6.523],
  ],
  'Bough_W': [
    [-8.773,5.953,-1.474],  [-7.92, 5.148,-2.517],  [-8.151,5.075,-2.294],
    [-9.01, 5.058,-3.25],   [-9.104,4.831,-0.319],  [-9.487,4.726,-2.824],
    [-8.404,4.449,-2.001],  [-7.693,4.27, -2.024],  [-9.562,4.241,-2.631],
    [-5.444,4.212,-2.134],  [-8.047,4.104,-2.864],  [-7.281,4.048,-0.503],
    [-6.692,3.742,-1.466],  [-7.207,3.48, -1.228],  [-6.605,3.409,-2.961],
    [-9.57, 3.399, 2.96],   [-10.423,3.27, 3.557],  [-8.536,3.265, 2.379],
    [-9.461,2.895, 3.974],  [-10.983,2.832,1.568],  [-8.884,2.518, 1.035],
  ],
  'Bough_NW': [
    [-6.499,5.697,-6.74],   [-6.425,5.671,-7.139],  [-8.775,5.399,-4.643],
    [-4.601,5.317,-7.872],  [-6.508,5.284,-7.199],  [-8.042,5.227,-4.592],
    [-6.325,5.091,-7.818],  [-9.089,5.019,-5.341],  [-6.249,5.013,-4.685],
  ],
  'Bough_NE': [
    [6.424, 7.098,-4.088],  [7.98,  6.3,  -4.576],  [7.316, 6.156,-5.915],
    [7.643, 6.003,-7.881],  [7.658, 5.766,-6.467],  [6.316, 5.737,-6.779],
    [8.251, 5.35, -5.639],  [6.857, 4.909,-8.55],   [6.7,   3.737,-4.386],
  ],
  'Bough_N': [
    [9.081, 6.261,-0.875],  [9.153, 5.553,-1.938],  [10.398,4.754,-0.96],
    [10.348,4.66, -2.051],  [8.078, 4.638,-1.147],  [6.803, 4.285,-0.359],
    [10.384,4.234,-1.302],  [10.851,4.225,-1.9],    [6.42,  3.947,-1.498],
    [6.289, 3.691,-0.684],  [7.609, 3.434,-1.449],
  ],
  'Bough_T2a': [
    [8.287, 7.304,-4.39],   [8.568, 7.169,-2.522],  [8.469, 6.996,-3.73],
    [7.456, 6.7,  -2.956],  [9.904, 6.467,-2.464],  [7.633, 6.149,-2.461],
    [9.124, 5.504,-3.736],  [10.62, 5.037,-2.968],  [8.8,   4.853,-2.618],
    [6.682, 3.948,-3.473],  [6.953, 3.466,-2.229],  [8.289, 3.323,-4.195],
    [7.395, 3.101,-2.672],  [7.328, 3.041,-2.584],  [6.261, 2.911,-2.682],
    [6.868, 2.87, -3.526],
  ],
}
// Boughs sorted clockwise by azimuth (used for bough → family assignment)
const BOUGHS_SORTED = Object.keys(BOUGH_AZ).sort((a, b) => BOUGH_AZ[a] - BOUGH_AZ[b])

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

  // ── Phase 2: hard bough partitioning ─────────────────────────────────────
  // Each top-level family branch (depth=1) is locked to one Blender bough.
  // All descendants inherit that bough. Families are guaranteed to never mix.

  // 2a. Build per-bough mutable pools
  const boughPools: Record<string, Array<{x:number;y:number;z:number;taken:boolean}>> = {}
  for (const [b, fruits] of Object.entries(BOUGH_FRUITS)) {
    boughPools[b] = fruits.map(([x,y,z]) => ({x,y,z,taken:false}))
  }
  // Fallback pool for overflow (shouldn't happen normally)
  const fallbackPool = RAW_OLIVE_POSITIONS.map(([x,y,z]) => ({x,y,z,taken:false}))

  // 2b. Assign each top-level child (depth=1) to the nearest unused bough
  const depth1Ids = people
    .filter(p => (depthOf.get(p.id) ?? 0) === 1)
    .sort((a,b) => (azCenterOf.get(a.id)??0) - (azCenterOf.get(b.id)??0))

  const boughOf = new Map<string, string>()  // personId → boughName
  const usedBoughs = new Set<string>()

  function azAngDiff(a: number, b: number): number {
    const d = Math.abs(a - b) % (2 * Math.PI)
    return d > Math.PI ? 2 * Math.PI - d : d
  }

  for (const p of depth1Ids) {
    const pAz = azCenterOf.get(p.id) ?? 0
    // Prefer unused boughs; if all used, allow reuse (large families)
    let bestB = BOUGHS_SORTED[0], bestScore = Infinity
    for (const b of BOUGHS_SORTED) {
      const diff = azAngDiff(BOUGH_AZ[b], pAz)
      const penalty = usedBoughs.has(b) ? Math.PI : 0
      if (diff + penalty < bestScore) { bestScore = diff + penalty; bestB = b }
    }
    boughOf.set(p.id, bestB)
    usedBoughs.add(bestB)
  }

  // 2c. Propagate bough assignment down to all descendants
  function propagateBough(id: string, bough: string) {
    boughOf.set(id, bough)
    for (const c of (childrenOf.get(id) ?? [])) propagateBough(c.id, bough)
  }
  for (const p of depth1Ids) propagateBough(p.id, boughOf.get(p.id)!)

  // 2d. Assign fruit positions depth-by-depth within each bough's pool
  const positions = new Map<string, THREE.Vector3>()
  const byDepth = new Map<number, string[]>()
  for (const p of people) {
    const d = depthOf.get(p.id) ?? 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(p.id)
  }

  for (let d = 0; d <= maxDepth; d++) {
    const ids = (byDepth.get(d) ?? [])
      .slice()
      .sort((a,b) => (azCenterOf.get(a)??0) - (azCenterOf.get(b)??0))

    for (const id of ids) {
      if (d === 0) {
        positions.set(id, new THREE.Vector3(0, TRUNK_TOP_Y, 0))
        continue
      }
      const t = Math.min((d - 1) / Math.max(maxDepth - 1, 1), 1)
      const targetY = 6.8 - t * 5.2

      const bough = boughOf.get(id) ?? BOUGHS_SORTED[0]
      const pool = boughPools[bough]

      let best = -1, bestScore = Infinity
      for (let i = 0; i < pool.length; i++) {
        if (pool[i].taken) continue
        // Within a bough: primary sort by Y (generation), tiny az nudge for siblings
        const yDiff = Math.abs(pool[i].y - targetY)
        const fAz = Math.atan2(pool[i].z, pool[i].x)
        const aDiff = azAngDiff(fAz, azCenterOf.get(id) ?? 0)
        const score = yDiff * 1.0 + aDiff * 0.3
        if (score < bestScore) { bestScore = score; best = i }
      }
      if (best >= 0) {
        pool[best].taken = true
        const {x,y,z} = pool[best]
        positions.set(id, new THREE.Vector3(x, y, z))
      } else {
        // Bough exhausted — spill to fallback (global pool)
        let fb = -1, fbScore = Infinity
        for (let i = 0; i < fallbackPool.length; i++) {
          if (fallbackPool[i].taken) continue
          const score = Math.abs(fallbackPool[i].y - targetY)
          if (score < fbScore) { fbScore = score; fb = i }
        }
        if (fb >= 0) {
          fallbackPool[fb].taken = true
          const {x,y,z} = fallbackPool[fb]
          positions.set(id, new THREE.Vector3(x, y, z))
        }
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

function GLBTree({ isDark }: { isDark: boolean }) {
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
          // Night: slightly brighter leaves so moonlight has something to catch
          color: isDark ? '#3a5018' : '#2e3d10', roughness: 0.82, metalness: 0.04,
          side: THREE.DoubleSide,
        })
        mesh.castShadow    = true
        mesh.receiveShadow = true
      } else if (isBark) {
        mesh.material = new THREE.MeshStandardMaterial({
          // Night: raise bark lightness so the moon can actually illuminate it;
          // the bark is near-black in day and reads as dark wood at night.
          color: isDark ? '#3a2210' : '#1a0d05',
          roughness: isDark ? 0.88 : 0.97,
          metalness: 0.0,
        })
        mesh.castShadow    = true
        mesh.receiveShadow = true
      } else if (isFruit) {
        mesh.visible = false
      }
    })
    return c
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, isDark])
  return <primitive object={cloned} position={[0, GLB_Y, 0]} scale={[GLB_SCALE, GLB_SCALE, GLB_SCALE]} />
}

// OliveTrunk and Branch removed — the Blender GLB provides trunk, boughs, and roots

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

// ── Palestinian sky — day only ────────────────────────────────────────────
// Sun direction matches the scene's directional light at [-9, 18, 8].
function PalestinianSky() {
  return (
    <Sky
      distance={450000}
      sunPosition={[-9, 18, 8]}
      turbidity={5}
      rayleigh={1.0}
      mieCoefficient={0.005}
      mieDirectionalG={0.82}
    />
  )
}

// ── Terrain height at any (x, z) world position ───────────────────────────
// Single source of truth used by both LargeTerrain vertex displacement
// and by all scenery elements (walls, trees, grass, poppies) so everything
// sits flush on the same rolling surface.
function terrainY(x: number, z: number): number {
  const r    = Math.sqrt(x * x + z * z)
  // Gaussian flat zone — keeps the ground level around the tree intact
  const flat = Math.exp(-r * r / (18 * 18))
  // Jenin-style gentle rolling hills (wavelength 100–280 units)
  const hill =
    Math.sin(x * 0.022 + 0.8) * 5.0 +
    Math.cos(z * 0.018 - 0.4) * 4.0 +
    Math.sin((x + z * 0.7) * 0.030) * 2.5
  // -2.22 keeps the terrain 2 cm below the Ground circle to avoid z-fighting
  return -2.22 + (1 - flat) * Math.max(0, hill * 0.5)
}

// ── Rolling farmland terrain ──────────────────────────────────────────────
// 400 × 400 unit plane with 80 × 80 subdivisions. The vertex shader-less
// displacement is baked into the geometry once (useMemo) — zero per-frame cost.
function LargeTerrain({ isDark }: { isDark: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(400, 400, 80, 80)
    g.rotateX(-Math.PI / 2)   // lie flat; after rotation: X→X, Z→Z, Y→up
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainY(pos.getX(i), pos.getZ(i)))
    }
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial
        color={isDark ? '#1e3014' : '#2d4c12'}
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}

// ── Grass — dense, irregular patches like real field growth ──────────────
// 16 patch centres scattered organically. Each blade belongs to one patch,
// concentrated toward the patch centre (quadratic falloff). Patches vary
// wildly in radius and blade height so you see distinct clumps, bare
// intervals, and a few tall-grass zones — not a smooth carpet.
const GRASS_COUNT = 2600
// Patch definitions: [cx, cz, patchRadius, maxBladeH]
// Generated once at module load — seededRand is pure/deterministic.
const GRASS_PATCHES: [number, number, number, number][] = Array.from({ length: 16 }, (_, p) => {
  const a = seededRand(p * 9.31) * Math.PI * 2
  const r = 16 + seededRand(p * 5.73) * 62
  return [
    Math.cos(a) * r,
    Math.sin(a) * r,
    5 + seededRand(p * 3.11) * 11,      // patch radius 5–16
    0.05 + seededRand(p * 7.91) * 0.17, // blade height 0.05–0.22
  ]
})

function GrassBlades({ isDark }: { isDark: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < GRASS_COUNT; i++) {
      const pi                        = Math.floor(seededRand(i * 13.7) * GRASS_PATCHES.length)
      const [pcx, pcz, patchR, maxH] = GRASS_PATCHES[pi]
      // Quadratic inward falloff: blades cluster toward the patch centre
      const localR = patchR * Math.sqrt(seededRand(i * 3.14))
      const localA = seededRand(i * 7.11) * Math.PI * 2
      const x = pcx + Math.cos(localA) * localR
      const z = pcz + Math.sin(localA) * localR
      // Don't place inside the tree-base clearing
      if (Math.sqrt(x * x + z * z) < 14) {
        dummy.position.set(0, -200, 0); dummy.scale.setScalar(0)
        dummy.updateMatrix(); meshRef.current.setMatrixAt(i, dummy.matrix)
        continue
      }
      const h = maxH * 0.28 + seededRand(i * 11.3) * maxH * 0.72
      dummy.position.set(x, terrainY(x, z) + h * 0.5, z)
      dummy.rotation.set(0, seededRand(i * 5.5) * Math.PI, 0)
      dummy.scale.set(1, h / 0.14, 1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, GRASS_COUNT]} receiveShadow>
      <planeGeometry args={[0.035, 0.14]} />
      <meshStandardMaterial
        color={isDark ? '#293e18' : '#3a5e18'}
        side={THREE.DoubleSide}
        roughness={0.92}
        transparent
        opacity={isDark ? 0.58 : 0.76}
      />
    </instancedMesh>
  )
}

// ── Dry-stone terrace walls — organic arc segments ────────────────────────
// Real Palestinian terrace walls follow contour lines in broken arcs — they
// are never closed circles. Each arc here is an independent segment with a
// radius wobble so the wall "breathes" with the terrain rather than forming
// a perfect geometric ring. Three elevation tiers, ten arc pieces total.
//
// Format: [startAngle, endAngle, baseRadius]  (angles in radians)
const WALL_ARC_DEFS: [number, number, number][] = [
  // Inner tier (~r 20–22) — three short, offset arcs
  [0.20,  1.65,  21],
  [2.55,  3.95,  20],
  [4.70,  5.80,  22],
  // Mid tier (~r 36–39) — four longer arcs, each at a different azimuth
  [0.00,  2.30,  37],
  [2.80,  4.25,  39],
  [4.60,  6.10,  36],
  [6.40,  7.50,  38],
  // Far tier (~r 57–62) — three wide arcs
  [0.30,  2.20,  60],
  [3.10,  4.90,  58],
  [5.50,  7.10,  62],
]
const SEG_ARC_SPACING = 1.60  // world-unit arc-length between block centres
const MAX_WALL_SEGS   = 500   // upper bound; unused slots go underground

function TerraceWalls({ isDark }: { isDark: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    // Initialise all slots underground so un-filled ones stay invisible
    dummy.position.set(0, -200, 0); dummy.scale.setScalar(1); dummy.rotation.set(0,0,0)
    dummy.updateMatrix()
    const underground = dummy.matrix.clone()
    for (let s = 0; s < MAX_WALL_SEGS; s++) meshRef.current.setMatrixAt(s, underground)

    let idx = 0
    for (const [startA, endA, baseR] of WALL_ARC_DEFS) {
      const angularStep = SEG_ARC_SPACING / baseR
      for (let a = startA; a <= endA && idx < MAX_WALL_SEGS; a += angularStep) {
        // Organic radius wobble — makes the wall follow terrain undulation
        const wobble = Math.sin(a * 4.7 + baseR * 0.11) * 1.5
                     + Math.cos(a * 2.3 - baseR * 0.27) * 0.7
        const r = baseR + wobble
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        // ~13 % random weathering gaps — these are LONGER than single blocks
        // because seededRand clusters: several consecutive high values → a run
        if (seededRand(idx * 11.3 + baseR * 0.5) < 0.13) { idx++; continue }
        const yBase   = terrainY(x, z)
        const heightV = (seededRand(idx * 7.3 + baseR) - 0.5) * 0.10
        dummy.position.set(x, yBase + 0.20 + heightV, z)
        dummy.rotation.set(
          (seededRand(idx * 3.1) - 0.5) * 0.10,
          -a + Math.PI * 0.5,
          (seededRand(idx * 7.7) - 0.5) * 0.07,
        )
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(idx++, dummy.matrix)
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_WALL_SEGS]} castShadow receiveShadow>
      <boxGeometry args={[1.55, 0.46, 0.40]} />
      <meshStandardMaterial
        color={isDark ? '#48403a' : '#8c7a62'}
        roughness={0.97}
        metalness={0}
      />
    </instancedMesh>
  )
}

// ── Cypress groves — five tight clusters, not a ring ─────────────────────
// Palestinian landscapes have cypress trees in windbreak lines and family-
// plot boundary clusters, not evenly distributed. Five grove positions are
// handpicked to feel like they define the far boundary of this farm.
// [cx, cz, treeCount, spreadRadius]
const CYPRESS_CLUSTERS: [number, number, number, number][] = [
  [ 82,  16,  5, 6],   // east grove
  [-74,  42,  4, 5],   // west-north grove
  [ 28, -92,  6, 9],   // south grove — largest, dominates south horizon
  [-54, -70,  4, 6],   // south-west grove
  [ 94, -50,  5, 7],   // east-south grove
]
const TOTAL_CYPRESS = CYPRESS_CLUSTERS.reduce((s, c) => s + c[2], 0)

function CypressTrees({ isDark }: { isDark: boolean }) {
  const trunkRef   = useRef<THREE.InstancedMesh>(null!)
  const foliageRef = useRef<THREE.InstancedMesh>(null!)
  useEffect(() => {
    if (!trunkRef.current || !foliageRef.current) return
    const dummy = new THREE.Object3D()
    let idx = 0
    for (const [cx, cz, count, spread] of CYPRESS_CLUSTERS) {
      for (let i = 0; i < count; i++) {
        const localA = seededRand(idx * 9.17) * Math.PI * 2
        const localR = seededRand(idx * 5.31) * spread
        const x      = cx + Math.cos(localA) * localR
        const z      = cz + Math.sin(localA) * localR
        const yBase  = terrainY(x, z)
        const h      = 5.5 + seededRand(idx * 7.71) * 4.5

        dummy.position.set(x, yBase + 0.30, z)
        dummy.rotation.set(0, seededRand(idx * 2.3) * Math.PI * 2, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        trunkRef.current.setMatrixAt(idx, dummy.matrix)

        dummy.position.set(x, yBase + 0.30 + h * 0.5, z)
        dummy.scale.set(1, h / 6.0, 1)
        dummy.updateMatrix()
        foliageRef.current.setMatrixAt(idx, dummy.matrix)
        idx++
      }
    }
    trunkRef.current.instanceMatrix.needsUpdate = true
    foliageRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, TOTAL_CYPRESS]} castShadow>
        <cylinderGeometry args={[0.10, 0.16, 0.60, 6]} />
        <meshStandardMaterial color={isDark ? '#201608' : '#3d2a10'} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={foliageRef} args={[undefined, undefined, TOTAL_CYPRESS]} castShadow>
        <coneGeometry args={[0.62, 6, 7, 1]} />
        <meshStandardMaterial color={isDark ? '#16280e' : '#182e0e'} roughness={0.88} />
      </instancedMesh>
    </>
  )
}

// ── Spring poppies — Palestinian landscape emblem ─────────────────────────
// Red poppies (شقائق النعمان) carpet Palestinian hillsides every spring.
// Day-only: no emissive, no night rendering.
const POPPY_COUNT = 380
function Poppies() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < POPPY_COUNT; i++) {
      const angle = seededRand(i * 4.13) * Math.PI * 2
      const r     = 18 + seededRand(i * 6.27) * 50
      const x     = Math.cos(angle) * r
      const z     = Math.sin(angle) * r
      const yBase = terrainY(x, z)
      const s     = 0.10 + seededRand(i * 9.31) * 0.09
      dummy.position.set(x, yBase + 0.01, z)
      dummy.rotation.set(-Math.PI / 2, 0, seededRand(i * 8.1) * Math.PI * 2)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, POPPY_COUNT]}>
      <circleGeometry args={[0.55, 6]} />
      <meshStandardMaterial color="#c41a1a" roughness={0.75} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

// ── Rock inscription: دار الأحمد / The Alahmad Tree ──────────────────────
// Renders text as a field of small limestone rocks on the ground.
// The browser's Canvas 2D context handles Arabic text shaping (contextual
// letterforms, right-to-left ordering) so we don't need any font library.
//
// Strategy: render text white-on-black in a hidden canvas → sample lit
// pixels at regular intervals → place a stone (dodecahedron) at each
// sampled pixel's world-space position, sitting flush on the terrain.

function sampleTextPixels(
  text: string, rtl: boolean,
  canvasW: number, canvasH: number,
  fontSize: number, step: number,
  strokePx = 0,   // extra px to expand each glyph edge before sampling
): [number, number][] {
  if (typeof document === 'undefined') return []
  const canvas = document.createElement('canvas')
  canvas.width = canvasW; canvas.height = canvasH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvasW, canvasH)
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (rtl) ctx.direction = 'rtl'
  // Stroke-expand first so thin strokes (Arabic connectors, Latin serifs)
  // get solid rock coverage. Round joins keep corners from going spiky.
  if (strokePx > 0) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth   = strokePx * 2   // strokePx extra pixels on every edge
    ctx.lineJoin    = 'round'
    ctx.strokeText(text, canvasW / 2, canvasH / 2)
  }
  ctx.fillStyle = '#fff'
  ctx.fillText(text, canvasW / 2, canvasH / 2)
  const data = ctx.getImageData(0, 0, canvasW, canvasH).data
  const pts: [number, number][] = []
  for (let y = 0; y < canvasH; y += step) {
    for (let x = 0; x < canvasW; x += step) {
      if (data[(y * canvasW + x) * 4] > 100) pts.push([x, y])
    }
  }
  return pts
}

// Inner mesh — only mounted once pts is ready so no default-matrix flash
function RockTextMesh({ pts, isDark }: { pts: [number,number,number][]; isDark: boolean }) {
  const COUNT  = pts.length
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  // useLayoutEffect fires before browser paint — zero-flash matrix init
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    pts.forEach(([x, y, z], i) => {
      const s = 0.12 + seededRand(i * 7.31) * 0.08
      dummy.position.set(x, y, z)
      dummy.rotation.set(
        seededRand(i * 3.11) * Math.PI * 2,
        seededRand(i * 5.71) * Math.PI * 2,
        seededRand(i * 9.33) * Math.PI * 2,
      )
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [pts])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, Math.max(COUNT, 1)]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.42, 0]} />
      <meshStandardMaterial
        color={isDark ? '#5e5850' : '#9e8c72'}
        roughness={0.95}
        metalness={0}
      />
    </instancedMesh>
  )
}

function RockText({ isDark }: { isDark: boolean }) {
  const [pts, setPts] = useState<[number,number,number][]>([])

  useEffect(() => {
    // 0.040 wu/px → letters ≈3.6 wu tall in a 90px canvas.
    // Smaller scale + step=4 packs ~3 rocks across each stroke for solid glyphs.
    const WS = 0.040

    // ── English: "The Alahmad Tree" ──
    // 640px wide canvas, fontSize 72, step 4, strokePx 5.
    // strokePx=5 bloats every glyph edge by 5px so even the thinnest strokes
    // get 2-3 rocks across them.
    const engPx = sampleTextPixels('The Alahmad Tree', false, 640, 90, 72, 4, 5)
    const engPts: [number,number,number][] = engPx.map(([px, py]) => {
      const x = (px - 320) * WS
      const z = 20 + py * WS
      return [x, terrainY(x, z) + 0.18, z]
    })

    // ── Arabic: "دار الأحمد" — back of tree, inside first terrace wall ──
    // strokePx=6 is slightly larger because Arabic connectors are thinner.
    const arPx = sampleTextPixels('دار الأحمد', true, 480, 90, 74, 4, 6)
    const arPts: [number,number,number][] = arPx.map(([px, py]) => {
      const x = (240 - px) * WS          // mirrored for correct RTL reading from back
      const z = -13 - py * WS
      return [x, terrainY(x, z) + 0.18, z]
    })

    setPts([...engPts, ...arPts])
  }, [])

  if (!pts.length) return null
  return <RockTextMesh pts={pts} isDark={isDark} />
}

// ── Ground ────────────────────────────────────────────────────────────────
function Ground({ isDark }: { isDark: boolean }) {
  return (
    <group position={[0, -2.2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial color={isDark ? '#182010' : '#1e2a0a'} roughness={0.99} />
      </mesh>
      {/* Mossy ring around trunk — wide enough to frame the roots */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <ringGeometry args={[0.80, 6.5, 48]} />
        <meshStandardMaterial color={isDark ? '#1f2e14' : '#243814'} roughness={0.99} />
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

// ── Camera-tracked moonlight ───────────────────────────────────────────────
// Directional light that follows the camera position each frame so the lit
// face of the tree is always the one you're looking at, no matter how you orbit.
function CameraLight() {
  const { camera } = useThree()
  const mainRef = useRef<THREE.DirectionalLight>(null!)
  const fillRef = useRef<THREE.DirectionalLight>(null!)
  // Pre-allocate scratch vectors — no GC churn per frame
  const _dir  = useMemo(() => new THREE.Vector3(), [])
  const _left = useMemo(() => new THREE.Vector3(), [])
  const _fill = useMemo(() => new THREE.Vector3(), [])
  const TARGET = useMemo(() => new THREE.Vector3(0, 3.2, 0), [])

  useFrame(() => {
    camera.getWorldDirection(_dir)

    if (mainRef.current) {
      mainRef.current.position.copy(camera.position)
      mainRef.current.target.position.copy(TARGET)
      mainRef.current.target.updateMatrixWorld()
    }
    if (fillRef.current) {
      // Slightly to the left of camera so shadows aren't completely flat
      _left.crossVectors(_dir, camera.up).normalize().multiplyScalar(-7)
      _fill.copy(camera.position).add(_left)
      fillRef.current.position.copy(_fill)
      fillRef.current.target.position.copy(TARGET)
      fillRef.current.target.updateMatrixWorld()
    }
  })

  return (
    <>
      {/* Primary moonlight — always behind the viewer */}
      <directionalLight
        ref={mainRef}
        intensity={4.2}
        color="#d8e8ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      {/* Cool fill — slightly left of POV to prevent flat silhouette */}
      <directionalLight ref={fillRef} intensity={0.55} color="#8898c8" />
    </>
  )
}

// ── Scene fog ─────────────────────────────────────────────────────────────
function SceneFog({ isDark }: { isDark: boolean }) {
  const { scene } = useThree()
  useEffect(() => {
    scene.fog = new THREE.FogExp2(isDark ? '#07101e' : '#b0cce0', 0.006)
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
  const orbitRef   = useRef<any>(null!)
  const { nodes, nodeMap, maxDepth } = useMemo(() => computeLayout(people), [people])
  const nodeMapRef = useRef(nodeMap)
  useEffect(() => { nodeMapRef.current = nodeMap }, [nodeMap])
  const treeHeight = TRUNK_TOP_Y

  // Smooth camera zoom-to target
  const zoomTarget = useRef<THREE.Vector3 | null>(null)
  useFrame(() => {
    if (!zoomTarget.current || !orbitRef.current) return
    const c = orbitRef.current
    c.target.lerp(zoomTarget.current, 0.09)
    // Keep camera at a comfortable distance from the target
    const dir = c.object.position.clone().sub(c.target).normalize()
    const desiredPos = zoomTarget.current.clone().addScaledVector(dir, 14)
    c.object.position.lerp(desiredPos, 0.07)
    c.update()
    // Stop once close enough
    if (c.target.distanceTo(zoomTarget.current) < 0.08) zoomTarget.current = null
  })

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
      zoomToId(id: string) {
        const node = nodeMapRef.current.get(id)
        if (!node) return
        zoomTarget.current = node.position.clone()
      },
    }
  })

  const canopyMid = 1.8  // horizon view: orbit around lower trunk so tree fills the frame

  return (
    <>
      <color attach="background" args={[isDark ? '#07101e' : '#8fbcd6']} />
      <SceneFog isDark={isDark} />

      {/* ── Lighting ── */}

      {/* Hemisphere: sky→ground gradient ambient — never flat.
          Day:  Mediterranean blue sky / warm terracotta earth.
          Night: deep indigo sky / near-black soil. */}
      <hemisphereLight
        args={[
          isDark ? '#2a4090' : '#b0cce8',   // sky colour
          isDark ? '#0d1a08' : '#6b4020',   // ground colour
          isDark ? 0.65 : 0.70,
        ]}
      />

      {isDark ? (
        <>
          {/* Moonlight that always shines from behind the viewer */}
          <CameraLight />
          {/* Overhead moon — gives the terrain top-lit illumination at night */}
          <directionalLight position={[6, 40, 18]} intensity={1.6} color="#b0ccff" />
          {/* Warm orange glow rising from the roots */}
          <pointLight position={[0, -1.0, 0]} intensity={2.0} color="#e05800" distance={22} decay={2} />
          {/* Faint green canopy phosphorescence */}
          <pointLight position={[0, treeHeight * 0.65, 0]} intensity={0.35} color="#33bb33" distance={14} decay={2} />
        </>
      ) : (
        <>
          {/* ── Day: golden afternoon sun from upper-left, casts shadows ── */}
          <directionalLight
            position={[-9, 18, 8]}
            intensity={2.2}
            color="#ffe680"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={1}
            shadow-camera-far={48}
            shadow-camera-left={-16}
            shadow-camera-right={16}
            shadow-camera-top={16}
            shadow-camera-bottom={-4}
            shadow-bias={-0.0005}
          />
          {/* Cool sky-blue fill from opposite side — kills harsh shadow blacks */}
          <directionalLight position={[8, 10, -6]} intensity={0.55} color="#a8d8f8" />
          {/* Warm terracotta bounce off the ground */}
          <pointLight position={[0, -1.2, 0]} intensity={0.30} color="#c86820" distance={14} decay={2} />
        </>
      )}

      {/* ── Environment ── */}
      {isDark && <NightStars />}
      {!isDark && <PalestinianSky />}
      <LargeTerrain isDark={isDark} />
      <Ground isDark={isDark} />
      <GrassBlades isDark={isDark} />
      <TerraceWalls isDark={isDark} />
      <CypressTrees isDark={isDark} />
      {!isDark && <Poppies />}
      <RockText isDark={isDark} />

      {/* ── The tree — Blender GLB model ── */}
      <Suspense fallback={null}>
        <GLBTree isDark={isDark} />
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
    zoomIn:   () => actionsRef.current.zoomIn(),
    zoomOut:  () => actionsRef.current.zoomOut(),
    fitView:  () => actionsRef.current.fitView(),
    zoomToId: (id: string) => actionsRef.current.zoomToId?.(id),
  }))

  return (
    <Canvas
      camera={{ position: [14, 5, 34], fov: 58 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      shadows
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
