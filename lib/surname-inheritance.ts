import type { Person } from './family-data'

export type SurnamePair = {
  surname: string | null
  surnameAr?: string | null
}

const ALAHMAD_EN = 'alahmad'
const ALAHMAD_AR = 'الأحمد'

function clean(value?: string | null): string {
  return value?.trim() ?? ''
}

function hasSurname(person?: SurnamePair | null): person is Required<SurnamePair> {
  return !!clean(person?.surname) || !!clean(person?.surnameAr)
}

function surnameKey(person: SurnamePair): string {
  return `${clean(person.surname).toLowerCase()}|${clean(person.surnameAr)}`
}

function pairFrom(person: SurnamePair): SurnamePair {
  return {
    surname: clean(person.surname) || null,
    surnameAr: clean(person.surnameAr) || null,
  }
}

export function isBlankSurname(person: SurnamePair): boolean {
  return !hasSurname(person)
}

export function isAlahmadSurname(person: SurnamePair): boolean {
  const english = clean(person.surname).toLowerCase()
  const arabic = clean(person.surnameAr)
  return english === ALAHMAD_EN || arabic === ALAHMAD_AR
}

export function getInheritedSurname(
  person: Pick<Person, 'id' | 'parentId' | 'motherId' | 'surname' | 'surnameAr'>,
  people: Person[],
): SurnamePair | null {
  const parent = person.parentId ? people.find((p) => p.id === person.parentId) : null
  if (parent?.gender === 'male' && hasSurname(parent)) return pairFrom(parent)

  const mother = person.motherId ? people.find((p) => p.id === person.motherId) : null
  const femaleParent = parent?.gender === 'female' ? parent : mother?.gender === 'female' ? mother : null
  if (!femaleParent) return null

  const spousePairs = (femaleParent.spouseIds ?? [])
    .map((id) => people.find((p) => p.id === id))
    .filter((spouse): spouse is Person => !!spouse && spouse.gender === 'male' && hasSurname(spouse))
    .map(pairFrom)

  const uniqueSpousePairs = new Map(spousePairs.map((pair) => [surnameKey(pair), pair]))
  if (uniqueSpousePairs.size === 1) return [...uniqueSpousePairs.values()][0]

  const siblingPairs = people
    .filter((candidate) =>
      candidate.id !== person.id &&
      candidate.parentId === femaleParent.id &&
      hasSurname(candidate) &&
      !isAlahmadSurname(candidate)
    )
    .map(pairFrom)

  const uniqueSiblingPairs = new Map(siblingPairs.map((pair) => [surnameKey(pair), pair]))
  return uniqueSiblingPairs.size === 1 ? [...uniqueSiblingPairs.values()][0] : null
}

export function fillBlankInheritedSurnames(people: Person[], personIds?: Iterable<string>): void {
  const allowedIds = personIds ? new Set(personIds) : null
  for (const person of people) {
    if (allowedIds && !allowedIds.has(person.id)) continue
    if (!isBlankSurname(person)) continue
    const inherited = getInheritedSurname(person, people)
    if (!inherited) continue
    person.surname = inherited.surname
    person.surnameAr = inherited.surnameAr
  }
}

export function clearFemaleLineAlahmadSurnames(people: Person[], personIds?: Iterable<string>): void {
  const allowedIds = personIds ? new Set(personIds) : null
  for (const person of people) {
    if (allowedIds && !allowedIds.has(person.id)) continue
    const parent = person.parentId ? people.find((p) => p.id === person.parentId) : null
    if (parent?.gender !== 'female' || !isAlahmadSurname(person)) continue
    const inherited = getInheritedSurname({ ...person, surname: null, surnameAr: null }, people)
    if (inherited) {
      person.surname = inherited.surname
      person.surnameAr = inherited.surnameAr
    } else {
      person.surname = null
      person.surnameAr = null
    }
  }
}
