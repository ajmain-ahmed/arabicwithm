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
  if (!userId) return []

  const { data, error } = await serviceClient.rpc('get_theme_progress', {
    p_user_id: userId,
    p_level_code: levelCode,
  })

  if (error) {
    console.error("[fetchThemesWithProgress] RPC error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((t: any) => ({
    theme_id: Number(t.theme_id),
    display_name: t.display_name,
    total_words: Number(t.total_words),
    completed_count: Number(t.completed_count),
    revision_count: Number(t.revision_count),
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
  theme_id: number
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
    .select("word_id, word_ar, word_di, word_tr, theme_id, level_id, forms")
    .eq("theme_id", themeId)
    .eq("level_id", levelId)
    .order("word_id")

  if (vocabErr) throw new Error(vocabErr.message)
  if (!vocabData || vocabData.length === 0) {
    return { vocab: [], progress: [], examples: [] }
  }

  const vocabIds = vocabData.map(v => v.word_id)

  // 3. Get definitions (batched)
  const { data: defData, error: defErr } = await serviceClient
    .from("definitions")
    .select("vocab_id, pos, meaning, def_ar, def_tr, def_en")
    .in("vocab_id", vocabIds)

  if (defErr) throw new Error(defErr.message)

  // 4. Get examples (batched)
  const { data: exData, error: exErr } = await serviceClient
    .from("examples")
    .select("vocab_id, ex_ar, ex_di, ex_tr, ex_en, interactive")
    .in("vocab_id", vocabIds)

  if (exErr) throw new Error(exErr.message)

  // 5. Build lookup maps
  const defMap = new Map<number, { pos: string; meaning: string; def_ar: string | null; def_tr: string | null; def_en: string | null }[]>()
  for (const d of defData ?? []) {
    const list = defMap.get(d.vocab_id) ?? []
    list.push({ pos: d.pos, meaning: d.meaning, def_ar: d.def_ar, def_tr: d.def_tr, def_en: d.def_en })
    defMap.set(d.vocab_id, list)
  }

  const exMap = new Map<number, { ex_ar: string; ex_di: string; ex_tr: string; ex_en: string; interactive: boolean }[]>()
  for (const e of exData ?? []) {
    const list = exMap.get(e.vocab_id) ?? []
    list.push({ ex_ar: e.ex_ar ?? '', ex_di: e.ex_di ?? '', ex_tr: e.ex_tr ?? '', ex_en: e.ex_en ?? '', interactive: e.interactive ?? false })
    exMap.set(e.vocab_id, list)
  }

  // 6. Build VocabRow and ExampleRow
  const vocab: VocabRow[] = []
  const examples: ExampleRow[] = []

  for (const v of vocabData) {
    const defs = defMap.get(v.word_id) ?? []
    const primary = defs[0] ?? { pos: "unknown", meaning: "", def_ar: null, def_tr: null, def_en: null }

    let parsedForms: FormRow[] | null = null
    if (v.forms) {
      try {
        parsedForms = Array.isArray(v.forms)
          ? (v.forms as unknown as FormRow[])
          : JSON.parse(v.forms as string)
      } catch {
        parsedForms = null
      }
    }

    vocab.push({
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
      forms: parsedForms,
    })

    const exList = exMap.get(v.word_id) ?? []
    for (const e of exList) {
      examples.push({
        vocab_id: v.word_id,
        ex_ar: e.ex_ar,
        ex_dia: e.ex_di ?? "",
        ex_en: e.ex_en ?? "",
        interactive: e.interactive ?? false,
        ex_tr: e.ex_tr ?? "",
      })
    }
  }

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