'use client'

import { useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Edit2, Save, Trash2, Camera, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Person, PersonUpdatePayload } from '@/lib/family-data'
import type { Session } from '@/lib/auth'
import { useLanguage } from '@/lib/language-context'
import { buildNameTranslationPairs, resolveBilingualName } from '@/lib/name-translation'
import { getInheritedSurname } from '@/lib/surname-inheritance'

interface Props {
  person: Person
  allPeople: Person[]
  onClose: () => void
  session: Session
  onUpdate: (updates: PersonUpdatePayload) => Promise<void>
  onDelete?: () => Promise<void>
}

function collectDescendants(people: Person[], personId: string): Set<string> {
  const result = new Set<string>()
  const queue = [personId]
  while (queue.length) {
    const current = queue.shift()!
    for (const person of people) {
      if (person.parentId === current && !result.has(person.id)) {
        result.add(person.id)
        queue.push(person.id)
      }
    }
  }
  return result
}

function collectAncestors(people: Person[], personId: string): Set<string> {
  const result = new Set<string>()
  let current = people.find((p) => p.id === personId)
  while (current?.parentId && !result.has(current.parentId)) {
    result.add(current.parentId)
    current = people.find((p) => p.id === current!.parentId)
  }
  return result
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id]
}

export default function PersonDetailPanel({
  person,
  allPeople,
  onClose,
  session,
  onUpdate,
  onDelete,
}: Props) {
  const language = useLanguage()
  const namePairs = useMemo(() => buildNameTranslationPairs(allPeople), [allPeople])
  const initialFirstName = resolveBilingualName(
    person.firstName,
    person.firstNameAr,
    person.firstName,
    person.firstNameAr,
    namePairs,
  )
  const initialSurname = resolveBilingualName(
    person.surname,
    person.surnameAr,
    person.surname,
    person.surnameAr,
    namePairs,
  )
  const initialChildIds = allPeople.filter((p) => p.parentId === person.id).map((p) => p.id)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Person>>({
    firstName: initialFirstName.english || person.firstName,
    firstNameAr: initialFirstName.arabic,
    surname: initialSurname.english,
    surnameAr: initialSurname.arabic,
    fullName: person.fullName ?? '',
    gender: person.gender,
    parentId: person.parentId,
    motherId: person.motherId ?? null,
    spouseIds: person.spouseIds ?? [],
    birthYear: person.birthYear,
    deathYear: person.deathYear,
    location: person.location,
    notes: person.notes,
  })
  const [childIds, setChildIds] = useState<string[]>(initialChildIds)
  const [saving, setSaving] = useState(false)

  // Photos
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentPhotos = person.photos ?? []

  const parent = allPeople.find((p) => p.id === person.parentId)
  const mother = person.motherId ? allPeople.find((p) => p.id === person.motherId) : null
  const children = allPeople.filter((p) => p.parentId === person.id)
  const spouses = allPeople.filter((p) => person.spouseIds.includes(p.id))
  const ancestorIds = useMemo(() => collectAncestors(allPeople, person.id), [allPeople, person.id])
  const descendantIds = useMemo(() => collectDescendants(allPeople, person.id), [allPeople, person.id])
  const relationCandidates = allPeople.filter((p) => p.id !== person.id)
  const parentCandidates = relationCandidates.filter((p) => !descendantIds.has(p.id))
  const childCandidates = relationCandidates.filter((p) => !ancestorIds.has(p.id))
  const surnameForRelations = (parentId: string | null, motherId: string | null) =>
    getInheritedSurname(
      {
        id: person.id,
        parentId,
        motherId,
        surname: null,
        surnameAr: null,
      },
      allPeople,
    ) ?? { surname: null, surnameAr: null }

  const translatedFirstName = resolveBilingualName(
    person.firstName,
    person.firstNameAr,
    person.firstName,
    person.firstNameAr,
    namePairs,
  )
  const translatedSurname = resolveBilingualName(
    person.surname,
    person.surnameAr,
    person.surname,
    person.surnameAr,
    namePairs,
  )
  const personDisplayName = (p: Person) => {
    const firstName = resolveBilingualName(p.firstName, p.firstNameAr, p.firstName, p.firstNameAr, namePairs)
    return language === 'ar' ? firstName.arabic || firstName.english : firstName.english || firstName.arabic
  }
  const personDisplaySurname = (p: Person) => {
    const surname = resolveBilingualName(p.surname, p.surnameAr, p.surname, p.surnameAr, namePairs)
    return language === 'ar' ? surname.arabic || surname.english : surname.english || surname.arabic
  }
  const personFullDisplayName = (p: Person) =>
    [personDisplayName(p), personDisplaySurname(p)].filter(Boolean).join(' ')

  // Lineage chain: walk parentId chain up to root
  const lineage: Person[] = []
  let curr: Person | undefined = person
  while (curr) {
    lineage.unshift(curr)
    curr = allPeople.find((p) => p.id === curr!.parentId)
  }

  const displayName = language === 'ar'
    ? translatedFirstName.arabic || translatedFirstName.english
    : translatedFirstName.english || translatedFirstName.arabic
  const displaySurname = language === 'ar'
    ? translatedSurname.arabic || translatedSurname.english
    : translatedSurname.english || translatedSurname.arabic

  // ─── Save edits ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    const firstName = resolveBilingualName(
      form.firstName,
      form.firstNameAr,
      person.firstName,
      person.firstNameAr,
      namePairs,
    )
    const surname = resolveBilingualName(
      form.surname,
      form.surnameAr,
      person.surname,
      person.surnameAr,
      namePairs,
    )
    const cleaned: PersonUpdatePayload = {
      ...form,
      firstName: firstName.english || person.firstName,
      firstNameAr: firstName.arabic || undefined,
      surname: surname.english || null,
      surnameAr: surname.arabic || undefined,
      fullName: form.fullName?.trim() || undefined,
      gender: form.gender ?? person.gender,
      parentId: form.parentId || null,
      motherId: form.motherId || null,
      spouseIds: form.spouseIds ?? [],
      childIds,
    }
    await onUpdate(cleaned)
    setSaving(false)
    setEditing(false)
  }

  // ─── Photo upload ────────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhoto(true)

    const fd = new FormData()
    for (const file of Array.from(files)) fd.append('photos', file)

    const res = await fetch(`/api/family/${person.id}/photos`, { method: 'POST', body: fd })
    if (res.ok) {
      const { paths } = await res.json() as { paths: string[] }
      await onUpdate({ photos: [...currentPhotos, ...paths] })
    }
    setUploadingPhoto(false)
    e.target.value = ''
  }

  const handlePhotoDelete = async (photoPath: string) => {
    await fetch(`/api/family/${person.id}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoPath }),
    })
    await onUpdate({ photos: currentPhotos.filter((p) => p !== photoPath) })
    if (lightboxIdx !== null) setLightboxIdx(null)
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '5px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const relationListStyle: React.CSSProperties = {
    maxHeight: 132,
    overflowY: 'auto',
    padding: 6,
    borderRadius: 10,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
  }

  const relationRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 5px',
    borderRadius: 7,
    color: 'var(--text-primary)',
    fontSize: 12,
    cursor: 'pointer',
  }

  const renderPersonCheckboxes = (
    people: Person[],
    selectedIds: string[],
    onChange: (ids: string[]) => void,
  ) => (
    <div style={relationListStyle}>
      {people.map((candidate) => (
        <label key={candidate.id} style={relationRowStyle}>
          <input
            type="checkbox"
            checked={selectedIds.includes(candidate.id)}
            onChange={() => onChange(toggleId(selectedIds, candidate.id))}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {personFullDisplayName(candidate)}
          </span>
        </label>
      ))}
    </div>
  )

  return (
    <>
      {/* ── Main panel ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
        className="absolute right-20 top-1/2 -translate-y-1/2 z-20 w-80"
        style={{ maxHeight: '90vh' }}
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
          {/* ── Photo strip ──────────────────────────────────────────────── */}
          <div className="relative flex-shrink-0" style={{ height: currentPhotos.length > 0 ? 160 : 80 }}>
            {currentPhotos.length > 0 ? (
              <>
                {/* Primary photo background */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPhotos[0]}
                  alt={displayName}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightboxIdx(0)}
                  style={{ filter: 'brightness(0.7)' }}
                />
                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to bottom, transparent 40%, var(--bg-card) 100%)',
                  }}
                />
                {/* Thumbnail strip bottom-left */}
                {currentPhotos.length > 1 && (
                  <div className="absolute bottom-2 left-3 flex gap-1.5">
                    {currentPhotos.slice(0, 6).map((p, i) => (
                      <button
                        key={p}
                        onClick={() => setLightboxIdx(i)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: i === 0 ? '2px solid var(--accent)' : '1.5px solid rgba(255,255,255,0.3)',
                          flexShrink: 0,
                          cursor: 'pointer',
                          padding: 0,
                          background: 'none',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                    {currentPhotos.length > 6 && (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '6px',
                          background: 'rgba(0,0,0,0.5)',
                          border: '1.5px solid rgba(255,255,255,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          color: '#fff',
                          fontWeight: 700,
                        }}
                      >
                        +{currentPhotos.length - 6}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* No photo — avatar initials */
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'var(--node-root-bg)' }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: person.gender === 'female' ? 'rgba(236,72,153,0.2)' : 'var(--bg-secondary)',
                    border: '2px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--accent)',
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Upload button — always visible top-right */}
            <div className="absolute top-2 right-2 flex gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                title="Add photos"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.55)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  cursor: uploadingPhoto ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {uploadingPhoto ? (
                  <span style={{ fontSize: 9 }}>...</span>
                ) : (
                  <Camera size={13} />
                )}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.55)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* ── Scrollable content ────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 pt-3" style={{ minHeight: 0 }}>
            {/* Name header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2
                  className="text-lg font-bold leading-tight"
                  style={{
                    color: 'var(--text-primary)',
                    fontFamily: language === 'ar' && person.firstNameAr ? 'var(--font-arabic)' : undefined,
                    direction: language === 'ar' ? 'rtl' : 'ltr',
                  }}
                >
                  {displayName}
                  {person.id === 'abubakr' && (
                    <span
                      className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--accent)', color: '#fff', fontSize: '9px', fontFamily: 'inherit' }}
                    >
                      ROOT
                    </span>
                  )}
                </h2>
                {language === 'en' && person.firstNameAr && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-arabic)', direction: 'rtl', marginTop: 2 }}>
                    {person.firstNameAr}
                  </p>
                )}
                {language === 'ar' && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{person.firstName}</p>
                )}
                {displaySurname && (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      marginTop: 1,
                      fontFamily: language === 'ar' && displaySurname === translatedSurname.arabic ? 'var(--font-arabic)' : undefined,
                      direction: language === 'ar' ? 'rtl' : 'ltr',
                    }}
                  >
                    {displaySurname}
                  </p>
                )}
              </div>

              {session && (
                <button
                  onClick={() => setEditing(!editing)}
                  style={{
                    padding: '6px',
                    borderRadius: '8px',
                    background: editing ? 'var(--node-root-bg)' : 'transparent',
                    border: editing ? '1px solid var(--accent)' : '1px solid transparent',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>

            {/* Full name */}
            {person.fullName && !editing && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <p style={labelStyle}>Full Traditional Name</p>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>{person.fullName}</p>
              </div>
            )}

            {/* ── Edit fields ──────────────────────────────────────────── */}
            <div className="space-y-3 mb-4">
              {editing && (
                <>
                  <div>
                    <label style={labelStyle}>Name (English)</label>
                    <input
                      type="text"
                      value={form.firstName ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      style={inputStyle}
                      placeholder="English name"
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontFamily: 'var(--font-arabic)', letterSpacing: 0, direction: 'rtl', display: 'block', textAlign: 'right' }}>
                      الاسم بالعربي
                    </label>
                    <input
                      type="text"
                      value={form.firstNameAr ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, firstNameAr: e.target.value }))}
                      style={{ ...inputStyle, direction: 'rtl', fontFamily: 'var(--font-arabic)', textAlign: 'right' }}
                      placeholder="الاسم بالعربي"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Surname (English)</label>
                    <input
                      type="text"
                      value={form.surname ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))}
                      style={inputStyle}
                      placeholder="English surname"
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontFamily: 'var(--font-arabic)', letterSpacing: 0, direction: 'rtl', display: 'block', textAlign: 'right' }}>
                      اسم العائلة بالعربي
                    </label>
                    <input
                      type="text"
                      value={form.surnameAr ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, surnameAr: e.target.value }))}
                      style={{ ...inputStyle, direction: 'rtl', fontFamily: 'var(--font-arabic)', textAlign: 'right' }}
                      placeholder="اسم العائلة بالعربي"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Full Traditional Name</label>
                    <input
                      type="text"
                      value={form.fullName ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      style={inputStyle}
                      placeholder="Full traditional name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={labelStyle}>Gender</label>
                      <select
                        value={form.gender ?? 'other'}
                        onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Person['gender'] }))}
                        style={inputStyle}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Parent</label>
                      <select
                        value={form.parentId ?? ''}
                        onChange={(e) => {
                          const parentId = e.target.value || null
                          setForm((f) => {
                            const inheritedSurname = surnameForRelations(parentId, f.motherId ?? null)
                            const canReplaceSurname = !f.surname?.trim() || f.surname === 'Alahmad'
                            return {
                              ...f,
                              parentId,
                              ...(canReplaceSurname
                                ? {
                                    surname: inheritedSurname.surname ?? '',
                                    surnameAr: inheritedSurname.surnameAr ?? '',
                                  }
                                : {}),
                            }
                          })
                        }}
                        style={inputStyle}
                      >
                        <option value="">No parent</option>
                        {parentCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {personFullDisplayName(candidate)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Mother</label>
                    <select
                      value={form.motherId ?? ''}
                      onChange={(e) => {
                        const motherId = e.target.value || null
                        setForm((f) => {
                          const inheritedSurname = surnameForRelations(f.parentId ?? null, motherId)
                          const canReplaceSurname = !f.surname?.trim() || f.surname === 'Alahmad'
                          return {
                            ...f,
                            motherId,
                            ...(canReplaceSurname
                              ? {
                                  surname: inheritedSurname.surname ?? '',
                                  surnameAr: inheritedSurname.surnameAr ?? '',
                                }
                              : {}),
                          }
                        })
                      }}
                      style={inputStyle}
                    >
                      <option value="">No mother set</option>
                      {parentCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {personFullDisplayName(candidate)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Wife / Spouse ({(form.spouseIds ?? []).length})</label>
                    {renderPersonCheckboxes(
                      relationCandidates,
                      form.spouseIds ?? [],
                      (ids) => setForm((f) => ({ ...f, spouseIds: ids })),
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Children ({childIds.length})</label>
                    {renderPersonCheckboxes(childCandidates, childIds, setChildIds)}
                  </div>
                  <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }} />
                </>
              )}

              {/* Bio fields */}
              {(
                [
                  { label: 'Birth Year', key: 'birthYear', type: 'number' },
                  { label: 'Death Year', key: 'deathYear', type: 'number' },
                  { label: 'Location', key: 'location', type: 'text' },
                ] as const
              ).map(({ label, key, type }) => (
                <div key={key}>
                  {editing ? (
                    <>
                      <label style={labelStyle}>{label}</label>
                      <input
                        type={type}
                        value={(form[key] as string | number) ?? ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [key]:
                              type === 'number'
                                ? e.target.value ? parseInt(e.target.value) : null
                                : e.target.value || null,
                          }))
                        }
                        style={inputStyle}
                        placeholder={label}
                      />
                    </>
                  ) : (
                    person[key] != null && (
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, minWidth: 70, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{person[key] as string | number}</span>
                      </div>
                    )
                  )}
                </div>
              ))}

              {/* Notes */}
              <div>
                {editing ? (
                  <>
                    <label style={labelStyle}>Notes</label>
                    <textarea
                      value={form.notes ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                      rows={2}
                      style={{ ...inputStyle, resize: 'none' }}
                      placeholder="Notes..."
                    />
                  </>
                ) : (
                  person.notes && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      {person.notes}
                    </p>
                  )
                )}
              </div>
            </div>

            {/* ── Save / cancel ─────────────────────────────────────────── */}
            {editing && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 0',
                    borderRadius: '10px',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    cursor: saving ? 'wait' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Save size={13} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* ── All photos strip (when there are many) ──────────────── */}
            {currentPhotos.length > 1 && !editing && (
              <div className="mb-4">
                <p style={labelStyle}>Photos ({currentPhotos.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {currentPhotos.map((p, i) => (
                    <div key={p} className="relative group" style={{ width: 52, height: 52 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p}
                        alt=""
                        onClick={() => setLightboxIdx(i)}
                        style={{
                          width: 52,
                          height: 52,
                          objectFit: 'cover',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: '1.5px solid var(--border-color)',
                        }}
                      />
                      <button
                        onClick={() => handlePhotoDelete(p)}
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.7)', border: 'none', cursor: 'pointer' }}
                        title="Delete photo"
                      >
                        <Trash2 size={12} color="#fff" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '8px',
                      border: '1.5px dashed var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Add more photos"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* No photos — big upload prompt */}
            {currentPhotos.length === 0 && !editing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1.5px dashed var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <Camera size={16} />
                Add photos
              </button>
            )}

            {/* ── Connections ───────────────────────────────────────────── */}
            {(parent || mother || children.length > 0 || spouses.length > 0) && (
              <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                {parent && (
                  <div>
                    <p style={labelStyle}>Parent</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {personFullDisplayName(parent)}
                    </p>
                  </div>
                )}
                {mother && mother.id !== parent?.id && (
                  <div>
                    <p style={labelStyle}>Mother</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {personFullDisplayName(mother)}
                    </p>
                  </div>
                )}
                {spouses.length > 0 && (
                  <div>
                    <p style={labelStyle}>Spouse</p>
                    <div className="flex flex-wrap gap-1">
                      {spouses.map((s) => (
                        <span key={s.id} style={{ fontSize: 12, padding: '2px 8px', borderRadius: '20px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                          {personFullDisplayName(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {children.length > 0 && (
                  <div>
                    <p style={labelStyle}>Children ({children.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {children.map((c) => (
                        <span key={c.id} style={{ fontSize: 12, padding: '2px 8px', borderRadius: '20px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                          {personFullDisplayName(c)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {lineage.length > 1 && (
                  <div>
                    <p style={labelStyle}>Lineage</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px' }}>
                      {lineage.map((p, i) => (
                        <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 7px',
                              borderRadius: '20px',
                              background: p.id === person.id ? 'var(--node-root-bg)' : 'var(--bg-secondary)',
                              color: p.id === person.id ? 'var(--accent)' : 'var(--text-secondary)',
                              border: p.id === person.id ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                              fontWeight: p.id === person.id ? 700 : 400,
                            }}
                          >
                            {personDisplayName(p)}
                          </span>
                          {i < lineage.length - 1 && (
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5 }}>→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Delete (moderator) ────────────────────────────────────── */}
            {onDelete && !editing && (
              <button
                onClick={onDelete}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px',
                  marginTop: 12,
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.25)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                <Trash2 size={13} />
                Remove from tree
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Lightbox ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
            onClick={() => setLightboxIdx(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl max-h-screen p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentPhotos[lightboxIdx]}
                alt={displayName}
                style={{ maxHeight: '80vh', maxWidth: '100%', borderRadius: '12px', objectFit: 'contain' }}
              />

              {/* Nav prev / next */}
              {lightboxIdx > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1) }}
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              {lightboxIdx < currentPhotos.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1) }}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); handlePhotoDelete(currentPhotos[lightboxIdx]) }}
                style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(239,68,68,0.8)', border: 'none', borderRadius: '8px', padding: '5px 10px', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Trash2 size={12} /> Delete
              </button>

              {/* Counter */}
              <p style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {lightboxIdx + 1} / {currentPhotos.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
