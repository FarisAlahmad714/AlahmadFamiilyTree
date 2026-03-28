import { cookies } from 'next/headers'

export type Role = 'member' | 'moderator'

export interface Session {
  role: Role
  name?: string
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('family-tree-session')
  if (!sessionCookie) return null
  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    return JSON.parse(decoded) as Session
  } catch {
    return null
  }
}

export function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString('base64')
}
