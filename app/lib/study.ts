import { createClient as createServiceClient } from "@supabase/supabase-js"

const serviceUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!serviceUrl || !serviceKey) {
  throw new Error('Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY')
}
const serviceClient = createServiceClient(serviceUrl, serviceKey)

export interface LevelMeta {
  code: string
  slug: string
  label: string
  wordCount: number
  themeCount: number
}

const SLUG_MAP: Record<string, string> = {
  A0: 'Beginner',
  A1: 'Apprentice',
  A2: 'Competent',
  B1: 'Proficient',
  B2: 'Highly-Proficient',
  C1: 'Expert',
  C2: 'Native',
}

const LABEL_MAP: Record<string, string> = {
  A0: 'Beginner | A0',
  A1: 'Apprentice | A1',
  A2: 'Competent | A2',
  B1: 'Proficient | B1',
  B2: 'Highly Proficient | B2',
  C1: 'Expert | C1',
  C2: 'Native | C2',
}

const LEVEL_ORDER = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export async function getAllLevels(): Promise<LevelMeta[]> {
  const { data: levels, error } = await serviceClient
    .from('levels')
    .select('id, code')

  if (error) {
    console.error('[getAllLevels] error:', error.message)
    return []
  }

  const levelCodes = levels?.map((l) => l.code) ?? []
  if (levelCodes.length === 0) return []

  const levelIds = levels?.map(l => l.id) ?? []

  // Count vocab words per level
  const { data: vocabData, error: vocabErr } = await serviceClient
    .from('vocab')
    .select('level_id')
    .in('level_id', levelIds)

  if (vocabErr) {
    console.error('[getAllLevels] vocab count error:', vocabErr.message)
  }

  const wordCountMap = new Map<string, number>()
  for (const v of vocabData ?? []) {
    const level = levels?.find(l => l.id === v.level_id)
    if (level) {
      wordCountMap.set(level.code, (wordCountMap.get(level.code) ?? 0) + 1)
    }
  }

  // Count distinct themes per level
  const { data: themeVocabData, error: themeVocabErr } = await serviceClient
    .from('vocab')
    .select('level_id, theme_id')
    .in('level_id', levelIds)

  if (themeVocabErr) {
    console.error('[getAllLevels] theme count error:', themeVocabErr.message)
  }

  const themeCountMap = new Map<string, number>()
  const levelThemeSets = new Map<string, Set<number>>()
  for (const v of themeVocabData ?? []) {
    const level = levels?.find(l => l.id === v.level_id)
    if (level) {
      const set = levelThemeSets.get(level.code) ?? new Set<number>()
      set.add(v.theme_id)
      levelThemeSets.set(level.code, set)
    }
  }
  for (const [code, set] of levelThemeSets) {
    themeCountMap.set(code, set.size)
  }

  const result: LevelMeta[] = (levels ?? []).map((l) => ({
    code: l.code,
    slug: SLUG_MAP[l.code] ?? l.code,
    label: LABEL_MAP[l.code] ?? l.code,
    wordCount: wordCountMap.get(l.code) ?? 0,
    themeCount: themeCountMap.get(l.code) ?? 0,
  }))

  result.sort((a, b) => {
    const idxA = LEVEL_ORDER.indexOf(a.code)
    const idxB = LEVEL_ORDER.indexOf(b.code)
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
  })

  return result
}
