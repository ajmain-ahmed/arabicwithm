// app/actions/profile.ts
'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export type ThemeProgress = {
  theme_id: string
  display_name: string
  total_words: number
}

export type LevelStat = {
  code: string
  label: string
  slug: string
  color: string
  totalThemes: number
  totalWords: number
  themes: ThemeProgress[]
}

export type ProfileData = {
  email: string
  joinedAt: string
  totalWords: number
  totalThemes: number
  levels: LevelStat[]
}

const LEVELS = [
  { code: 'A0', label: 'Explorer',           slug: 'Explorer',           color: '#a1887f' },
  { code: 'A1', label: 'Apprentice',         slug: 'Apprentice',         color: '#8d6e63' },
  { code: 'A2', label: 'Competent',          slug: 'Competent',          color: '#795548' },
  { code: 'B1', label: 'Proficient',         slug: 'Proficient',         color: '#b8860b' },
  { code: 'B2', label: 'Highly-Proficient',  slug: 'Highly-Proficient',  color: '#0e2e1f' },
  { code: 'C1', label: 'Expert',             slug: 'Expert',             color: '#1565c0' },
  { code: 'C2', label: 'Native',             slug: 'Native',             color: '#2e7d32' },
] as const

const serviceUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!

if (!serviceUrl || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
}

const serviceClient = createServiceClient(serviceUrl, serviceKey)

export async function fetchUserProfile(): Promise<ProfileData | null> {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase env vars')
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  // Fetch all vocabulary directly (paginate to avoid 1000-row limit)
  let allVocabData: { word_id: number; level: string; theme: string }[] = []
  let vocabFrom = 0
  const pageSize = 1000
  while (true) {
    const { data } = await serviceClient
      .from('vocabulary')
      .select('word_id, level, theme')
      .range(vocabFrom, vocabFrom + pageSize - 1)
    if (!data || data.length === 0) break
    allVocabData = allVocabData.concat(data)
    if (data.length < pageSize) break
    vocabFrom += pageSize
  }

  const levels: LevelStat[] = LEVELS.map((meta) => {
    const levelWords = allVocabData.filter(v => v.level === meta.code)
    const themeStats = new Map<string, number>()

    for (const v of levelWords) {
      const theme = v.theme ?? 'Untitled'
      themeStats.set(theme, (themeStats.get(theme) ?? 0) + 1)
    }

    const themes: ThemeProgress[] = Array.from(themeStats.entries()).map(([theme, total]) => ({
      theme_id: theme,
      display_name: theme,
      total_words: total,
    }))

    const totalThemes = themes.length
    const totalWords = themes.reduce((s, t) => s + t.total_words, 0)

    return {
      ...meta,
      totalThemes,
      totalWords,
      themes,
    }
  })

  return {
    email: user.email ?? '',
    joinedAt: user.created_at,
    totalWords: levels.reduce((s, l) => s + l.totalWords, 0),
    totalThemes: levels.reduce((s, l) => s + l.totalThemes, 0),
    levels,
  }
}
