'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus } from 'lucide-react'
import type { Person } from '@/lib/family-data'

interface Props {
  allPeople: Person[]
  onClose: () => void
  onAdd: (person: Omit<Person, 'id'>) => Promise<void>
}

export default function AddMemberModal({ allPeople, onClose, onAdd }: Props) {
  const [form, setForm] = useState({
    firstName: '',
    surname: 'Alahmad',
    gender: 'male' as 'male' | 'female' | 'other',
    parentId: null as string | null,
    spouseIds: [] as string[],
    birthYear: '' as string | number,
    deathYear: '' as string | number,
    location: '',
    notes: '',
    fullName: '',
    photo: null as string | null,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onAdd({
      firstName: form.firstName,
      surname: form.surname,
      gender: form.gender,
      parentId: form.parentId || null,
      spouseIds: form.spouseIds,
      birthYear: form.birthYear ? parseInt(String(form.birthYear)) : null,
      deathYear: form.deathYear ? parseInt(String(form.deathYear)) : null,
      location: form.location || null,
      notes: form.notes || null,
      fullName: form.fullName || undefined,
      photos: [],
    })
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '10px 12px',
    width: '100%',
    fontSize: '14px',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: 'var(--node-root-bg)', border: '1px solid var(--node-root-border)' }}
            >
              <UserPlus size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Add Family Member
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>First Name *</label>
              <input
                required
                style={inputStyle}
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="e.g. Khalid"
              />
            </div>
            <div>
              <label style={labelStyle}>Surname</label>
              <input
                style={inputStyle}
                value={form.surname}
                onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Full Traditional Name (optional)</label>
            <input
              style={inputStyle}
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="e.g. Khalid Ahmad Zaki Alahmad"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Gender</label>
              <select
                style={inputStyle}
                value={form.gender}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    gender: e.target.value as 'male' | 'female' | 'other',
                  }))
                }
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Parent</label>
              <select
                style={inputStyle}
                value={form.parentId ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value || null }))}
              >
                <option value="">No parent</option>
                {allPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.surname}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Birth Year</label>
              <input
                type="number"
                style={inputStyle}
                value={form.birthYear}
                onChange={(e) => setForm((f) => ({ ...f, birthYear: e.target.value }))}
                placeholder="e.g. 1985"
                min={1800}
                max={2030}
              />
            </div>
            <div>
              <label style={labelStyle}>Death Year</label>
              <input
                type="number"
                style={inputStyle}
                value={form.deathYear}
                onChange={(e) => setForm((f) => ({ ...f, deathYear: e.target.value }))}
                placeholder="e.g. 2010"
                min={1800}
                max={2030}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <input
              style={inputStyle}
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Cairo, Egypt"
            />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: 'none' }}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any additional info..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 20px var(--accent-glow)',
              }}
            >
              {loading ? 'Adding...' : 'Add to Tree'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-sm transition-all"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
