'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const serviceUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!serviceUrl || !serviceKey) {
  throw new Error('Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY')
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

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = await getAuthClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) { console.error('[auth] getUser error:', error.message); return null }
    return data.user?.id ?? null
  } catch (e) {
    console.error('[auth] unexpected error:', e)
    return null
  }
}

import {
  getLevelFromXp,
  getXpForLevel,
  getLevelProgress,
  getRankTitle,
} from '@/app/lib/xp'

/* ── Types ─────────────────────────────────────────────────────────── */

export type UserStats = {
  totalXp: number
  currentLevel: number
  rankTitle: string
  levelProgress: number // 0..1
  weeklyXp: number
  streakDays: number
}

export type XpGain = {
  amount: number
  source: 'word_complete' | 'theme_bonus' | 'revision_review'
}

/* ── Fetch stats ───────────────────────────────────────────────────── */

export async function fetchUserStats(): Promise<UserStats | null> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return null

  const { data, error } = await serviceClient
    .from('user_stats')
    .select('total_xp, weekly_xp, streak_days')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[fetchUserStats] error:', error.message)
  }

  const totalXp = data?.total_xp ?? 0
  const level = getLevelFromXp(totalXp)

  return {
    totalXp,
    currentLevel: level,
    rankTitle: getRankTitle(level),
    levelProgress: getLevelProgress(totalXp),
    weeklyXp: data?.weekly_xp ?? 0,
    streakDays: data?.streak_days ?? 0,
  }
}

/* ── Award XP ──────────────────────────────────────────────────────── */

export async function awardXp(gain: XpGain & { referenceId?: number }): Promise<UserStats | null> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return null

  // 1. Insert transaction
  const { error: txErr } = await serviceClient.from('xp_transactions').insert({
    user_id: userId,
    amount: gain.amount,
    source: gain.source,
    reference_id: gain.referenceId ?? null,
    created_at: new Date().toISOString(),
  })

  if (txErr) {
    console.error('[awardXp] transaction error:', txErr.message)
    return null
  }

  // 2. Read existing total_xp (if any)
  const { data: existing, error: readErr } = await serviceClient
    .from('user_stats')
    .select('total_xp')
    .eq('user_id', userId)
    .maybeSingle()

  if (readErr) {
    console.error('[awardXp] read error:', readErr.message)
  }

  const newTotal = (existing?.total_xp ?? 0) + gain.amount
  const newLevel = getLevelFromXp(newTotal)

  // 3. Upsert user_stats — only touch columns guaranteed to exist
  const { error: upsertErr } = await serviceClient.from('user_stats').upsert(
    {
      user_id: userId,
      total_xp: newTotal,
    },
    { onConflict: 'user_id' }
  )

  if (upsertErr) {
    console.error('[awardXp] upsert error:', upsertErr.message, upsertErr.details, upsertErr.hint)
    return null
  }

  return {
    totalXp: newTotal,
    currentLevel: newLevel,
    rankTitle: getRankTitle(newLevel),
    levelProgress: getLevelProgress(newTotal),
    weeklyXp: 0, // not tracked in this path
    streakDays: 0,
  }
}

/* ── Check if theme bonus already awarded ──────────────────────────── */

export async function hasThemeBonus(themeId: number): Promise<boolean> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return true // treat as awarded so caller skips

  const { data, error } = await serviceClient
    .from('xp_transactions')
    .select('transaction_id')
    .eq('user_id', userId)
    .eq('source', 'theme_bonus')
    .eq('reference_id', themeId)
    .limit(1)

  if (error) {
    console.error('[hasThemeBonus] error:', error.message)
    return false // allow retry on error
  }

  return (data?.length ?? 0) > 0
}

/* ── Award theme bonus (with dedupe) ───────────────────────────────── */

export async function awardThemeBonus(themeId: number): Promise<UserStats | null> {
  const already = await hasThemeBonus(themeId)
  if (already) return null

  return awardXp({ amount: 50, source: 'theme_bonus', referenceId: themeId })
}

/* ── Award word completion XP ──────────────────────────────────────── */

export async function awardWordComplete(vocabId: number): Promise<UserStats | null> {
  return awardXp({ amount: 10, source: 'word_complete', referenceId: vocabId })
}
