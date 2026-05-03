"use server"

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { normalizeArabicToken } from "@/app/lib/arabic"

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
  levelCode: string,
  dialectCode: string
): Promise<ThemeProgress[]> {
  if (!levelCode || typeof levelCode !== 'string' || levelCode.length > 10) {
    throw new Error('Invalid levelCode')
  }
  if (!dialectCode || typeof dialectCode !== 'string' || dialectCode.length > 10) {
    throw new Error('Invalid dialectCode')
  }
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
  ex_tr?: string   // ✅ matches the column name and component
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
  transliteration: string   // ← NEW
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
    .select(`id, theme_id, level_id, word, diacritics, transliteration, levels!inner(code)`)
    //                                        
    .eq("theme_id", themeId)
    .eq("dialect_id", dialectData.id)
    .order("id")

  if (vocabErr) throw new Error(vocabErr.message)

  if (!rawVocab || rawVocab.length === 0) {
    return { vocab: [], progress: [], examples: [] }
  }

  const vocabIds = rawVocab.map(v => v.id)

  // 3. Definitions
  const { data: defData, error: defErr } = await serviceClient
    .from("definitions")
    .select("vocabulary_id, definition, pos, sort_order")
    .in("vocabulary_id", vocabIds)
    .order("sort_order")

  if (defErr) throw new Error(defErr.message)

  const defMap = new Map<number, { definition: string; pos: string }[]>()
    ; (defData ?? []).forEach(d => {
      const list = defMap.get(d.vocabulary_id) || []
      list.push({ definition: d.definition, pos: d.pos })
      defMap.set(d.vocabulary_id, list)
    })

  // 4. Fetch ALL examples for this level and match by normalised token
  const levelId = rawVocab[0]?.level_id
  let examples: ExampleRow[] = []

  if (levelId) {
    const { data: allEx, error: exErr } = await serviceClient
      .from("examples")
      .select("id, ex_ar, ex_dia, ex_en, ex_tr, interactive, level_id, vocabulary_id")
      .eq("level_id", levelId)

    if (exErr) {
      console.error("[fetchThemeVocabWithProgress] examples error:", exErr.message)
    }

    console.log(`[fetchThemeVocabWithProgress] levelId=${levelId}, examples fetched=${allEx?.length ?? 0}, vocab words=${rawVocab.length}`)

    // Build map: normalised token → example rows
    const exByNormToken = new Map<string, typeof allEx>()
    for (const ex of allEx ?? []) {
      const tokens = (ex.ex_ar ?? '')
        .split(/[\s\.,،؛:!؟»«]+/)
        .filter((t: string) => t.length > 0)
      const seen = new Set<string>()
      for (const token of tokens) {
        const norm = normalizeArabicToken(token)
        if (seen.has(norm)) continue
        seen.add(norm)
        const list = exByNormToken.get(norm) ?? []
        list.push(ex)
        exByNormToken.set(norm, list)
      }
    }

    console.log(`[fetchThemeVocabWithProgress] indexed ${exByNormToken.size} unique normalised tokens`)

    // Match each vocab word to examples (dedupe per vocab word)
    const assigned = new Set<string>()
    for (const v of rawVocab) {
      const normWord = normalizeArabicToken(v.word)
      const matches = exByNormToken.get(normWord) ?? []
      if (matches.length > 0) {
        console.log(`[fetchThemeVocabWithProgress] vocab "${v.word}" (norm="${normWord}") matched ${matches.length} examples`)
      }
      for (const ex of matches) {
        const key = `${v.id}:${ex.id}`
        if (assigned.has(key)) continue
        assigned.add(key)
        examples.push({
          vocab_id: v.id,
          ex_ar: ex.ex_ar,
          ex_dia: ex.ex_dia,
          ex_en: ex.ex_en,
          interactive: ex.interactive,
          ex_tr: ex.ex_tr ?? '',
        })
      }
    }

    console.log(`[fetchThemeVocabWithProgress] total matched examples=${examples.length}`)
  } else {
    console.warn("[fetchThemeVocabWithProgress] no levelId found on vocab rows")
  }

  // 5. Map to VocabRow
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
      transliteration: r.transliteration ?? "",   // ← ADD THIS
    }
  })

  // 6. Progress
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

/* ── fetch user's revision vocab ids ── */
export async function fetchRevisionVocabIds(): Promise<number[]> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return []

  const { data, error } = await serviceClient
    .from("progress")
    .select("vocabulary_id")
    .eq("user_id", userId)
    .eq("is_in_revision", true)

  if (error) {
    console.error("[fetchRevisionVocabIds] error:", error.message)
    return []
  }

  return (data ?? []).map((r) => Number(r.vocabulary_id))
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
      vocabulary_id: vocabId,
      is_completed: isCompleted,
      is_in_revision: isInRevision,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,vocabulary_id" }
  )

  if (error) throw new Error(error.message)
}