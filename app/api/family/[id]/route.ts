import { NextRequest, NextResponse } from 'next/server'
import { readFamilyData, writeFamilyData } from '@/lib/family-data'
import { getSession } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const updates = await req.json()
  const data = readFamilyData()

  const idx = data.people.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  data.people[idx] = { ...data.people[idx], ...updates }
  writeFamilyData(data)

  return NextResponse.json(data.people[idx])
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
