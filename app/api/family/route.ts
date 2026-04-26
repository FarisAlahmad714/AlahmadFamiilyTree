import { NextRequest, NextResponse } from 'next/server'
import { readFamilyData, writeFamilyData, type Person } from '@/lib/family-data'
import { getSession } from '@/lib/auth'
import { buildNameTranslationPairs, resolveBilingualName } from '@/lib/name-translation'

export async function GET() {
  const data = readFamilyData()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const person: Omit<Person, 'id'> = await req.json()
  const data = readFamilyData()
  const namePairs = buildNameTranslationPairs(data.people)
  const firstName = resolveBilingualName(person.firstName, person.firstNameAr, '', '', namePairs)
  const surname = resolveBilingualName(person.surname, person.surnameAr, 'Alahmad', 'الأحمد', namePairs)

  const idBase = (firstName.english || firstName.arabic || 'member').toLowerCase().replace(/\s+/g, '-')
  const id = `${idBase}-${Date.now()}`
  const newPerson: Person = {
    ...person,
    id,
    firstName: firstName.english || firstName.arabic || 'Unknown',
    firstNameAr: firstName.arabic || undefined,
    surname: surname.english || null,
    surnameAr: surname.arabic || undefined,
  }

  data.people.push(newPerson)
  writeFamilyData(data)

  return NextResponse.json(newPerson, { status: 201 })
}
