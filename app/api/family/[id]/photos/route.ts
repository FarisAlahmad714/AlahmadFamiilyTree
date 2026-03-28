import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

type Params = { params: Promise<{ id: string }> }

// POST /api/family/[id]/photos — upload one or more images, returns their public paths
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const formData = await req.formData()
  const files = formData.getAll('photos') as File[]

  if (!files.length) return NextResponse.json({ error: 'No files' }, { status: 400 })

  const dir = path.join(process.cwd(), 'public', 'photos', id)
  fs.mkdirSync(dir, { recursive: true })

  const paths: string[] = []

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']
    if (!allowed.includes(ext)) continue

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filepath = path.join(dir, filename)
    const bytes = await file.arrayBuffer()
    fs.writeFileSync(filepath, Buffer.from(bytes))
    paths.push(`/photos/${id}/${filename}`)
  }

  return NextResponse.json({ paths })
}

// DELETE /api/family/[id]/photos — delete one photo file from disk
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { photoPath } = await req.json() as { photoPath: string }

  // Safety: only allow deleting from this person's folder
  const safePath = `/photos/${id}/`
  if (!photoPath.startsWith(safePath)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const abs = path.join(process.cwd(), 'public', photoPath)
  if (fs.existsSync(abs)) fs.unlinkSync(abs)

  return NextResponse.json({ success: true })
}
