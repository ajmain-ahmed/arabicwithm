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
    .select('id, code, sort_order')
    .order('sort_order')

  if (error) {
    console.error('[getAllLevels] error:', error.message)
    return []
  }

  const levelIds = levels?.map((l) => l.id) ?? []
  if (levelIds.length === 0) return []

  const { data: vocabData, error: vocabErr } = await serviceClient
    .from('vocabulary')
    .select('level_id')
    .in('level_id', levelIds)

  if (vocabErr) {
    console.error('[getAllLevels] vocab error:', vocabErr.message)
  }

  const { data: themeData, error: themeErr } = await serviceClient
    .from('themes')
    .select('level_id')
    .in('level_id', levelIds)

  if (themeErr) {
    console.error('[getAllLevels] theme error:', themeErr.message)
  }

  const wordCountMap = new Map<number, number>()
  vocabData?.forEach((v) => {
    wordCountMap.set(v.level_id, (wordCountMap.get(v.level_id) ?? 0) + 1)
  })

  const themeCountMap = new Map<number, number>()
  themeData?.forEach((t) => {
    themeCountMap.set(t.level_id, (themeCountMap.get(t.level_id) ?? 0) + 1)
  })

  const result: LevelMeta[] = (levels ?? []).map((l) => ({
    code: l.code,
    slug: SLUG_MAP[l.code] ?? l.code,
    label: LABEL_MAP[l.code] ?? l.code,
    wordCount: wordCountMap.get(l.id) ?? 0,
    themeCount: themeCountMap.get(l.id) ?? 0,
  }))

  result.sort((a, b) => {
    const idxA = LEVEL_ORDER.indexOf(a.code)
    const idxB = LEVEL_ORDER.indexOf(b.code)
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
  })

  return result
}
