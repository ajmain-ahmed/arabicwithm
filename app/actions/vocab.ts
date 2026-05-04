"use server"

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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
        setAll() { },
      },
    }
  )
}

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = await getAuthClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) { console.error("[auth] getUser error:", error.message); return null }
    return data.user?.id ?? null
  } catch (e) {
    console.error("[auth] unexpected error:", e)
    return null
  }
}

/* ── theme progress ── */
export type ThemeProgress = {
  theme_id: number
  display_name: string
  total_words: number
  completed_count: number
  revision_count: number
}

export async function fetchThemesWithProgress(
  levelCode: string
): Promise<ThemeProgress[]> {
  if (!levelCode || typeof levelCode !== 'string' || levelCode.length > 10) {
    throw new Error('Invalid levelCode')
  }
  const userId = await getAuthenticatedUserId()

  // 1. Resolve level_id from code
  const { data: levelData, error: levelErr } = await serviceClient
    .from("levels")
    .select("id")
    .eq("code", levelCode)
    .single()

  if (levelErr || !levelData) {
    console.error("[fetchThemesWithProgress] level not found:", levelCode, levelErr?.message)
    return []
  }
  const levelId = levelData.id

  // 2. Get all vocab for this level
  const { data: vocabData, error: vocabErr } = await serviceClient
    .from("vocab")
    .select("word_id, theme_id")
    .eq("level_id", levelId)

  if (vocabErr) {
    console.error("[fetchThemesWithProgress] vocab error:", vocabErr.message)
    throw new Error(vocabErr.message)
  }

  // 3. Get themes that have vocab for this level
  const themeIds = [...new Set((vocabData ?? []).map(v => v.theme_id))]
  if (themeIds.length === 0) return []

  const { data: themesData, error: themesErr } = await serviceClient
    .from("themes")
    .select("id, display_name")
    .in("id", themeIds)
    .order("id")

  if (themesErr) {
    console.error("[fetchThemesWithProgress] themes error:", themesErr.message)
    throw new Error(themesErr.message)
  }

  // 4. Count vocab per theme
  const vocabPerTheme = new Map<number, number>()
  const vocabIds: number[] = []
  for (const v of vocabData ?? []) {
    vocabPerTheme.set(v.theme_id, (vocabPerTheme.get(v.theme_id) ?? 0) + 1)
    vocabIds.push(v.word_id)
  }

  // 5. Get progress for user
  let completedSet = new Set<number>()
  let revisionSet = new Set<number>()

  if (userId && vocabIds.length > 0) {
    const { data: progData } = await serviceClient
      .from("progress")
      .select("vocab_id, is_completed, is_in_revision")
      .eq("user_id", userId)
      .in("vocab_id", vocabIds)

    for (const p of progData ?? []) {
      if (p.is_completed) completedSet.add(p.vocab_id)
      if (p.is_in_revision) revisionSet.add(p.vocab_id)
    }
  }

  // 6. Map vocab_id → theme_id for progress counting
  const vocabThemeMap = new Map<number, number>()
  for (const v of vocabData ?? []) {
    vocabThemeMap.set(v.word_id, v.theme_id)
  }

  const completedPerTheme = new Map<number, number>()
  const revisionPerTheme = new Map<number, number>()
  for (const vocabId of completedSet) {
    const themeId = vocabThemeMap.get(vocabId)
    if (themeId != null) {
      completedPerTheme.set(themeId, (completedPerTheme.get(themeId) ?? 0) + 1)
    }
  }
  for (const vocabId of revisionSet) {
    const themeId = vocabThemeMap.get(vocabId)
    if (themeId != null) {
      revisionPerTheme.set(themeId, (revisionPerTheme.get(themeId) ?? 0) + 1)
    }
  }

  // 7. Build ThemeProgress
  return (themesData ?? []).map((t) => ({
    theme_id: Number(t.id),
    display_name: t.display_name,
    total_words: vocabPerTheme.get(t.id) ?? 0,
    completed_count: completedPerTheme.get(t.id) ?? 0,
    revision_count: revisionPerTheme.get(t.id) ?? 0,
  }))
}

/* ── vocabulary row shapes ── */
export type ExampleRow = {
  vocab_id: number
  ex_ar: string
  ex_dia: string
  ex_en: string
  interactive: boolean
  ex_tr?: string
}

export type VocabRow = {
  id: number
  level: string
  theme_id: number
  pos: string
  definition: string
  word: string
  word_diacritic: string
  transliteration: string
  def_ar: string | null
  def_tr: string | null
  def_en: string | null
}

export type WordProgress = {
  vocab_id: number
  is_completed: boolean
  is_in_revision: boolean
}

/* ── fetch vocab + defs + examples for a theme ── */
export async function fetchThemeVocabWithProgress(
  themeId: number,
  levelCode: string
): Promise<{
  vocab: VocabRow[]
  progress: WordProgress[]
  examples: ExampleRow[]
}> {
  const userId = await getAuthenticatedUserId()

  // 1. Resolve level_id
  const { data: levelData, error: levelErr } = await serviceClient
    .from("levels")
    .select("id")
    .eq("code", levelCode)
    .single()

  if (levelErr || !levelData) throw new Error("Level not found")
  const levelId = levelData.id

  // 2. Get vocab for this theme and level
  const { data: vocabData, error: vocabErr } = await serviceClient
    .from("vocab")
    .select("word_id, word_ar, word_di, word_tr, theme_id, level_id")
    .eq("theme_id", themeId)
    .eq("level_id", levelId)
    .order("word_id")

  if (vocabErr) throw new Error(vocabErr.message)
  if (!vocabData || vocabData.length === 0) {
    return { vocab: [], progress: [], examples: [] }
  }

  const vocabIds = vocabData.map(v => v.word_id)

  // 3. Get definitions
  const { data: defData, error: defErr } = await serviceClient
    .from("definitions")
    .select("vocab_id, pos, meaning, def_ar, def_tr, def_en")
    .in("vocab_id", vocabIds)

  if (defErr) throw new Error(defErr.message)

  // 4. Get examples
  const { data: exData, error: exErr } = await serviceClient
    .from("examples")
    .select("vocab_id, ex_ar, ex_di, ex_tr, ex_en, interactive")
    .in("vocab_id", vocabIds)

  if (exErr) throw new Error(exErr.message)

  // 5. Build VocabRow
  const defMap = new Map<number, { pos: string; meaning: string; def_ar: string | null; def_tr: string | null; def_en: string | null }[]>()
  for (const d of defData ?? []) {
    const list = defMap.get(d.vocab_id) ?? []
    list.push({ pos: d.pos, meaning: d.meaning, def_ar: d.def_ar, def_tr: d.def_tr, def_en: d.def_en })
    defMap.set(d.vocab_id, list)
  }

  const vocab: VocabRow[] = vocabData.map(v => {
    const defs = defMap.get(v.word_id) ?? [{ pos: "unknown", meaning: "", def_ar: null, def_tr: null, def_en: null }]
    const primary = defs[0]
    return {
      id: v.word_id,
      level: levelCode,
      theme_id: v.theme_id,
      pos: primary.pos,
      definition: primary.meaning,
      word: v.word_ar,
      word_diacritic: v.word_di ?? "",
      transliteration: v.word_tr ?? "",
      def_ar: primary.def_ar,
      def_tr: primary.def_tr,
      def_en: primary.def_en,
    }
  })

  // 6. Build ExampleRow
  const examples: ExampleRow[] = (exData ?? []).map(e => ({
    vocab_id: e.vocab_id,
    ex_ar: e.ex_ar,
    ex_dia: e.ex_di ?? "",
    ex_en: e.ex_en ?? "",
    interactive: e.interactive ?? false,
    ex_tr: e.ex_tr ?? "",
  }))

  // 7. Get progress
  let progress: WordProgress[] = []
  if (userId) {
    const { data: progData } = await serviceClient
      .from("progress")
      .select("vocab_id, is_completed, is_in_revision")
      .eq("user_id", userId)
      .in("vocab_id", vocabIds)

    progress = (progData ?? []).map(p => ({
      vocab_id: p.vocab_id,
      is_completed: p.is_completed,
      is_in_revision: p.is_in_revision,
    }))
  }

  return { vocab, progress, examples }
}

/* ── fetch user's revision vocab ids ── */
export async function fetchRevisionVocabIds(): Promise<number[]> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return []

  const { data, error } = await serviceClient
    .from("progress")
    .select("vocab_id")
    .eq("user_id", userId)
    .eq("is_in_revision", true)

  if (error) {
    console.error("[fetchRevisionVocabIds] error:", error.message)
    return []
  }

  return (data ?? []).map((r) => Number(r.vocab_id))
}

/* ── upsert progress ── */
export async function upsertWordProgress({
  vocabId,
  isCompleted,
  isInRevision,
}: {
  vocabId: number
  isCompleted: boolean
  isInRevision: boolean
}): Promise<void> {
  if (!Number.isFinite(vocabId) || vocabId <= 0) {
    throw new Error('Invalid vocabId')
  }
  const userId = await getAuthenticatedUserId()
  if (!userId) return

  const { error } = await serviceClient.from("progress").upsert(
    {
      user_id: userId,
      vocab_id: vocabId,
      is_completed: isCompleted,
      is_in_revision: isInRevision,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,vocab_id" }
  )

  if (error) throw new Error(error.message)
}
