"use server"

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const serviceUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!
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
  levelCode: string,
  dialectCode: string
): Promise<ThemeProgress[]> {
  const userId = await getAuthenticatedUserId()

  // Use the RPC
  const { data, error } = await serviceClient.rpc("get_theme_progress_v2", {
    p_user_id: userId ?? null,
    p_level_code: levelCode,
    p_dialect_code: dialectCode,
  })

  if (error) throw new Error(error.message)

  return (data ?? []).map((r: any) => ({
    theme_id: Number(r.theme_id),
    display_name: r.display_name,
    total_words: Number(r.total_words),
    completed_count: Number(r.completed_count),
    revision_count: Number(r.revision_count),
  }))
}

/* ── vocabulary row shapes ── */
export type ExampleRow = {
  vocab_id: number
  ex_ar: string
  ex_dia: string
  ex_en: string
  interactive: boolean
}

export type VocabRow = {
  id: number
  level: string
  theme_id: number
  pos: string
  definition: string
  dialect: string
  word: string
  word_diacritic: string
}

export type WordProgress = {
  vocab_id: number
  is_completed: boolean
  is_in_revision: boolean
}

/* ── fetch vocab + defs + examples ── */
export async function fetchThemeVocabWithProgress(
  themeId: number,
  dialectCode: string
): Promise<{
  vocab: VocabRow[]
  progress: WordProgress[]
  examples: ExampleRow[]
}> {
  const userId = await getAuthenticatedUserId()

  // 1. Resolve dialect id
  const { data: dialectData, error: dialectErr } = await serviceClient
    .from("dialects")
    .select("id, name, code")
    .eq("code", dialectCode)
    .single()

  if (dialectErr || !dialectData) throw new Error("Dialect not found")

  // 2. Fetch vocabulary — no forms column
  const { data: rawVocab, error: vocabErr } = await serviceClient
    .from("vocabulary")
    .select(`id, theme_id, level_id, word, diacritics, levels!inner(code)`)
    .eq("theme_id", themeId)
    .eq("dialect_id", dialectData.id)
    .order("id")

  if (vocabErr) throw new Error(vocabErr.message)

  if (!rawVocab || rawVocab.length === 0) {
    return { vocab: [], progress: [], examples: [] }
  }

  const vocabIds = rawVocab.map(v => v.id)

  // 3. Definitions & examples
  const [defRes, exRes] = await Promise.all([
    serviceClient.from("definitions").select("vocabulary_id, definition, pos, sort_order")
      .in("vocabulary_id", vocabIds).order("sort_order"),
    serviceClient.from("examples").select("vocabulary_id, ex_ar, ex_dia, ex_en, interactive")
      .in("vocabulary_id", vocabIds),
  ])

  const defMap = new Map<number, { definition: string; pos: string }[]>()
  ;(defRes.data ?? []).forEach(d => {
    const list = defMap.get(d.vocabulary_id) || []
    list.push({ definition: d.definition, pos: d.pos })
    defMap.set(d.vocabulary_id, list)
  })

  const examples: ExampleRow[] = (exRes.data ?? []).map(e => ({
    vocab_id: e.vocabulary_id,
    ex_ar: e.ex_ar,
    ex_dia: e.ex_dia,
    ex_en: e.ex_en,
    interactive: e.interactive,
  }))

  // 4. Map to VocabRow (only single word form)
  const vocab: VocabRow[] = rawVocab.map((r: any) => {
    const defs = defMap.get(r.id) ?? [{ definition: "", pos: "unknown" }]
    const primaryDef = defs[0]

    return {
      id: r.id,
      level: r.levels.code,
      theme_id: r.theme_id,
      pos: primaryDef.pos,
      definition: primaryDef.definition,
      dialect: dialectData.name,
      word: r.word,
      word_diacritic: r.diacritics ?? "",
    }
  })

  // 5. Progress
  let progress: WordProgress[] = []
  if (userId) {
    const { data: progData } = await serviceClient
      .from("progress")
      .select("vocabulary_id, is_completed, is_in_revision")
      .eq("user_id", userId)
      .in("vocabulary_id", vocabIds)

    progress = (progData ?? []).map(p => ({
      vocab_id: p.vocabulary_id,
      is_completed: p.is_completed,
      is_in_revision: p.is_in_revision,
    }))
  }

  return { vocab, progress, examples }
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
  const userId = await getAuthenticatedUserId()
  if (!userId) return

  const { error } = await serviceClient.from("progress").upsert(
    {
      user_id: userId,
      vocabulary_id: vocabId,
      is_completed: isCompleted,
      is_in_revision: isInRevision,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,vocabulary_id" }
  )

  if (error) throw new Error(error.message)
}