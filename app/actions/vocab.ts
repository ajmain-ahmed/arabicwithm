// app/actions/vocab.ts

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

/* ── JSONB helpers ── */

function getPos(formsJson: any): string {
  if (!Array.isArray(formsJson) || formsJson.length === 0) return 'unknown'
  return formsJson[0]?.type ?? 'unknown'
}

function flattenForms(formsJson: any): FormRow[] | null {
  if (!Array.isArray(formsJson) || formsJson.length === 0) return null
  const first = formsJson[0]
  if (!first?.conjugations) return null
  const rows: FormRow[] = []
  for (const [key, val] of Object.entries(first.conjugations)) {
    if (val && typeof val === 'object') {
      rows.push({
        type: (val as any).type ?? key,
        con_ar: (val as any).con_ar ?? '',
        con_di: (val as any).con_di ?? '',
        con_en: (val as any).con_en ?? '',
        con_tr: (val as any).con_tr ?? '',
      })
    }
  }
  return rows.length > 0 ? rows : null
}

/* ── theme progress ── */
export type ThemeProgress = {
  theme_id: string
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

  if (!userId) {
    const { data: vocabData } = await serviceClient
      .from('vocabulary')
      .select('theme')
      .eq('level', levelCode)

    const themeCounts = new Map<string, number>()
    for (const v of vocabData ?? []) {
      const t = v.theme
      if (t) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1)
    }

    const themes = Array.from(themeCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    return themes.map(([theme, count]) => ({
      theme_id: theme,
      display_name: theme,
      total_words: count,
      completed_count: 0,
      revision_count: 0,
    }))
  }

  // Authenticated: query vocabulary + progress directly
  const { data: vocabData } = await serviceClient
    .from('vocabulary')
    .select('word_id, theme')
    .eq('level', levelCode)

  const wordIds = (vocabData ?? []).map(v => v.word_id)

  const { data: progressData } = wordIds.length > 0
    ? await serviceClient
        .from('progress')
        .select('vocab_id, is_completed, is_in_revision')
        .eq('user_id', userId)
        .in('vocab_id', wordIds)
    : { data: [] }

  const progressMap = new Map((progressData ?? []).map(p => [p.vocab_id, p]))
  const themeStats = new Map<string, { total: number; completed: number; revision: number }>()

  for (const v of vocabData ?? []) {
    const theme = v.theme ?? 'Untitled'
    if (!themeStats.has(theme)) {
      themeStats.set(theme, { total: 0, completed: 0, revision: 0 })
    }
    const stats = themeStats.get(theme)!
    stats.total++
    const p = progressMap.get(v.word_id)
    if (p?.is_completed) stats.completed++
    if (p?.is_in_revision) stats.revision++
  }

  return Array.from(themeStats.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([theme, stats]) => ({
      theme_id: theme,
      display_name: theme,
      total_words: stats.total,
      completed_count: stats.completed,
      revision_count: stats.revision,
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

export type FormRow = {
  type: string
  con_ar: string
  con_di: string
  con_en: string
  con_tr: string
}

export type VocabRow = {
  id: number
  level: string
  theme_id: string
  pos: string
  definition: string
  word: string
  word_diacritic: string
  transliteration: string
  def_ar: string | null
  def_tr: string | null
  def_en: string | null
  forms: FormRow[] | null
}

export type WordProgress = {
  vocab_id: number
  is_completed: boolean
  is_in_revision: boolean
}

/* ── fetch vocab + defs + examples for a theme (parallelized) ── */
export async function fetchThemeVocabWithProgress(
  themeId: string,
  levelCode: string
): Promise<{
  vocab: VocabRow[]
  progress: WordProgress[]
  examples: ExampleRow[]
}> {
  const userId = await getAuthenticatedUserId()

  // 1. Get vocab for this theme and level
  const { data: vocabData, error: vocabErr } = await serviceClient
    .from("vocabulary")
    .select("word_id, word_ar, word_di, word_tr, theme, level, forms, definitions, examples")
    .eq("theme", themeId)
    .eq("level", levelCode)
    .order("word_id")

  if (vocabErr) throw new Error(vocabErr.message)
  if (!vocabData || vocabData.length === 0) {
    return { vocab: [], progress: [], examples: [] }
  }

  const vocabIds = vocabData.map(v => v.word_id)

  // 2. Fetch progress in parallel
  const { data: progData } = userId
    ? await serviceClient.from("progress").select("vocab_id, is_completed, is_in_revision").eq("user_id", userId).in("vocab_id", vocabIds)
    : { data: [] }

  // 3. Build VocabRow and ExampleRow
  const vocab: VocabRow[] = []
  const examples: ExampleRow[] = []

  for (const v of vocabData) {
    const definitions = Array.isArray(v.definitions) ? v.definitions : []
    const primary = definitions[0] ?? null

    const exList = Array.isArray(v.examples) ? v.examples : []
    for (const e of exList) {
      examples.push({
        vocab_id: v.word_id,
        ex_ar: e.ar ?? '',
        ex_dia: e.ar_di ?? '',
        ex_en: e.en ?? '',
        interactive: e.interactive ?? false,
        ex_tr: e.tr ?? '',
      })
    }

    vocab.push({
      id: v.word_id,
      level: levelCode,
      theme_id: v.theme ?? '',
      pos: getPos(v.forms),
      definition: primary?.direct_english ?? primary?.english ?? '',
      word: v.word_ar,
      word_diacritic: v.word_di ?? "",
      transliteration: v.word_tr ?? "",
      def_ar: primary?.simple_ar ?? null,
      def_tr: primary?.simple_ar_tr ?? null,
      def_en: primary?.english ?? null,
      forms: flattenForms(v.forms),
    })
  }

  // 4. Progress already fetched above
  const progress: WordProgress[] = (progData ?? []).map((p: any) => ({
    vocab_id: p.vocab_id,
    is_completed: p.is_completed,
    is_in_revision: p.is_in_revision,
  }))

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

export async function upsertWordProgressBatch(
  items: { vocabId: number; isCompleted: boolean; isInRevision: boolean }[]
): Promise<void> {
  const userId = await getAuthenticatedUserId()
  if (!userId || items.length === 0) return

  const now = new Date().toISOString()
  const rows = items.map(({ vocabId, isCompleted, isInRevision }) => ({
    user_id: userId,
    vocab_id: vocabId,
    is_completed: isCompleted,
    is_in_revision: isInRevision,
    updated_at: now,
  }))

  const { error } = await serviceClient
    .from("progress")
    .upsert(rows, { onConflict: "user_id,vocab_id" })

  if (error) throw new Error(error.message)
}
