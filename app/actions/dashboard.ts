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
    wordsMastered: number // status = 1
    wordsInRevision: number // status = 0
    sentencesWritten: number // placeholder
    hoursStudied: number // placeholder
    totalThemesTouched: number
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
function calculateLevel(completedWords: number): { level: number; xp: number; xpToNext: number; xpProgressPct: number } {
  // Simple tiered system: every 100 words = level up, XP = words * 10
  const xpPerWord = 10
  const xp = completedWords * xpPerWord
  const level = Math.floor(completedWords / 100) + 1
  const wordsForNext = level * 100
  const xpToNext = wordsForNext * xpPerWord
  const xpProgressPct = Math.min(100, Math.round((completedWords % 100) / 100 * 100))
  return { level, xp, xpToNext, xpProgressPct }
}

/* ── Streak calculation from last_review_at dates ── */
function calculateStreak(reviewDates: string[]): { current: number; longest: number; last7Days: boolean[] } {
  if (reviewDates.length === 0) {
    return { current: 0, longest: 0, last7Days: [false, false, false, false, false, false, false] }
  }

  const dates = reviewDates
    .map(d => new Date(d).toISOString().slice(0, 10))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()

  // Longest streak
  let longest = 1
  let currentRun = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      currentRun++
      longest = Math.max(longest, currentRun)
    } else {
      currentRun = 1
    }
  }

  // Current streak (from today backwards)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  let current = 0
  const hasToday = dates.includes(today)
  const hasYesterday = dates.includes(yesterday)

  if (hasToday || hasYesterday) {
    const startDate = hasToday ? new Date(today) : new Date(yesterday)
    current = 1
    while (true) {
      const check = new Date(startDate.getTime() - current * 86400000)
      const checkStr = check.toISOString().slice(0, 10)
      if (dates.includes(checkStr)) {
        current++
      } else {
        break
      }
    }
    if (!hasToday && hasYesterday) current-- // adjust because we started from yesterday
  }

  // Last 7 days (Mon-Sun)
  const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(Date.now() - mondayOffset * 86400000)
  const last7Days: boolean[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 86400000)
    last7Days.push(dates.includes(d.toISOString().slice(0, 10)))
  }

  return { current, longest, last7Days }
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

  // Fetch all progress for this user
  const { data: progressData } = await serviceClient
    .from('progress')
    .select('vocab_id, status, last_review_at, next_review_at, repetitions')
    .eq('user_id', userId)

  const progress = progressData ?? []
  const completed = progress.filter(p => p.status === 1)
  const inRevision = progress.filter(p => p.status === 0)

  // Due today
  const now = new Date().toISOString()
  const dueToday = inRevision.filter(p => !p.next_review_at || p.next_review_at <= now).length

  // Streak
  const reviewDates = progress
    .map(p => p.last_review_at)
    .filter((d): d is string => !!d)
  const streak = calculateStreak(reviewDates)

  // Level / XP
  const levelInfo = calculateLevel(completed.length)

  // Themes touched
  const vocabIds = progress.map(p => p.vocab_id)
  let themesTouched = 0
  if (vocabIds.length > 0) {
    const { data: vocabThemes } = await serviceClient
      .from('vocabulary')
      .select('theme')
      .in('word_id', vocabIds)
    const themeSet = new Set((vocabThemes ?? []).map(v => v.theme).filter(Boolean))
    themesTouched = themeSet.size
  }

  // Continue Learning: most recently reviewed word + its theme stats
  let continueLearning: DashboardData['continueLearning'] = null
  if (progress.length > 0) {
    const sorted = [...progress].sort((a, b) => {
      if (!a.last_review_at) return 1
      if (!b.last_review_at) return -1
      return new Date(b.last_review_at).getTime() - new Date(a.last_review_at).getTime()
    })
    const lastProgress = sorted[0]

    const { data: lastVocab } = await serviceClient
      .from('vocabulary')
      .select('word_id, word_ar, word_tr, level, theme, definitions')
      .eq('word_id', lastProgress.vocab_id)
      .single()

    if (lastVocab) {
      const defs = lastVocab.definitions as Array<{ english?: string; direct_english?: string }> | null
      const meaning = defs?.[0]?.direct_english ?? defs?.[0]?.english ?? ''

      // Count words in this theme at this level
      const { data: themeWords } = await serviceClient
        .from('vocabulary')
        .select('word_id')
        .eq('level', lastVocab.level)
        .eq('theme', lastVocab.theme)

      const themeWordIds = (themeWords ?? []).map(w => w.word_id)
      const themeProgress = progress.filter(p => themeWordIds.includes(p.vocab_id))
      const themeCompleted = themeProgress.filter(p => p.status === 1).length
      const totalThemeWords = themeWordIds.length

      continueLearning = {
        theme: lastVocab.theme,
        level: lastVocab.level,
        levelSlug: lastVocab.level.toLowerCase(),
        wordPosition: themeCompleted,
        totalWords: totalThemeWords,
        progressPct: totalThemeWords > 0 ? Math.round((themeCompleted / totalThemeWords) * 100) : 0,
        lastWordAr: lastVocab.word_ar,
        lastWordTr: lastVocab.word_tr,
        lastWordEn: meaning,
        lastStudiedAt: lastProgress.last_review_at,
      }
    }
  }

  // Insights (computed from real data)
  const insights: string[] = []
  if (completed.length > 0) {
    insights.push(`You've mastered ${completed.length} words — keep going!`)
  }
  if (streak.current >= 3) {
    insights.push(`You're on a ${streak.current}-day streak. Consistency is key!`)
  } else if (streak.current === 0 && progress.length > 0) {
    insights.push("You haven't studied today yet. Even 5 minutes counts!")
  }
  if (dueToday > 0) {
    insights.push(`You have ${dueToday} cards due for review today.`)
  }
  if (insights.length === 0) {
    insights.push('Welcome! Start with a quick review to build your streak.')
  }

  return {
    user: {
      id: userId,
      email: user.email ?? '',
      name,
      joinedAt: user.created_at,
    },
    streak,
    level: levelInfo,
    stats: {
      wordsLearned: progress.length,
      wordsMastered: completed.length,
      wordsInRevision: inRevision.length,
      sentencesWritten: Math.floor(completed.length * 0.4), // placeholder
      hoursStudied: Math.floor(progress.length * 0.15), // placeholder
      totalThemesTouched: themesTouched,
    },
    goals: {
      reviews: { current: Math.min(dueToday, 30), target: 30 },
      newWords: { current: Math.min(inRevision.filter(p => p.repetitions === 0).length, 10), target: 10 },
      studyTime: { current: Math.floor(progress.length * 0.05), target: 15 },
    },
    continueLearning,
    dueToday,
    insights,
  }
}
