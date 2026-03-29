'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { Person } from '@/lib/family-data'
import { useLanguage } from '@/lib/language-context'

export type PersonNodeType = Node<
  {
    person: Person
    hasChildren: boolean
    totalChildren: number
    isCollapsed: boolean
    onToggleCollapse: (id: string) => void
  },
  'person'
>

function PersonNode({ data, selected }: NodeProps<PersonNodeType>) {
  const { person, hasChildren, totalChildren, isCollapsed, onToggleCollapse } = data
  const language = useLanguage()
  const displayName = language === 'ar' && person.firstNameAr ? person.firstNameAr : person.firstName
  const isRoot = !person.parentId && !person.spouseIds.some(() => true)
  // A "true root" is AbuBakr — no parent, not married in
  const isPatriarch = person.id === 'abubakr'
  const isFemale = person.gender === 'female'
  const isSpouseIn = !person.parentId && person.spouseIds.length > 0

  const accent = isFemale ? 'var(--accent-female)' : 'var(--accent)'
  const accentGlow = isFemale ? 'rgba(236,72,153,0.3)' : 'var(--accent-glow)'

  const borderColor = selected
    ? accent
    : isPatriarch
    ? 'var(--node-root-border)'
    : isFemale
    ? 'rgba(236,72,153,0.35)'
    : isSpouseIn
    ? 'rgba(148,163,184,0.3)'
    : 'var(--border-color)'

  const cardBg = isPatriarch
    ? 'var(--node-root-bg)'
    : isSpouseIn
    ? 'rgba(15,23,42,0.5)'
    : 'var(--bg-card)'

  const boxShadow = selected
    ? `0 0 0 2px ${accent}, 0 0 28px ${accentGlow}`
    : isPatriarch
    ? '0 0 28px var(--accent-glow)'
    : '0 4px 18px rgba(0,0,0,0.28)'

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: accent, border: 'none', width: 7, height: 7 }}
      />

      <div
        style={{
          background: cardBg,
          border: `1.5px solid ${borderColor}`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow,
          borderRadius: '14px',
          padding: '11px 13px 10px',
          width: '196px',
          cursor: 'pointer',
          transition: 'box-shadow 0.18s, border-color 0.18s',
          position: 'relative',
          overflow: 'hidden',
          opacity: person.deathYear ? 0.72 : 1,
        }}
      >
        {/* Top accent stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: isPatriarch
              ? `linear-gradient(90deg, transparent, ${accent}, transparent)`
              : isFemale
              ? `linear-gradient(90deg, transparent, rgba(236,72,153,0.55), transparent)`
              : isSpouseIn
              ? 'none'
              : 'none',
            opacity: 1,
          }}
        />

        {/* Main row: avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          {/* Avatar */}
          <div
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: isPatriarch
                ? accent
                : isFemale
                ? 'rgba(236,72,153,0.13)'
                : isSpouseIn
                ? 'rgba(148,163,184,0.1)'
                : 'var(--bg-secondary)',
              border: `1.5px solid ${
                isPatriarch
                  ? 'transparent'
                  : isFemale
                  ? 'rgba(236,72,153,0.4)'
                  : 'var(--border-color)'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: isPatriarch ? '#fff' : accent,
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {person.photos && person.photos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.photos[0]}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          {/* Name & meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: '13px',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                overflow: 'hidden',
              }}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: language === 'ar' ? 'var(--font-arabic)' : undefined,
                }}
              >
                {displayName}
              </span>
              {person.deathYear && (
                <span style={{ flexShrink: 0, fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400 }}>†</span>
              )}
              {isPatriarch && (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: '8px',
                    padding: '1px 5px',
                    borderRadius: '5px',
                    background: accent,
                    color: '#fff',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                  }}
                >
                  ROOT
                </span>
              )}
              {isSpouseIn && (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: '8px',
                    padding: '1px 5px',
                    borderRadius: '5px',
                    background: 'rgba(148,163,184,0.2)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  ♥
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: '1px',
              }}
            >
              {person.surname ? person.surname : isSpouseIn ? 'by marriage' : ''}
              {person.birthYear && person.deathYear
                ? ` · ${person.birthYear} – ${person.deathYear}`
                : person.birthYear
                ? ` · ${person.birthYear}`
                : ''}
            </div>

            {person.location && (
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  opacity: 0.8,
                }}
              >
                📍 {person.location}
              </div>
            )}
          </div>
        </div>

        {/* Collapse / expand toggle */}
        {hasChildren && (
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '5px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleCollapse(person.id)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: accent,
                fontSize: '10.5px',
                fontWeight: 600,
                padding: '2px 0',
                opacity: 0.82,
                letterSpacing: '0.02em',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.82')}
            >
              {isCollapsed ? (
                <span>▶ {totalChildren} {totalChildren === 1 ? 'branch' : 'branches'} hidden</span>
              ) : (
                <span>▼ collapse branch</span>
              )}
            </button>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: accent, border: 'none', width: 7, height: 7 }}
      />
    </>
  )
}

export default memo(PersonNode)
