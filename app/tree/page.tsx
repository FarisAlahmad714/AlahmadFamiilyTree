import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { readFamilyData } from '@/lib/family-data'
import FamilyTreeClient from '@/components/FamilyTreeClient'

export default async function TreePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const familyData = readFamilyData()

  return <FamilyTreeClient initialData={familyData} session={session} />
}
