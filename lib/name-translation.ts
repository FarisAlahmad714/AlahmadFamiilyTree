import type { Person } from './family-data'

export type NameTranslationPairs = {
  enToAr: Map<string, string>
  arToEn: Map<string, string>
}

const STATIC_PAIRS: Array<[string, string]> = [
  ['Alahmad', 'الأحمد'],
  ['Ahmad', 'أحمد'],
  ['Zaki', 'زكي'],
  ['Najib', 'نجيب'],
  ['Najeeb', 'نجيب'],
  ['Muneera', 'منيرة'],
  ['Donya', 'دنيا'],
  ['Dunya', 'دنيا'],
  ['Allam', 'علام'],
  ['Alam', 'علم'],
  ['Husni', 'حسني'],
  ['Nadia', 'نادية'],
  ['Azam', 'عزام'],
  ['Muneer', 'منير'],
  ['Waleed', 'وليد'],
  ['Mehdi', 'مهدي'],
  ['Ghada', 'غادة'],
  ['Jaradat', 'جرادات'],
  ['Aboushi', 'أبو شي'],
  ['Jarrar', 'جرار'],
]

export function hasArabic(value: string): boolean {
  return /[\u0600-\u06ff]/.test(value)
}

function key(value: string): string {
  return value.trim().toLowerCase()
}

function addPair(pairs: NameTranslationPairs, english?: string | null, arabic?: string | null) {
  const en = english?.trim()
  const ar = arabic?.trim()
  if (!en || !ar) return
  pairs.enToAr.set(key(en), ar)
  pairs.arToEn.set(ar, en)
}

export function buildNameTranslationPairs(people: Person[] = []): NameTranslationPairs {
  const pairs: NameTranslationPairs = { enToAr: new Map(), arToEn: new Map() }
  for (const [english, arabic] of STATIC_PAIRS) addPair(pairs, english, arabic)
  for (const person of people) {
    addPair(pairs, person.firstName, person.firstNameAr)
    addPair(pairs, person.surname, person.surnameAr)
  }
  return pairs
}

function translateParts(value: string, lookup: Map<string, string>, useEnglishKey: boolean): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const parts = trimmed.split(/(\s+|-)/)
  let translatedAny = false
  const translated = parts.map((part) => {
    if (!part.trim() || part === '-') return part
    const found = lookup.get(useEnglishKey ? key(part) : part.trim())
    if (!found) return part
    translatedAny = true
    return found
  })
  return translatedAny ? translated.join('') : ''
}

export function englishToArabicName(value: string, pairs: NameTranslationPairs): string {
  return translateParts(value, pairs.enToAr, true)
}

export function arabicToEnglishName(value: string, pairs: NameTranslationPairs): string {
  return translateParts(value, pairs.arToEn, false)
}

export function resolveBilingualName(
  englishInput: string | null | undefined,
  arabicInput: string | null | undefined,
  fallbackEnglish: string | null | undefined,
  fallbackArabic: string | null | undefined,
  pairs: NameTranslationPairs,
) {
  const english = englishInput?.trim() ?? ''
  const arabic = arabicInput?.trim() ?? ''
  const fallbackEn = fallbackEnglish?.trim() ?? ''
  const fallbackAr = fallbackArabic?.trim() ?? ''

  const resolvedEnglish = english || (arabic ? arabicToEnglishName(arabic, pairs) : '') || fallbackEn
  const resolvedArabic = arabic || (english ? englishToArabicName(english, pairs) : '') || fallbackAr

  return {
    english: resolvedEnglish,
    arabic: resolvedArabic,
  }
}
