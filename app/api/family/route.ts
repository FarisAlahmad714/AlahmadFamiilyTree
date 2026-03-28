import { NextRequest, NextResponse } from 'next/server'
import { readFamilyData, writeFamilyData, type Person } from '@/lib/family-data'
import { getSession } from '@/lib/auth'

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

  const id = `${person.firstName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
  const newPerson: Person = { ...person, id }

  data.people.push(newPerson)
  writeFamilyData(data)

  return NextResponse.json(newPerson, { status: 201 })
}
