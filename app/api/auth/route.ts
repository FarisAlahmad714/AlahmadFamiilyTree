import { NextRequest, NextResponse } from 'next/server'
import { encodeSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const familyPass = process.env.FAMILY_PASSWORD
  const moderatorPass = process.env.MODERATOR_PASSWORD

  let role: 'member' | 'moderator' | null = null

  if (password === moderatorPass) {
    role = 'moderator'
  } else if (password === familyPass) {
    role = 'member'
  }

  if (!role) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const session = encodeSession({ role })
  const response = NextResponse.json({ success: true, role })
  response.cookies.set('family-tree-session', session, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('family-tree-session')
  return response
}
