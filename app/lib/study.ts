// app/lib/study.ts

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
  const { data: vocabData, error } = await serviceClient
    .from('vocabulary')
    .select('level, theme')

  if (error) {
    console.error('[getAllLevels] error:', error.message)
    return []
  }

  const wordCountMap = new Map<string, number>()
  const themeCountMap = new Map<string, number>()
  const levelThemeSets = new Map<string, Set<string>>()

  for (const v of vocabData ?? []) {
    const level = v.level
    const theme = v.theme
    if (!level) continue

    wordCountMap.set(level, (wordCountMap.get(level) ?? 0) + 1)

    if (theme) {
      const set = levelThemeSets.get(level) ?? new Set<string>()
      set.add(theme)
      levelThemeSets.set(level, set)
    }
  }

  for (const [code, set] of levelThemeSets) {
    themeCountMap.set(code, set.size)
  }

  const result: LevelMeta[] = LEVEL_ORDER.map((code) => ({
    code,
    slug: SLUG_MAP[code] ?? code,
    label: LABEL_MAP[code] ?? code,
    wordCount: wordCountMap.get(code) ?? 0,
    themeCount: themeCountMap.get(code) ?? 0,
  }))

  return result.filter(l => l.wordCount > 0)
}
