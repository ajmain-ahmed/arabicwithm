// app/actions/vocab.ts

"use server"

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// ─── Service Role Client (bypasses RLS) ─────────────────────────────────────
const serviceUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!

const serviceClient = createServiceClient(serviceUrl, serviceKey)

// ─── Auth client ─────────────────────────────────────────────────────────────
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

// ─── Raw DB row (before parsing) ─────────────────────────────────────────────
// Supabase returns jsonb columns as already-parsed JS values (not strings).

type RawVocabRow = {
  id: number
  level: string
  theme_id: number
  root: string | null
  pos: string
  definition: string
  word: any // jsonb → arrives as JS array/object, not a string
}

// ─── Parsed types ─────────────────────────────────────────────────────────────

export type WordForm = {
  raw: string           // plain Arabic script (no diacritics)
  dia: string           // Arabic with diacritics
  tr: string            // transliteration
  gen: string           // gender: "m" | "f" | "mf" | etc.
}

export type ExampleRow = {
  vocab_id: number      // parent vocab word id
  ex_ar: string
  ex_di: string
  ex_en: string
  ex_tr: string
  difficulty: number
  interactive: boolean
}

export type VocabRow = {
  id: number
  level: string
  theme_id: any
  root: string | null
  pos: string           // part of speech (replaces old `type`)
  definition: string
  dialect: string       // e.g. "MSA", "EGY"
  forms: WordForm[]     // all forms; at least one
  // Convenience fields derived from forms[0]:
  word: string          // forms[0].raw
  word_diacritic: string // forms[0].dia
  transliteration: string // forms[0].tr
  gender: string        // forms[0].gen
}

export type ThemeProgress = {
  theme_id: number
  display_name: string
  total_words: number
  completed_count: number
  revision_count: number
}

export type WordProgress = {
  word_id: number
  is_completed: boolean
  is_in_revision: boolean
}

export type Theme = {
  id: number
  level: string
  display_name: string
  slug: string
}

// ─── JSON parser ──────────────────────────────────────────────────────────────

type RawWordEntry = {
  dialect: string
  forms: Array<{ raw: string; dia: string; tr: string; gen: string }>
  examples: Array<{
    ex_ar: string; ex_di: string; ex_en: string; ex_tr: string
    difficulty: number; interactive: boolean
  }>
}

function toEntries(wordField: any): RawWordEntry[] {
  // Supabase returns jsonb already parsed — it arrives as a JS array.
  // Guard against the edge case where it's still a string.
  if (Array.isArray(wordField)) return wordField as RawWordEntry[]
  if (typeof wordField === "string") {
    try { return JSON.parse(wordField) } catch { return [] }
  }
  if (wordField && typeof wordField === "object") return [wordField as RawWordEntry]
  return []
}

function parseVocabRow(raw: RawVocabRow): { vocab: VocabRow; examples: ExampleRow[] } {
  const entries = toEntries(raw.word)

  if (entries.length === 0) {
    console.warn(`Empty word entries for vocab id=${raw.id}`, raw.word)
  }

  const entry = entries[0] ?? { dialect: "MSA", forms: [], examples: [] }
  const form0 = entry.forms[0] ?? { raw: "", dia: "", tr: "", gen: "" }

  const vocab: VocabRow = {
    id: raw.id,
    level: raw.level,
    theme_id: raw.theme_id,
    root: raw.root,
    pos: raw.pos,
    definition: raw.definition,
    dialect: entry.dialect ?? "MSA",
    forms: (entry.forms ?? []).map(f => ({ raw: f.raw, dia: f.dia, tr: f.tr, gen: f.gen })),
    word: form0.raw,
    word_diacritic: form0.dia,
    transliteration: form0.tr,
    gender: form0.gen,
  }

  const examples: ExampleRow[] = (entry.examples ?? []).map(ex => ({
    vocab_id: raw.id,
    ex_ar: ex.ex_ar,
    ex_di: ex.ex_di,
    ex_en: ex.ex_en,
    ex_tr: ex.ex_tr,
    difficulty: ex.difficulty,
    interactive: ex.interactive,
  }))

  return { vocab, examples }
}

// ─── fetchThemesWithProgress ──────────────────────────────────────────────────
// Always fetch total_words directly from the vocab table to avoid RPC
// breakage if the stored procedure references outdated schema.
// The RPC is only used for completed_count / revision_count (auth users).

export async function fetchThemesWithProgress(level: string): Promise<ThemeProgress[]> {
  const userId = await getAuthenticatedUserId()

  // 1. Always load themes + raw word counts from the vocab table
  const { data: themes, error: themesError } = await serviceClient
    .from("themes")
    .select("id, display_name")
    .eq("level", level)
    .order("id")

  if (themesError) throw new Error(themesError.message)

  const themeList = themes ?? []

  // 2. Count words per theme from vocab table
  const wordCounts = await Promise.all(
    themeList.map(async (t: any) => {
      const { count } = await serviceClient
        .from("vocabulary")
        .select("id", { count: "exact", head: true })
        .eq("theme_id", t.id)
      return { theme_id: Number(t.id), total_words: count ?? 0 }
    })
  )
  const wordCountMap = new Map(wordCounts.map(w => [w.theme_id, w.total_words]))

  // 3. If authenticated, get completed + revision counts
  let completedMap = new Map<number, number>()
  let revisionMap = new Map<number, number>()

  if (userId) {
    try {
      const { data: rpcData, error: rpcError } = await serviceClient.rpc("get_theme_progress", {
        p_user_id: userId,
        p_level: level,
      })
      if (!rpcError && rpcData) {
        for (const row of rpcData) {
          completedMap.set(Number(row.id), Number(row.completed_count ?? 0))
          revisionMap.set(Number(row.id), Number(row.revision_count ?? 0))
        }
      }
    } catch (e) {
      console.warn("[fetchThemesWithProgress] RPC failed, falling back to 0 counts", e)
    }
  }

  return themeList.map((t: any) => {
    const id = Number(t.id)
    return {
      theme_id: id,
      display_name: t.display_name,
      total_words: wordCountMap.get(id) ?? 0,
      completed_count: completedMap.get(id) ?? 0,
      revision_count: revisionMap.get(id) ?? 0,
    }
  })
}

// ─── fetchThemeVocabWithProgress ──────────────────────────────────────────────

export async function fetchThemeVocabWithProgress(themeId: number): Promise<{
  vocab: VocabRow[]
  progress: WordProgress[]
  examples: ExampleRow[]
}> {
  const userId = await getAuthenticatedUserId()

  const { data: rawRows, error: vocabError } = await serviceClient
    .from("vocabulary")
    .select("id, level, theme_id, root, pos, definition, word")
    .eq("theme_id", themeId)
    .order("id")

  if (vocabError) throw new Error(vocabError.message)

  const parsed = (rawRows ?? []).map((r: RawVocabRow) => parseVocabRow(r))
  const vocab = parsed.map(p => p.vocab)
  const examples = parsed.flatMap(p => p.examples)

  if (!userId) {
    return { vocab, examples, progress: [] }
  }

  const wordIds = vocab.map(v => v.id)
  if (wordIds.length === 0) return { vocab: [], examples: [], progress: [] }

  const { data: progressData, error: progressError } = await serviceClient
    .from("progress")
    .select("word_id, is_completed, is_in_revision")
    .eq("user_id", userId)
    .in("word_id", wordIds)

  if (progressError) throw new Error(progressError.message)

  return {
    vocab,
    examples,
    progress: (progressData ?? []) as WordProgress[],
  }
}

// ─── upsertWordProgress ───────────────────────────────────────────────────────

export async function upsertWordProgress({
  wordId,
  isCompleted,
  isInRevision,
}: {
  wordId: number
  isCompleted: boolean
  isInRevision: boolean
}): Promise<void> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return

  const { error } = await serviceClient.from("progress").upsert(
    {
      user_id: userId,
      word_id: wordId,
      is_completed: isCompleted,
      is_in_revision: isInRevision,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,word_id" }
  )

  if (error) throw new Error(error.message)
}