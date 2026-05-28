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
    if (error) {
      // "Auth session missing!" is expected for anonymous users on public pages
      if (error.message !== "Auth session missing!") {
        console.error("[auth] getUser error:", error.message)
      }
      return null
    }
    return data.user?.id ?? null
  } catch (e) {
    console.error("[auth] unexpected error:", e)
    return null
  }
}

/* ── JSONB helpers ── */

function parseJsonb(val: any): any {
  if (val == null) return null
  if (Array.isArray(val)) return val
  if (typeof val === 'object') return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return null }
  }
  return null
}

function getPos(formsJson: any): string {
  const parsed = parseJsonb(formsJson)
  if (!Array.isArray(parsed) || parsed.length === 0) return 'unknown'
  return parsed[0]?.type ?? 'unknown'
}

function flattenForms(formsJson: any): FormRow[] | null {
  const parsed = parseJsonb(formsJson)
  if (!Array.isArray(parsed) || parsed.length === 0) return null

  const rows: FormRow[] = []

  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue

    // Flat format: each item is a conjugation row with con_ar directly
    if (item.con_ar && item.con_ar !== '') {
      rows.push({
        type: item.type ?? '',
        con_ar: item.con_ar ?? '',
        con_di: item.con_di ?? '',
        con_en: item.con_en ?? '',
        con_tr: item.con_tr ?? '',
      })
      continue
    }

    // Nested format: item has a conjugations object/array
    const conjugations = item.conjugations
    if (conjugations && typeof conjugations === 'object') {
      const entries = Array.isArray(conjugations)
        ? conjugations.map((c: any, i: number) => [`item_${i}`, c])
        : Object.entries(conjugations)
      for (const [key, value] of entries) {
        if (value && typeof value === 'object' && value.con_ar) {
          rows.push({
            type: value.type ?? key ?? '',
            con_ar: value.con_ar ?? '',
            con_di: value.con_di ?? '',
            con_en: value.con_en ?? '',
            con_tr: value.con_tr ?? '',
          })
        }
      }
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
        .select('vocab_id, status')
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
    if (p?.status === 1) stats.completed++
    if (p?.status === 0) stats.revision++
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
  status: number | null
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
    ? await serviceClient.from("progress").select("vocab_id, status").eq("user_id", userId).in("vocab_id", vocabIds)
    : { data: [] }

  // 3. Build VocabRow and ExampleRow
  const vocab: VocabRow[] = []
  const examples: ExampleRow[] = []

  for (const v of vocabData) {
    const definitions = parseJsonb(v.definitions) ?? []
    const primary = definitions[0] ?? null

    const exList = parseJsonb(v.examples) ?? []
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
    status: p.status,
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
    .eq("status", 0)

  if (error) {
    console.error("[fetchRevisionVocabIds] error:", error.message)
    return []
  }

  return (data ?? []).map((r) => Number(r.vocab_id))
}

/* ── admin helpers ── */

const ADMIN_UID = process.env.ADMIN ?? ''

export async function isAdminUser(): Promise<boolean> {
  const userId = await getAuthenticatedUserId()
  if (!userId || !ADMIN_UID) return false
  return userId === ADMIN_UID
}

export type VocabUpdateInput = {
  word_ar?: string
  word_di?: string
  word_tr?: string
  root?: string | null
  level?: string
  theme?: string
  forms?: unknown
  definitions?: unknown
  examples?: unknown
}

export async function updateVocabWord(
  wordId: number,
  data: VocabUpdateInput
): Promise<void> {
  if (!Number.isFinite(wordId) || wordId <= 0) {
    throw new Error('Invalid wordId')
  }
  const isAdmin = await isAdminUser()
  if (!isAdmin) throw new Error('Forbidden')

  const payload: Record<string, unknown> = {}
  if (data.word_ar !== undefined) payload.word_ar = data.word_ar
  if (data.word_di !== undefined) payload.word_di = data.word_di
  if (data.word_tr !== undefined) payload.word_tr = data.word_tr
  if (data.root !== undefined) payload.root = data.root
  if (data.level !== undefined) payload.level = data.level
  if (data.theme !== undefined) payload.theme = data.theme
  if (data.forms !== undefined) payload.forms = data.forms
  if (data.definitions !== undefined) payload.definitions = data.definitions
  if (data.examples !== undefined) payload.examples = data.examples

  const { error } = await serviceClient
    .from('vocabulary')
    .update(payload)
    .eq('word_id', wordId)

  if (error) throw new Error(error.message)
}

export async function deleteVocabWord(wordId: number): Promise<void> {
  if (!Number.isFinite(wordId) || wordId <= 0) {
    throw new Error('Invalid wordId')
  }
  const isAdmin = await isAdminUser()
  if (!isAdmin) throw new Error('Forbidden')

  const { error } = await serviceClient
    .from('vocabulary')
    .delete()
    .eq('word_id', wordId)

  if (error) throw new Error(error.message)
}

export async function createVocabWord(
  data: Omit<VocabUpdateInput, never> & { word_id?: number }
): Promise<number> {
  const isAdmin = await isAdminUser()
  if (!isAdmin) throw new Error('Forbidden')

  const payload: Record<string, unknown> = {
    word_ar: data.word_ar ?? '',
    word_di: data.word_di ?? '',
    word_tr: data.word_tr ?? '',
    root: data.root ?? null,
    level: data.level ?? 'A0',
    theme: data.theme ?? 'Untitled',
    forms: data.forms ?? [],
    definitions: data.definitions ?? [],
    examples: data.examples ?? [],
  }
  if (data.word_id !== undefined) payload.word_id = data.word_id

  const { data: result, error } = await serviceClient
    .from('vocabulary')
    .insert(payload)
    .select('word_id')
    .single()

  if (error) throw new Error(error.message)
  return result?.word_id ?? 0
}

export type RawVocabRow = {
  word_id: number
  word_ar: string
  word_di: string
  word_tr: string
  root: string | null
  level: string
  theme: string
  forms: unknown
  definitions: unknown
  examples: unknown
  created_at: string | null
}

export async function fetchRawVocabWord(wordId: number): Promise<RawVocabRow | null> {
  if (!Number.isFinite(wordId) || wordId <= 0) return null
  const isAdmin = await isAdminUser()
  if (!isAdmin) throw new Error('Forbidden')

  const { data, error } = await serviceClient
    .from('vocabulary')
    .select('word_id, word_ar, word_di, word_tr, root, level, theme, forms, definitions, examples, created_at')
    .eq('word_id', wordId)
    .single()

  if (error || !data) {
    console.error('[fetchRawVocabWord] error:', error?.message)
    return null
  }

  return {
    word_id: data.word_id,
    word_ar: data.word_ar ?? '',
    word_di: data.word_di ?? '',
    word_tr: data.word_tr ?? '',
    root: data.root ?? null,
    level: data.level ?? '',
    theme: data.theme ?? '',
    forms: data.forms,
    definitions: data.definitions,
    examples: data.examples,
    created_at: data.created_at ?? null,
  }
}

/* ── upsert progress ── */
export async function upsertWordProgress({
  vocabId,
  status,
}: {
  vocabId: number
  status: number | null
}): Promise<void> {
  if (!Number.isFinite(vocabId) || vocabId <= 0) {
    throw new Error('Invalid vocabId')
  }
  const userId = await getAuthenticatedUserId()
  if (!userId) return

  // status === null means remove from progress table
  if (status === null) {
    const { error } = await serviceClient
      .from("progress")
      .delete()
      .eq("user_id", userId)
      .eq("vocab_id", vocabId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await serviceClient.from("progress").upsert(
    {
      user_id: userId,
      vocab_id: vocabId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,vocab_id" }
  )

  if (error) throw new Error(error.message)
}

export async function upsertWordProgressBatch(
  items: { vocabId: number; status: number | null }[]
): Promise<void> {
  const userId = await getAuthenticatedUserId()
  if (!userId || items.length === 0) return

  const now = new Date().toISOString()

  // Separate deletions from upserts
  const toDelete = items.filter(i => i.status === null)
  const toUpsert = items.filter(i => i.status !== null)

  if (toDelete.length > 0) {
    const vocabIds = toDelete.map(i => i.vocabId)
    const { error: delError } = await serviceClient
      .from("progress")
      .delete()
      .eq("user_id", userId)
      .in("vocab_id", vocabIds)
    if (delError) throw new Error(delError.message)
  }

  if (toUpsert.length > 0) {
    const rows = toUpsert.map(({ vocabId, status }) => ({
      user_id: userId,
      vocab_id: vocabId,
      status,
      updated_at: now,
    }))

    const { error } = await serviceClient
      .from("progress")
      .upsert(rows, { onConflict: "user_id,vocab_id" })

    if (error) throw new Error(error.message)
  }
}
