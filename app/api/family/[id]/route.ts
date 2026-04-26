import { NextRequest, NextResponse } from 'next/server'
import { readFamilyData, writeFamilyData, type PersonUpdatePayload } from '@/lib/family-data'
import { getSession } from '@/lib/auth'
import { buildNameTranslationPairs, resolveBilingualName } from '@/lib/name-translation'
import {
  clearFemaleLineAlahmadSurnames,
  fillBlankInheritedSurnames,
  getInheritedSurname,
} from '@/lib/surname-inheritance'

function uniqueExistingIds(ids: unknown, validIds: Set<string>, ownId: string): string[] {
  if (!Array.isArray(ids)) return []
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id !== ownId && validIds.has(id)))]
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const payload = await req.json() as PersonUpdatePayload
  const { childIds, ...updates } = payload
  const data = readFamilyData()

  const idx = data.people.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const current = data.people[idx]
  const validIds = new Set(data.people.map((p) => p.id))
  const namePairs = buildNameTranslationPairs(data.people)
  const firstName = resolveBilingualName(
    updates.firstName,
    updates.firstNameAr,
    current.firstName,
    current.firstNameAr,
    namePairs,
  )
  const hasParentId = Object.prototype.hasOwnProperty.call(updates, 'parentId')
  const hasMotherId = Object.prototype.hasOwnProperty.call(updates, 'motherId')
  const hasSpouseIds = Object.prototype.hasOwnProperty.call(updates, 'spouseIds')
  const hasSurnameUpdate =
    Object.prototype.hasOwnProperty.call(updates, 'surname') ||
    Object.prototype.hasOwnProperty.call(updates, 'surnameAr') ||
    hasParentId ||
    hasMotherId
  const nextParentId =
    hasParentId ? (updates.parentId && updates.parentId !== id && validIds.has(updates.parentId) ? updates.parentId : null) : current.parentId
  const nextMotherId =
    hasMotherId ? (updates.motherId && updates.motherId !== id && validIds.has(updates.motherId) ? updates.motherId : null) : current.motherId
  const nextSpouseIds = hasSpouseIds ? uniqueExistingIds(updates.spouseIds, validIds, id) : current.spouseIds
  const inheritedSurname = getInheritedSurname(
    { ...current, ...updates, id, parentId: nextParentId, motherId: nextMotherId },
    data.people,
  )
  const surname = hasSurnameUpdate
    ? resolveBilingualName(
        updates.surname,
        updates.surnameAr,
        inheritedSurname?.surname,
        inheritedSurname?.surnameAr,
        namePairs,
      )
    : { english: current.surname ?? '', arabic: current.surnameAr ?? '' }

  data.people[idx] = {
    ...current,
    ...updates,
    firstName: firstName.english || current.firstName,
    firstNameAr: firstName.arabic || undefined,
    surname: surname.english || null,
    surnameAr: surname.arabic || undefined,
    parentId: nextParentId,
    motherId: nextMotherId,
    spouseIds: nextSpouseIds,
  }

  if (hasSpouseIds) {
    const spouseSet = new Set(nextSpouseIds)
    for (const person of data.people) {
      if (person.id === id) continue
      const spouses = new Set(person.spouseIds ?? [])
      if (spouseSet.has(person.id)) spouses.add(id)
      else spouses.delete(id)
      person.spouseIds = [...spouses]
    }
  }

  if (Array.isArray(childIds)) {
    const childSet = new Set(uniqueExistingIds(childIds, validIds, id))
    for (const person of data.people) {
      if (person.id === id) continue
      if (person.parentId === id && !childSet.has(person.id)) {
        person.parentId = null
        if (person.motherId === id) person.motherId = null
      } else if (childSet.has(person.id)) {
        person.parentId = id
        if (data.people[idx].gender === 'female') person.motherId = id
      }
    }
  }

  const relatedSurnameIds = new Set<string>([id])
  for (const person of data.people) {
    if (person.parentId === id || person.motherId === id) relatedSurnameIds.add(person.id)
    if (data.people[idx].parentId && person.parentId === data.people[idx].parentId) relatedSurnameIds.add(person.id)
    for (const spouseId of data.people[idx].spouseIds ?? []) {
      if (person.parentId === spouseId || person.motherId === spouseId) relatedSurnameIds.add(person.id)
    }
  }
  clearFemaleLineAlahmadSurnames(data.people, relatedSurnameIds)
  fillBlankInheritedSurnames(data.people, relatedSurnameIds)

  writeFamilyData(data)

  return NextResponse.json({ person: data.people[idx], people: data.people })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'moderator') {
    return NextResponse.json({ error: 'Moderator access required' }, { status: 403 })
  }

  const { id } = await params
  const data = readFamilyData()

  data.people = data.people.filter(p => p.id !== id)
  writeFamilyData(data)

  return NextResponse.json({ success: true })
}
