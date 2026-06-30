// app/actions/vocab.ts

"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { z } from 'zod'
import { checkRateLimit } from '@/app/lib/rateLimit'
import { serviceClient } from "@/app/lib/supabase"

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

function snakeToCamelDefinitions(defs: unknown): unknown {
  const arr = Array.isArray(defs) ? defs : []
  return arr.map((d: any) => ({
    english: d?.english ?? "",
    directEnglish: d?.direct_english ?? d?.directEnglish ?? "",
    simpleAr: d?.simple_ar ?? d?.simpleAr ?? "",
    simpleArTr: d?.simple_ar_tr ?? d?.simpleArTr ?? "",
  }))
}

function camelToSnakeDefinitions(defs: unknown): unknown {
  const arr = Array.isArray(defs) ? defs : []
  return arr.map((d: any) => ({
    english: d?.english ?? "",
    direct_english: d?.directEnglish ?? d?.direct_english ?? "",
    simple_ar: d?.simpleAr ?? d?.simple_ar ?? "",
    simple_ar_tr: d?.simpleArTr ?? d?.simple_ar_tr ?? "",
  }))
}

function snakeToCamelExamples(exs: unknown): unknown {
  const arr = Array.isArray(exs) ? exs : []
  return arr.map((e: any) => ({
    ar: e?.ar ?? "",
    arDi: e?.ar_di ?? e?.arDi ?? "",
    en: e?.en ?? "",
    tr: e?.tr ?? "",
  }))
}

function camelToSnakeExamples(exs: unknown): unknown {
  const arr = Array.isArray(exs) ? exs : []
  return arr.map((e: any) => ({
    ar: e?.ar ?? "",
    ar_di: e?.arDi ?? e?.ar_di ?? "",
    en: e?.en ?? "",
    tr: e?.tr ?? "",
  }))
}

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

/* ── theme list ── */
export type ThemeProgress = {
  theme_id: string
  display_name: string
  total_words: number
}

export async function fetchThemesWithProgress(
  levelCode: string
): Promise<ThemeProgress[]> {
  if (!levelCode || typeof levelCode !== 'string' || levelCode.length > 10) {
    throw new Error('Invalid levelCode')
  }

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

/* ── fetch vocab + defs + examples for a theme (parallelized) ── */
export async function fetchThemeVocabWithProgress(
  themeId: string,
  levelCode: string
): Promise<{
  vocab: VocabRow[]
  examples: ExampleRow[]
}> {
  // 1. Get vocab for this theme and level
  const { data: vocabData, error: vocabErr } = await serviceClient
    .from("vocabulary")
    .select("word_id, word_ar, word_di, word_tr, theme, level, forms, definitions, examples")
    .eq("theme", themeId)
    .eq("level", levelCode)
    .order("word_id")

  if (vocabErr) throw new Error(vocabErr.message)
  if (!vocabData || vocabData.length === 0) {
    return { vocab: [], examples: [] }
  }

  // 2. Build VocabRow and ExampleRow
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

  return { vocab, examples }
}

/* ── admin helpers ── */

const ADMIN_UIDS = new Set(
  [process.env.ADMIN, process.env.ADMIN2].filter((v): v is string => Boolean(v))
)

export async function isAdminUser(): Promise<boolean> {
  const userId = await getAuthenticatedUserId()
  if (!userId || ADMIN_UIDS.size === 0) return false
  return ADMIN_UIDS.has(userId)
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

const WordIdSchema = z.number().int().positive()

export async function updateVocabWord(
  wordId: number,
  data: VocabUpdateInput
): Promise<void> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Not authenticated')
  if (!checkRateLimit(`updateVocab:${userId}`, 10, 60_000)) {
    throw new Error('Rate limit exceeded. Please slow down.')
  }

  const parsedId = WordIdSchema.safeParse(wordId)
  if (!parsedId.success) throw new Error('Invalid wordId')
  if (!Number.isFinite(wordId) || wordId <= 0) {
    throw new Error('Invalid wordId')
  }
  const isAdmin = await isAdminUser()
  if (!isAdmin) throw new Error('Forbidden')
  if (!userId) throw new Error('Not authenticated')

  const payload: Record<string, unknown> = {}
  if (data.word_ar !== undefined) payload.word_ar = data.word_ar
  if (data.word_di !== undefined) payload.word_di = data.word_di
  if (data.word_tr !== undefined) payload.word_tr = data.word_tr
  if (data.root !== undefined) payload.root = data.root
  if (data.level !== undefined) payload.level = data.level
  if (data.theme !== undefined) payload.theme = data.theme
  if (data.forms !== undefined) payload.forms = data.forms
  if (data.definitions !== undefined) payload.definitions = camelToSnakeDefinitions(data.definitions)
  if (data.examples !== undefined) payload.examples = camelToSnakeExamples(data.examples)

  const { error } = await serviceClient
    .from('app_vocab')
    .update(payload)
    .eq('word_id', wordId)

  if (error) throw new Error(error.message)
}

export async function deleteVocabWord(wordId: number): Promise<void> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Not authenticated')
  if (!checkRateLimit(`deleteVocab:${userId}`, 10, 60_000)) {
    throw new Error('Rate limit exceeded. Please slow down.')
  }

  const parsedId = WordIdSchema.safeParse(wordId)
  if (!parsedId.success) throw new Error('Invalid wordId')
  const isAdmin = await isAdminUser()
  if (!isAdmin) throw new Error('Forbidden')

  const { error } = await serviceClient
    .from('app_vocab')
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
    definitions: camelToSnakeDefinitions(data.definitions ?? []),
    examples: camelToSnakeExamples(data.examples ?? []),
  }
  if (data.word_id !== undefined) payload.word_id = data.word_id

  const { data: result, error } = await serviceClient
    .from('app_vocab')
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
    .from('app_vocab')
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
    definitions: snakeToCamelDefinitions(data.definitions),
    examples: snakeToCamelExamples(data.examples),
    created_at: data.created_at ?? null,
  }
}
