import { readFamilyData } from '@/lib/family-data'
import FamilyTreeClient from '@/components/FamilyTreeClient'
import type { Session } from '@/lib/auth'

const openSession: Session = { role: 'moderator' }

export default async function TreePage() {
  const familyData = readFamilyData()
  return <FamilyTreeClient initialData={familyData} session={openSession} />
}
