import fs from 'fs'
import path from 'path'

export interface Person {
  id: string
  firstName: string
  firstNameAr?: string
  fullName?: string
  surname: string
  gender: 'male' | 'female' | 'other'
  parentId: string | null
  motherId?: string | null
  spouseIds: string[]
  birthYear: number | null
  deathYear: number | null
  deceased?: boolean
  location: string | null
  photos: string[]
  notes: string | null
}

export interface FamilyData {
  people: Person[]
}

const DATA_PATH = path.join(process.cwd(), 'data', 'family.json')

export function readFamilyData(): FamilyData {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8')
  return JSON.parse(raw) as FamilyData
}

export function writeFamilyData(data: FamilyData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
}
