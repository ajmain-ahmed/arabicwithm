// app/actions/profile.ts
'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export type ThemeProgress = {
  theme_id: number
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
  totalXp: number
  currentLevel: number
  weeklyXp: number
  streakDays: number
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

  const { data: rpcData, error } = await serviceClient.rpc('get_user_profile', {
    p_user_id: user.id,
  })

  if (error) {
    console.error('[profile] RPC error:', error.message)
    throw new Error(error.message)
  }

  if (!rpcData) return null

  if (process.env.NODE_ENV === 'development') {
    console.log('[profile] raw RPC:', JSON.stringify(rpcData).slice(0, 800))
  }

  let rpcLevels: any[] = []

  if (Array.isArray(rpcData)) {
    rpcLevels = rpcData
  } else if (typeof rpcData === 'string') {
    rpcLevels = JSON.parse(rpcData)
  } else if (rpcData && typeof rpcData === 'object') {
    rpcLevels = (rpcData as any).levels ?? (rpcData as any).data ?? []
  }

  if (!Array.isArray(rpcLevels)) {
    console.error('[profile] RPC did not return an array. Got:', rpcData)
    rpcLevels = []
  }

  const { data: statsData } = await serviceClient
    .from('user_stats')
    .select('total_xp, current_level, weekly_xp, streak_days')
    .eq('user_id', user.id)
    .maybeSingle()

  const levels: LevelStat[] = LEVELS.map((meta) => {
    const rpcLevel = rpcLevels.find((l: any) => l?.code === meta.code)

    const themes: ThemeProgress[] = (rpcLevel?.themes ?? []).map((t: any) => {
      const total = Number(t?.total_words ?? 0)
      const completed = Number(t?.completed_count ?? 0)
      const revision = Number(t?.revision_count ?? 0)

      const clampedCompleted = Math.min(completed, total)
      const clampedRevision = Math.min(revision, total - clampedCompleted)

      return {
        theme_id: Number(t?.theme_id ?? 0),
        display_name: t?.display_name ?? 'Untitled',
        total_words: total,
        completed_count: clampedCompleted,
        revision_count: clampedRevision,
      }
    })

    const totalThemes = themes.length
    const completedThemes = themes.filter(
      (t) => t.total_words > 0 && t.completed_count >= t.total_words
    ).length

    const totalWords = themes.reduce((s, t) => s + t.total_words, 0)
    const completedWords = themes.reduce((s, t) => s + t.completed_count, 0)
    const revisionWords = themes.reduce((s, t) => s + t.revision_count, 0)

    return {
      ...meta,
      totalThemes,
      completedThemes,
      totalWords,
      completedWords,
      revisionWords,
      progressPct: totalWords > 0 ? Math.round((completedWords / totalWords) * 100) : 0,
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
    totalXp: statsData?.total_xp ?? 0,
    currentLevel: statsData?.current_level ?? 1,
    weeklyXp: statsData?.weekly_xp ?? 0,
    streakDays: statsData?.streak_days ?? 0,
  }
}