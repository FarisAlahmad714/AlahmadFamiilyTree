'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import dagre from '@dagrejs/dagre'
import type { FamilyData, Person } from '@/lib/family-data'
import type { Session } from '@/lib/auth'
import { LanguageContext, type Language } from '@/lib/language-context'
import PersonNode, { type PersonNodeType } from './PersonNode'
import FloatingControls from './FloatingControls'
import PersonDetailPanel from './PersonDetailPanel'
import AddMemberModal from './AddMemberModal'
import TreeView3D, { type TreeView3DHandle } from './TreeView3D'

const nodeTypes = { person: PersonNode }

// All descendants (children, grandchildren, …) of a given node
function getDescendants(people: Person[], nodeId: string): Set<string> {
  const result = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const p of people) {
      if (p.parentId === current && !result.has(p.id)) {
        result.add(p.id)
        queue.push(p.id)
      }
    }
  }
  return result
}

// Direct-child counts across the whole dataset (for the collapse button label)
function getChildCounts(people: Person[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const p of people) {
    if (p.parentId) counts.set(p.parentId, (counts.get(p.parentId) ?? 0) + 1)
  }
  return counts
}

function getLayoutedElements(
  people: Person[],
  collapsedIds: Set<string>,
  onToggleCollapse: (id: string) => void
): { nodes: PersonNodeType[]; edges: Edge[] } {
  // 1. Compute which nodes are hidden (descendants of collapsed nodes)
  const hiddenIds = new Set<string>()
  for (const cid of collapsedIds) {
    getDescendants(people, cid).forEach((id) => hiddenIds.add(id))
  }

  const visible = people.filter((p) => !hiddenIds.has(p.id))
  const childCounts = getChildCounts(people) // use ALL people for accurate counts

  // 2. Build dagre graph from visible nodes
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 130, marginx: 60, marginy: 60 })

  const W = 196
  const H = 120

  for (const p of visible) {
    g.setNode(p.id, { width: W, height: H })
  }
  for (const p of visible) {
    if (p.parentId && !hiddenIds.has(p.parentId)) {
      g.setEdge(p.parentId, p.id)
    }
  }

  dagre.layout(g)

  // 3. Build React Flow nodes
  const nodes: PersonNodeType[] = visible.map((p) => {
    const pos = g.node(p.id)
    return {
      id: p.id,
      type: 'person' as const,
      position: { x: pos.x - W / 2, y: pos.y - H / 2 },
      data: {
        person: p,
        hasChildren: (childCounts.get(p.id) ?? 0) > 0,
        totalChildren: childCounts.get(p.id) ?? 0,
        isCollapsed: collapsedIds.has(p.id),
        onToggleCollapse,
      },
    }
  })

  // 4. Build edges (parent → child, smoothstep)
  const edges: Edge[] = visible
    .filter((p) => p.parentId && !hiddenIds.has(p.parentId))
    .map((p) => ({
      id: `${p.parentId}->${p.id}`,
      source: p.parentId!,
      target: p.id,
      type: 'smoothstep',
      style: { stroke: 'var(--edge-color)', strokeWidth: 2 },
    }))

  return { nodes, edges }
}

interface Props {
  initialData: FamilyData
  session: Session
}

function FamilyTreeInner({ initialData, session }: Props) {
  const [familyData, setFamilyData] = useState<FamilyData>(initialData)
  const [isDark, setIsDark] = useState(true)
  const [language, setLanguage] = useState<Language>('en')
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMinimap, setShowMinimap] = useState(true)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'graph' | 'tree3d'>('graph')
  const tree3dRef = useRef<TreeView3DHandle>(null)

  // Stable toggle function — safe to use as useEffect dep
  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Seed initial state
  const seed = getLayoutedElements(initialData.people, new Set(), handleToggleCollapse)
  const [nodes, setNodes, onNodesChange] = useNodesState<PersonNodeType>(seed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(seed.edges)

  // Re-layout whenever data or collapsed state changes
  useEffect(() => {
    const { nodes: n, edges: e } = getLayoutedElements(
      familyData.people,
      collapsedNodes,
      handleToggleCollapse
    )
    setNodes(n)
    setEdges(e)
  }, [familyData, collapsedNodes, handleToggleCollapse, setNodes, setEdges])

  const refreshTree = useCallback((data: FamilyData) => {
    setFamilyData(data)
  }, [])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const person = familyData.people.find((p) => p.id === node.id) ?? null
      setSelectedPerson(person)
    },
    [familyData]
  )

  const toggleTheme = () => {
    const html = document.documentElement
    if (isDark) {
      html.classList.remove('dark')
      html.classList.add('light')
    } else {
      html.classList.remove('light')
      html.classList.add('dark')
    }
    setIsDark(!isDark)
  }

  const handleAddMember = async (personData: Omit<Person, 'id'>) => {
    const res = await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personData),
    })
    if (res.ok) {
      const newPerson: Person = await res.json()
      refreshTree({ people: [...familyData.people, newPerson] })
      setShowAddModal(false)
    }
  }

  return (
    <LanguageContext.Provider value={language}>
    <div className="w-screen h-screen relative" style={{ background: 'var(--bg-primary)' }}>
      {viewMode === 'graph' ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedPerson(null)}
          nodesDraggable={false}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.05}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={1}
            color={isDark ? 'rgba(99,102,241,0.11)' : 'rgba(180,120,40,0.11)'}
          />
          {showMinimap && (
            <MiniMap
              nodeColor={(n) => {
                const p = (n.data as { person: Person }).person
                if (p.id === 'abubakr') return isDark ? '#6366f1' : '#b45309'
                if (p.gender === 'female') return isDark ? 'rgba(236,72,153,0.7)' : 'rgba(190,70,120,0.7)'
                return isDark ? 'rgba(99,102,241,0.55)' : 'rgba(180,120,40,0.55)'
              }}
              maskColor={isDark ? 'rgba(2,8,23,0.72)' : 'rgba(253,248,240,0.72)'}
              position="bottom-left"
              style={{ margin: '16px' }}
            />
          )}
        </ReactFlow>
      ) : (
        <TreeView3D
          ref={tree3dRef}
          people={familyData.people}
          selectedPersonId={selectedPerson?.id ?? null}
          onSelectPerson={(p) => setSelectedPerson(p)}
          isDark={isDark}
        />
      )}

      {/* Title */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-center"
        >
          <h1
            className="text-xl font-bold tracking-wide"
            style={{ color: 'var(--text-primary)', textShadow: '0 0 28px var(--accent-glow)' }}
          >
            Alahmad Family Tree
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {familyData.people.length} members · Rooted in AbuBakr · {collapsedNodes.size > 0 && `${collapsedNodes.size} branch${collapsedNodes.size > 1 ? 'es' : ''} collapsed`}
          </p>
        </motion.div>
      </div>

      <FloatingControls
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        showMinimap={showMinimap}
        onAddMember={() => setShowAddModal(true)}
        canAdd={!!session}
        session={session}
        onExpandAll={() => setCollapsedNodes(new Set())}
        hasCollapsed={collapsedNodes.size > 0}
        language={language}
        onToggleLanguage={() => setLanguage(l => l === 'en' ? 'ar' : 'en')}
        viewMode={viewMode}
        onToggleView={() => setViewMode(m => m === 'graph' ? 'tree3d' : 'graph')}
        onZoomIn={viewMode === 'tree3d' ? () => tree3dRef.current?.zoomIn() : undefined}
        onZoomOut={viewMode === 'tree3d' ? () => tree3dRef.current?.zoomOut() : undefined}
        onFitView={viewMode === 'tree3d' ? () => tree3dRef.current?.fitView() : undefined}
      />

      <AnimatePresence>
        {selectedPerson && (
          <PersonDetailPanel
            key={selectedPerson.id}
            person={selectedPerson}
            allPeople={familyData.people}
            onClose={() => setSelectedPerson(null)}
            session={session}
            onUpdate={async (updates) => {
              const res = await fetch(`/api/family/${selectedPerson.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              })
              if (res.ok) {
                const updated: Person = await res.json()
                refreshTree({
                  people: familyData.people.map((p) => (p.id === updated.id ? updated : p)),
                })
                setSelectedPerson(updated)
              }
            }}
            onDelete={
              session.role === 'moderator'
                ? async () => {
                    await fetch(`/api/family/${selectedPerson.id}`, { method: 'DELETE' })
                    refreshTree({ people: familyData.people.filter((p) => p.id !== selectedPerson.id) })
                    setSelectedPerson(null)
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <AddMemberModal
            allPeople={familyData.people}
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddMember}
          />
        )}
      </AnimatePresence>
    </div>
    </LanguageContext.Provider>
  )
}

export default function FamilyTreeClient({ initialData, session }: Props) {
  return (
    <ReactFlowProvider>
      <FamilyTreeInner initialData={initialData} session={session} />
    </ReactFlowProvider>
  )
}
