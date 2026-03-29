'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp } from 'lucide-react'
import type { Person } from '@/lib/family-data'

interface Props {
  people: Person[]
  onClose: () => void
}

function computeStats(people: Person[]) {
  const total = people.length
  const deceased = people.filter((p) => !!p.deathYear).length
  const living = total - deceased
  const male = people.filter((p) => p.gender === 'male').length
  const female = people.filter((p) => p.gender === 'female').length

  // Max generation depth
  const depths = new Map<string, number>()
  const q = people.filter((p) => !p.parentId).map((p) => ({ id: p.id, d: 0 }))
  while (q.length) {
    const { id, d } = q.shift()!
    if (depths.has(id)) continue
    depths.set(id, d)
    for (const p of people) if (p.parentId === id) q.push({ id: p.id, d: d + 1 })
  }
  const maxGen = depths.size ? Math.max(...depths.values()) + 1 : 1

  // Top locations
  const locMap = new Map<string, number>()
  for (const p of people) if (p.location) locMap.set(p.location, (locMap.get(p.location) ?? 0) + 1)
  const topLocations = [...locMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Oldest / youngest living by birth year
  const withYear = people.filter((p) => p.birthYear && !p.deathYear).sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0))
  const oldest = withYear[0] ?? null
  const youngest = withYear[withYear.length - 1] ?? null
  const YEAR = 2026

  // Upcoming birthdays (people with birthYear in a notable age: multiples of 10 within next year)
  const birthdays = people
    .filter((p) => p.birthYear && !p.deathYear)
    .map((p) => ({ person: p, age: YEAR - (p.birthYear ?? YEAR) }))
    .filter(({ age }) => age % 10 === 0 || age % 5 === 0)
    .sort((a, b) => b.age - a.age)
    .slice(0, 4)

  return { total, living, deceased, male, female, maxGen, topLocations, oldest, youngest, YEAR, birthdays }
}

const lbl: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block',
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '11px 13px' }}>
      {children}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: color ?? 'var(--accent)' }}>{value}</span>
    </div>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'var(--border-color)', overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export default function StatsPanel({ people, onClose }: Props) {
  const s = useMemo(() => computeStats(people), [people])

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
      className="absolute left-5 top-1/2 -translate-y-1/2 z-20"
      style={{ width: 256, maxHeight: '90vh' }}
    >
      <div
        className="rounded-2xl shadow-2xl flex flex-col"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px 9px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Family Stats</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 3, display: 'flex' }}>
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-3" style={{ minHeight: 0 }}>
          {/* Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
            {([
              { label: 'Total', value: s.total, color: 'var(--accent)' },
              { label: 'Living', value: s.living, color: '#22c55e' },
              { label: 'Gens', value: s.maxGen, color: '#f59e0b' },
            ] as const).map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, padding: '9px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Gender */}
          <div>
            <span style={lbl}>Gender</span>
            <Card>
              <Row label="♂ Male" value={s.male} color="var(--accent)" />
              <Row label="♀ Female" value={s.female} color="#ec4899" />
              <Bar pct={(s.male / s.total) * 100} color="var(--accent)" />
            </Card>
          </div>

          {/* Status */}
          <div>
            <span style={lbl}>Status</span>
            <Card>
              <Row label="Living" value={s.living} color="#22c55e" />
              <Row label="Deceased †" value={s.deceased} color="var(--text-secondary)" />
              <Bar pct={(s.living / s.total) * 100} color="#22c55e" />
            </Card>
          </div>

          {/* Locations */}
          {s.topLocations.length > 0 && (
            <div>
              <span style={lbl}>Top Locations</span>
              <Card>
                {s.topLocations.map(([loc, count]) => (
                  <div key={loc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '78%' }}>
                      📍 {loc}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>{count}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Ages */}
          {(s.oldest || s.youngest) && (
            <div>
              <span style={lbl}>Ages (Living)</span>
              <Card>
                {s.oldest && <Row label="Oldest" value={`${s.oldest.firstName} · ${s.YEAR - (s.oldest.birthYear ?? s.YEAR)}y`} color="var(--text-primary)" />}
                {s.youngest && s.youngest.id !== s.oldest?.id && (
                  <Row label="Youngest" value={`${s.youngest.firstName} · ${s.YEAR - (s.youngest.birthYear ?? s.YEAR)}y`} color="var(--text-primary)" />
                )}
              </Card>
            </div>
          )}

          {/* Milestone birthdays */}
          {s.birthdays.length > 0 && (
            <div>
              <span style={lbl}>Milestone Ages ({s.YEAR})</span>
              <Card>
                {s.birthdays.map(({ person, age }) => (
                  <div key={person.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{person.firstName}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: age % 10 === 0 ? '#f59e0b' : 'var(--text-secondary)' }}>
                      {age === 0 ? 'Born this year' : `turns ${age}`}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
