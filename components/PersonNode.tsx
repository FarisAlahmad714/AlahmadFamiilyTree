'use client'

import { memo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { Person } from '@/lib/family-data'
import { useLanguage } from '@/lib/language-context'

export type PersonNodeType = Node<
  {
    person: Person
    spouses: Person[]
    hasChildren: boolean
    totalChildren: number
    isCollapsed: boolean
    onToggleCollapse: (id: string) => void
    onSelectPerson: (person: Person) => void
  },
  'person'
>

function SpouseHeartBadge({ spouse, onSelect }: { spouse: Person; onSelect: (p: Person) => void }) {
  const initial     = spouse.firstName.charAt(0).toUpperCase()
  const label       = `${spouse.firstName}${spouse.surname ? ' ' + spouse.surname : ''}`
  const spouseGone  = !!(spouse.deceased || spouse.deathYear)
  return (
    <div
      title={label}
      onClick={(e) => { e.stopPropagation(); onSelect(spouse) }}
      style={{ width: 30, height: spouseGone ? 36 : 30, flexShrink: 0, cursor: 'pointer' }}
    >
      <svg
        viewBox={spouseGone ? '0 -6 32 36' : '0 0 32 30'}
        width={30}
        height={spouseGone ? 36 : 30}
        style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))' }}
      >
        {spouseGone && (
          <>
            {/* Right mini wing */}
            <g transform="translate(26, 0)" fill="white" stroke="#b8ccee" strokeWidth="0.6">
              <g transform="rotate(-30)"><ellipse cx="5" cy="0" rx="6" ry="1.8"/></g>
              <g transform="rotate(-10)"><ellipse cx="6" cy="0" rx="7" ry="2.2"/></g>
              <g transform="rotate(14)"><ellipse cx="5" cy="0" rx="6" ry="1.8"/></g>
            </g>
            {/* Left mini wing (mirror) */}
            <g transform="translate(6, 0) scale(-1,1)" fill="white" stroke="#b8ccee" strokeWidth="0.6">
              <g transform="rotate(-30)"><ellipse cx="5" cy="0" rx="6" ry="1.8"/></g>
              <g transform="rotate(-10)"><ellipse cx="6" cy="0" rx="7" ry="2.2"/></g>
              <g transform="rotate(14)"><ellipse cx="5" cy="0" rx="6" ry="1.8"/></g>
            </g>
            {/* Mini halo */}
            <ellipse cx="16" cy="-3" rx="6" ry="2.2" fill="rgba(240,192,48,0.18)" stroke="#e8b820" strokeWidth="1.2"/>
          </>
        )}
        <path
          d="M16 27C16 27 2 18.5 2 10.5C2 6.358 5.358 3 9.5 3C11.824 3 13.9 4.05 15.3 5.73C15.68 6.19 16.32 6.19 16.7 5.73C18.1 4.05 20.176 3 22.5 3C26.642 3 30 6.358 30 10.5C30 18.5 16 27 16 27Z"
          fill="#e63946"
        />
        <text
          x="15.5"
          y="15.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="10"
          fontWeight="800"
          fontFamily="sans-serif"
        >{initial}</text>
      </svg>
    </div>
  )
}

function PersonNode({ data, selected }: NodeProps<PersonNodeType>) {
  const { person, spouses, hasChildren, totalChildren, isCollapsed, onToggleCollapse, onSelectPerson } = data
  const language = useLanguage()
  const [photoModal, setPhotoModal] = useState(false)
  const displayName = language === 'ar' && person.firstNameAr ? person.firstNameAr : person.firstName
  const isRoot      = !person.parentId && !person.spouseIds.some(() => true)
  // A "true root" is AbuBakr — no parent, not married in
  const isPatriarch = person.id === 'abubakr'
  const isFemale    = person.gender === 'female'
  const isSpouseIn  = !person.parentId && person.spouseIds.length > 0
  const isDeceased  = !!(person.deathYear || person.deceased)

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

  const cardBg = isPatriarch ? 'var(--node-root-bg)' : 'var(--bg-card)'

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

      {/* Spouse heart badges — sit outside the overflow:hidden card */}
      {(spouses && spouses.length > 0 || hasChildren) && (
        <div style={{
          position: 'absolute',
          top: -14,
          right: -10,
          display: 'flex',
          flexDirection: 'row-reverse',
          gap: 3,
          zIndex: 10,
        }}>
          {spouses && spouses.length > 0
            ? spouses.map(s => <SpouseHeartBadge key={s.id} spouse={s} onSelect={onSelectPerson} />)
            : (
              <div style={{ width: 30, height: 30, flexShrink: 0, pointerEvents: 'none' }}>
                <svg viewBox="0 0 32 30" width={30} height={30} style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}>
                  <path
                    d="M16 27C16 27 2 18.5 2 10.5C2 6.358 5.358 3 9.5 3C11.824 3 13.9 4.05 15.3 5.73C15.68 6.19 16.32 6.19 16.7 5.73C18.1 4.05 20.176 3 22.5 3C26.642 3 30 6.358 30 10.5C30 18.5 16 27 16 27Z"
                    fill="none"
                    stroke="rgba(230,57,70,0.45)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            )
          }
        </div>
      )}

      {/* Angel wings — shown for deceased persons */}
      {isDeceased && (
        <svg
          viewBox="0 0 284 78"
          style={{ position: 'absolute', top: -7, left: -44, width: 284, height: 78, pointerEvents: 'none', overflow: 'visible' }}
        >
          {/* ── Right wing: 5 feathers fanning out from card right edge ── */}
          <g transform="translate(240, 42)" fill="white" stroke="#b8ccee" strokeWidth="0.75">
            <g transform="rotate(-34)"><ellipse cx="20" cy="0" rx="22" ry="5"/><line x1="2" y1="0" x2="20" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
            <g transform="rotate(-19)"><ellipse cx="23" cy="0" rx="25" ry="6.5"/><line x1="2" y1="0" x2="23" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
            <g transform="rotate(-4)"><ellipse cx="24" cy="0" rx="27" ry="7"/><line x1="2" y1="0" x2="24" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
            <g transform="rotate(12)"><ellipse cx="23" cy="0" rx="25" ry="6.5"/><line x1="2" y1="0" x2="23" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
            <g transform="rotate(27)"><ellipse cx="19" cy="0" rx="21" ry="5"/><line x1="2" y1="0" x2="19" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
          </g>
          {/* ── Left wing: mirror ── */}
          <g transform="translate(44, 42) scale(-1, 1)" fill="white" stroke="#b8ccee" strokeWidth="0.75">
            <g transform="rotate(-34)"><ellipse cx="20" cy="0" rx="22" ry="5"/><line x1="2" y1="0" x2="20" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
            <g transform="rotate(-19)"><ellipse cx="23" cy="0" rx="25" ry="6.5"/><line x1="2" y1="0" x2="23" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
            <g transform="rotate(-4)"><ellipse cx="24" cy="0" rx="27" ry="7"/><line x1="2" y1="0" x2="24" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
            <g transform="rotate(12)"><ellipse cx="23" cy="0" rx="25" ry="6.5"/><line x1="2" y1="0" x2="23" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
            <g transform="rotate(27)"><ellipse cx="19" cy="0" rx="21" ry="5"/><line x1="2" y1="0" x2="19" y2="0" stroke="#c8d8f0" strokeWidth="0.5"/></g>
          </g>
          {/* ── Gold halo ── */}
          <ellipse cx="142" cy="6" rx="20" ry="7" fill="rgba(240,192,48,0.15)" stroke="#e8b820" strokeWidth="2.2"/>
          {/* ── Sparkles ── */}
          <text x="74" y="20" fontSize="8" fill="#e8b820" textAnchor="middle">✦</text>
          <text x="210" y="20" fontSize="8" fill="#e8b820" textAnchor="middle">✦</text>
          <text x="102" y="10" fontSize="5" fill="#c8d8f0" textAnchor="middle">✦</text>
          <text x="182" y="10" fontSize="5" fill="#c8d8f0" textAnchor="middle">✦</text>
        </svg>
      )}

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
          opacity: (person.deathYear || person.deceased) ? 0.72 : 1,
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
                onClick={(e) => { e.stopPropagation(); setPhotoModal(true) }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', cursor: 'zoom-in' }}
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
              {(person.deathYear || person.deceased) && (
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
                : person.birthYear && person.deceased
                ? ` · ${person.birthYear} – †`
                : person.birthYear
                ? ` · ${person.birthYear}`
                : person.deceased && !person.birthYear
                ? ' · deceased'
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

      {photoModal && person.photos && person.photos.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setPhotoModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={person.photos[0]}
            alt={displayName}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '85vh',
              maxWidth: '90vw',
              borderRadius: '14px',
              objectFit: 'contain',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}
          />
          <button
            onClick={() => setPhotoModal(false)}
            style={{
              position: 'absolute',
              top: 20,
              right: 24,
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              cursor: 'pointer',
              color: '#fff',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >×</button>
        </div>,
        document.body
      )}
    </>
  )
}

export default memo(PersonNode)
