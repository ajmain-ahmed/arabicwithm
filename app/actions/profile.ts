'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { fetchThemesWithProgress, type ThemeProgress } from './vocab'

const LEVELS = [
  { code: 'A1', label: 'Apprentice',         slug: 'Apprentice',         color: '#8d6e63' },
  { code: 'A2', label: 'Competent',          slug: 'Competent',          color: '#795548' },
  { code: 'B1', label: 'Proficient',         slug: 'Proficient',         color: '#b8860b' },
  { code: 'B2', label: 'Highly-Proficient',  slug: 'Highly-Proficient',  color: '#0e2e1f' },
  { code: 'C1', label: 'Expert',             slug: 'Expert',             color: '#1565c0' },
  { code: 'C2', label: 'Native',             slug: 'Native',             color: '#2e7d32' },
] as const

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

export async function fetchUserProfile(dialectCode: string = 'MSA'): Promise<ProfileData | null> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required Supabase environment variables')
  }
  const cookieStore = await cookies()
  const authClient = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const levels = await Promise.all(
    LEVELS.map(async (meta) => {
      try {
        const themes = await fetchThemesWithProgress(meta.code, dialectCode)

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
      } catch (err) {
        console.error(`[profile] failed to load ${meta.code}:`, err)
        return { ...meta, totalThemes: 0, completedThemes: 0, totalWords: 0, completedWords: 0, revisionWords: 0, progressPct: 0, themes: [] }
      }
    })
  )

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