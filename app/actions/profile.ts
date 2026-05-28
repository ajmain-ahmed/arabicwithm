// app/actions/profile.ts
'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export type ThemeProgress = {
  theme_id: string
  display_name: string
  total_words: number
  completed_count: number
  revision_count: number
}

export type LevelStat = {
  code: string
  label: string
  slug: string
  color: string
  totalThemes: number
  completedThemes: number
  totalWords: number
  completedWords: number
  revisionWords: number
  progressPct: number
  themes: ThemeProgress[]
}

export type ProfileData = {
  email: string
  joinedAt: string
  totalWords: number
  completedWords: number
  revisionWords: number
  totalThemes: number
  completedThemes: number
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

  // Fetch all vocabulary and user progress directly (paginate to avoid 1000-row limit)
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

  const { data: progressData } = await serviceClient
    .from('progress')
    .select('vocab_id, status')
    .eq('user_id', user.id)

  const progressMap = new Map((progressData ?? []).map(p => [p.vocab_id, p]))

  const levels: LevelStat[] = LEVELS.map((meta) => {
    const levelWords = allVocabData.filter(v => v.level === meta.code)
    const themeStats = new Map<string, { total: number; completed: number; revision: number }>()

    for (const v of levelWords) {
      const theme = v.theme ?? 'Untitled'
      if (!themeStats.has(theme)) {
        themeStats.set(theme, { total: 0, completed: 0, revision: 0 })
      }
      const stats = themeStats.get(theme)!
      stats.total++
      const p = progressMap.get(v.word_id)
      if (p?.status === 1) stats.completed++
      if (p?.status === 0) stats.revision++
    }

    const themes: ThemeProgress[] = Array.from(themeStats.entries()).map(([theme, stats]) => {
      const clampedCompleted = Math.min(stats.completed, stats.total)
      const clampedRevision = Math.min(stats.revision, stats.total - clampedCompleted)
      return {
        theme_id: theme,
        display_name: theme,
        total_words: stats.total,
        completed_count: clampedCompleted,
        revision_count: clampedRevision,
      }
    })

    const totalThemes = themes.length
    const completedThemes = themes.filter(
      (t) => t.total_words > 0 && (t.completed_count + t.revision_count) >= t.total_words
    ).length

    const totalWords = themes.reduce((s, t) => s + t.total_words, 0)
    const completedWords = themes.reduce((s, t) => s + t.completed_count, 0)
    const revisionWords = themes.reduce((s, t) => s + t.revision_count, 0)
    const doneWords = completedWords + revisionWords

    return {
      ...meta,
      totalThemes,
      completedThemes,
      totalWords,
      completedWords,
      revisionWords,
      progressPct: totalWords > 0 ? Math.round((doneWords / totalWords) * 100) : 0,
      themes,
    }
  })

  return {
    email: user.email ?? '',
    joinedAt: user.created_at,
    totalWords: levels.reduce((s, l) => s + l.totalWords, 0),
    completedWords: levels.reduce((s, l) => s + l.completedWords, 0),
    revisionWords: levels.reduce((s, l) => s + l.revisionWords, 0),
    totalThemes: levels.reduce((s, l) => s + l.totalThemes, 0),
    completedThemes: levels.reduce((s, l) => s + l.completedThemes, 0),
    levels,
  }
}

export type ProgressWord = {
  vocab_id: number
  word_ar: string
  word_di: string
  word_tr: string
  level: string
  theme: string
  root: string | null
  status: 'revision' | 'completed'
  updated_at: string | null
}

export async function fetchUserProgressWords(
  statusFilter?: 'revision' | 'completed',
  search?: string
): Promise<ProgressWord[]> {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return []

  let query = serviceClient
    .from('progress')
    .select('vocab_id, status, updated_at')
    .eq('user_id', user.id)

  if (statusFilter === 'revision') {
    query = query.eq('status', 0)
  } else if (statusFilter === 'completed') {
    query = query.eq('status', 1)
  } else {
    query = query.in('status', [0, 1])
  }

  const { data: progressData, error: progressErr } = await query
  if (progressErr) {
    console.error('[fetchUserProgressWords] progress error:', progressErr.message)
    return []
  }

  if (!progressData || progressData.length === 0) return []

  const vocabIds = progressData.map(p => p.vocab_id)

  let vocabQuery = serviceClient
    .from('vocabulary')
    .select('word_id, word_ar, word_di, word_tr, level, theme, root')
    .in('word_id', vocabIds)

  if (search && search.trim()) {
    const term = search.trim()
    vocabQuery = vocabQuery.or(`word_ar.ilike.%${term}%,word_tr.ilike.%${term}%,theme.ilike.%${term}%`)
  }

  const { data: vocabData, error: vocabErr } = await vocabQuery
  if (vocabErr) {
    console.error('[fetchUserProgressWords] vocab error:', vocabErr.message)
    return []
  }

  const vocabMap = new Map((vocabData ?? []).map(v => [v.word_id, v]))

  const result: ProgressWord[] = []
  for (const p of progressData) {
    const v = vocabMap.get(p.vocab_id)
    if (!v) continue
    result.push({
      vocab_id: p.vocab_id,
      word_ar: v.word_ar ?? '',
      word_di: v.word_di ?? '',
      word_tr: v.word_tr ?? '',
      level: v.level ?? '',
      theme: v.theme ?? '',
      root: v.root ?? null,
      status: p.status === 1 ? 'completed' : 'revision',
      updated_at: p.updated_at ?? null,
    })
  }

  return result
}
