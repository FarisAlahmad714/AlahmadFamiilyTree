'use client'

import { useReactFlow } from '@xyflow/react'
import { ZoomIn, ZoomOut, Maximize2, Map, Sun, Moon, UserPlus, LogOut, Expand, Box, Network } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Session } from '@/lib/auth'

interface Props {
  isDark: boolean
  onToggleTheme: () => void
  onToggleMinimap: () => void
  showMinimap: boolean
  onAddMember: () => void
  canAdd: boolean
  session: Session
  onExpandAll: () => void
  hasCollapsed: boolean
  language: 'en' | 'ar'
  onToggleLanguage: () => void
  viewMode: 'graph' | 'tree3d'
  onToggleView: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
}

export default function FloatingControls({
  isDark,
  onToggleTheme,
  onToggleMinimap,
  showMinimap,
  onAddMember,
  canAdd,
  onExpandAll,
  hasCollapsed,
  language,
  onToggleLanguage,
  viewMode,
  onToggleView,
  onZoomIn,
  onZoomOut,
  onFitView,
}: Props) {
  const { zoomIn: rfZoomIn, zoomOut: rfZoomOut, fitView: rfFitView } = useReactFlow()
  const zoomIn = onZoomIn ?? rfZoomIn
  const zoomOut = onZoomOut ?? rfZoomOut
  const fitView = onFitView ?? (() => rfFitView({ padding: 0.1 }))
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  const btn: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    borderRadius: '10px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const divider = (
    <div style={{ height: '1px', background: 'var(--border-color)', margin: '2px 0' }} />
  )

  return (
    <>
      {/* Right-side vertical toolbar */}
      <div
        className="absolute right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2"
        style={{ pointerEvents: 'all' }}
      >
        {/* 3D / Graph toggle */}
        <button
          style={{
            ...btn,
            background: viewMode === 'tree3d' ? 'var(--node-root-bg)' : 'var(--bg-card)',
            borderColor: viewMode === 'tree3d' ? 'var(--accent)' : 'var(--border-color)',
            color: viewMode === 'tree3d' ? 'var(--accent)' : 'var(--text-primary)',
          }}
          onClick={onToggleView}
          title={viewMode === 'tree3d' ? 'Switch to graph view' : 'Switch to 3D tree view'}
        >
          {viewMode === 'tree3d' ? <Network size={17} /> : <Box size={17} />}
        </button>

        {divider}

        <button style={btn} onClick={() => zoomIn()} title="Zoom in">
          <ZoomIn size={17} />
        </button>
        <button style={btn} onClick={() => zoomOut()} title="Zoom out">
          <ZoomOut size={17} />
        </button>
        <button style={btn} onClick={() => fitView()} title="Fit view">
          <Maximize2 size={17} />
        </button>

        {viewMode === 'graph' && (
          <>
            {divider}
            <button
              style={{
                ...btn,
                background: showMinimap ? 'var(--node-root-bg)' : 'var(--bg-card)',
                borderColor: showMinimap ? 'var(--accent)' : 'var(--border-color)',
              }}
              onClick={onToggleMinimap}
              title="Toggle minimap"
            >
              <Map size={17} />
            </button>
          </>
        )}

        <button style={btn} onClick={onToggleTheme} title="Toggle light / dark">
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          style={{
            ...btn,
            fontFamily: 'serif',
            fontSize: '12px',
            fontWeight: 700,
            background: language === 'ar' ? 'var(--node-root-bg)' : 'var(--bg-card)',
            borderColor: language === 'ar' ? 'var(--accent)' : 'var(--border-color)',
            color: language === 'ar' ? 'var(--accent)' : 'var(--text-primary)',
          }}
          onClick={onToggleLanguage}
          title="Toggle Arabic / English"
        >
          {language === 'ar' ? 'EN' : 'ع'}
        </button>

        {hasCollapsed && (
          <button
            style={{ ...btn, borderColor: 'var(--accent)', color: 'var(--accent)' }}
            onClick={onExpandAll}
            title="Expand all branches"
          >
            <Expand size={17} />
          </button>
        )}

        {divider}

        <button style={btn} onClick={handleLogout} title="Log out">
          <LogOut size={16} />
        </button>
      </div>

      {/* Bottom centre — Add member */}
      {canAdd && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={onAddMember}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 24px var(--accent-glow)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <UserPlus size={15} />
            Add Family Member
          </button>
        </div>
      )}
    </>
  )
}
