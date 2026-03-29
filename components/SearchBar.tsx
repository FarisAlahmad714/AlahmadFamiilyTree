'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import type { Person } from '@/lib/family-data'
import { useLanguage } from '@/lib/language-context'

interface Props {
  people: Person[]
  onSelect: (person: Person) => void
  onClose: () => void
}

export default function SearchBar({ people, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const language = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const results = query.trim()
    ? people
        .filter((p) => {
          const q = query.toLowerCase()
          return (
            p.firstName.toLowerCase().includes(q) ||
            (p.firstNameAr?.includes(query)) ||
            (p.surname?.toLowerCase().includes(q)) ||
            (p.location?.toLowerCase().includes(q))
          )
        })
        .slice(0, 8)
    : []

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30"
      style={{ width: 340 }}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10 }}>
          <Search size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search family members…"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2, display: 'flex' }}
          >
            <X size={14} />
          </button>
        </div>

        {results.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-color)' }}>
            {results.map((p) => {
              const name = language === 'ar' && p.firstNameAr ? p.firstNameAr : p.firstName
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: p.gender === 'female' ? 'rgba(236,72,153,0.15)' : 'var(--bg-secondary)',
                      border: '1.5px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      color: p.gender === 'female' ? '#ec4899' : 'var(--accent)',
                      overflow: 'hidden',
                    }}
                  >
                    {p.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photos[0]} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {name}
                      {p.deathYear && (
                        <span style={{ color: 'var(--text-secondary)', marginLeft: 5, fontWeight: 400 }}>†</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[p.surname, p.birthYear && `b. ${p.birthYear}`, p.location].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            No members found
          </div>
        )}
      </div>
    </motion.div>
  )
}
