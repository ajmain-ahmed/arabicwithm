'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!
if (!serviceUrl || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
}
const serviceClient = createServiceClient(serviceUrl, serviceKey)

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}

export type DashboardData = {
  user: {
    id: string
    email: string
    name: string
    joinedAt: string
  }
  streak: {
    current: number
    longest: number
    last7Days: boolean[] // Mon-Sun, true = studied that day
  }
  level: {
    level: number
    xp: number
    xpToNext: number
    xpProgressPct: number
  }
  stats: {
    wordsLearned: number
    wordsMastered: number
    wordsInRevision: number
    sentencesWritten: number
    hoursStudied: number
    totalThemesTouched: number
    totalWords: number
    totalThemes: number
  }
  goals: {
    reviews: { current: number; target: number }
    newWords: { current: number; target: number }
    studyTime: { current: number; target: number } // minutes
  }
  continueLearning: {
    theme: string
    level: string
    levelSlug: string
    wordPosition: number
    totalWords: number
    progressPct: number
    lastWordAr: string
    lastWordTr: string
    lastWordEn: string
    lastStudiedAt: string | null
  } | null
  dueToday: number
  insights: string[]
}

/* ── XP / Level thresholds ── */
function calculateLevel(totalWords: number): { level: number; xp: number; xpToNext: number; xpProgressPct: number } {
  // Simple tiered system: every 100 words = level up, XP = words * 10
  const xpPerWord = 10
  const xp = totalWords * xpPerWord
  const level = Math.floor(totalWords / 100) + 1
  const wordsForNext = level * 100
  const xpToNext = wordsForNext * xpPerWord
  const xpProgressPct = Math.min(100, Math.round((totalWords % 100) / 100 * 100))
  return { level, xp, xpToNext, xpProgressPct }
}

export async function fetchDashboardData(): Promise<DashboardData | null> {
  const authClient = await getAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const userId = user.id
  const name = (user.user_metadata?.full_name as string)
    || (user.user_metadata?.display_name as string)
    || user.email?.split('@')[0]
    || 'Learner'

  // Fetch total vocabulary counts
  const { count: totalWords } = await serviceClient
    .from('vocabulary')
    .select('*', { count: 'exact', head: true })

  const { count: totalThemes } = await serviceClient
    .from('vocabulary')
    .select('theme', { count: 'exact', head: true })

  const levelInfo = calculateLevel(totalWords ?? 0)

  // Insights
  const insights: string[] = []
  if ((totalWords ?? 0) > 0) {
    insights.push(`ArabicWithM has ${totalWords} words across all levels — explore a theme today!`)
  }
  insights.push('Welcome! Pick a theme and start building your vocabulary.')

  return {
    user: {
      id: userId,
      email: user.email ?? '',
      name,
      joinedAt: user.created_at,
    },
    streak: {
      current: 0,
      longest: 0,
      last7Days: [false, false, false, false, false, false, false],
    },
    level: levelInfo,
    stats: {
      wordsLearned: 0,
      wordsMastered: 0,
      wordsInRevision: 0,
      sentencesWritten: 0,
      hoursStudied: 0,
      totalThemesTouched: 0,
      totalWords: totalWords ?? 0,
      totalThemes: totalThemes ?? 0,
    },
    goals: {
      reviews: { current: 0, target: 30 },
      newWords: { current: 0, target: 10 },
      studyTime: { current: 0, target: 15 },
    },
    continueLearning: null,
    dueToday: 0,
    insights,
  }
}
