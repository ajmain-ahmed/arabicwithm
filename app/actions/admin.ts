// app/actions/admin.ts

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { serviceClient } from "@/app/lib/supabase"
import { parseJsonb } from "@/app/lib/jsonb"
import { stripDiacritics } from "@/app/lib/arabic"
import { isAdminUser, type RawVocabRow } from "./vocab"

/* ── Types ─────────────────────────────────────────────────────────── */

export type ShowRow = {
  id: string
  slug: string
  title: string
  title_ar: string | null
  description: string | null
  cover: string | null
  level: string
  category: string | null
}

export type EpisodeRow = {
  id: string
  show_id: string
  slug: string
  title: string
  level: string
  tags: string[]
  description: string | null
  youtube_id: string | null
  cover: string | null
  created_at: string | null
}

export type EpisodeWithTranscript = EpisodeRow & {
  transcript: Record<string, unknown> | null
}

export type ShowInput = Omit<ShowRow, "id">
export type EpisodeInput = Omit<EpisodeRow, "id" | "created_at"> & {
  transcript?: Record<string, unknown> | unknown[] | null
}

/* ── Helpers ───────────────────────────────────────────────────────── */

async function guardAdmin() {
  const ok = await isAdminUser()
  if (!ok) throw new Error("Forbidden")
}

/* ── Vocabulary lookups (used by episode editor) ───────────────────── */

export async function fetchVocabMatchesForWords(
  keys: { di?: string; plain?: string }[]
): Promise<Record<string, RawVocabRow>> {
  await guardAdmin()

  // Collect every non-empty lookup string. Tokens carry diacritized (`arabic`)
  // and plain (stripped) forms, so we query both `word_di` and `word_ar`
  // columns against the full set and let the caller match by either key.
  const allKeys = new Set<string>()
  for (const k of keys) {
    if (k.di?.trim()) allKeys.add(k.di.trim())
    if (k.plain?.trim()) allKeys.add(k.plain.trim())
  }

  const keyList = Array.from(allKeys)

  const selectCols =
    "word_id, word_ar, word_di, word_tr, root, level, theme, forms, definitions, examples, created_at"

  const [diRes, arRes] = await Promise.all([
    keyList.length > 0
      ? serviceClient.from("app_vocab").select(selectCols).in("word_di", keyList)
      : ({ data: [], error: null } as { data: unknown[]; error: null }),
    keyList.length > 0
      ? serviceClient.from("app_vocab").select(selectCols).in("word_ar", keyList)
      : ({ data: [], error: null } as { data: unknown[]; error: null }),
  ])

  if (diRes.error) {
    console.error("[fetchVocabMatchesForWords] word_di lookup error:", diRes.error.message)
    throw new Error(diRes.error.message)
  }
  if (arRes.error) {
    console.error("[fetchVocabMatchesForWords] word_ar lookup error:", arRes.error.message)
    throw new Error(arRes.error.message)
  }

  const rowMap = new Map<string, RawVocabRow>()

  const toStringOrNull = (val: unknown): string | null =>
    val == null || val === "" ? null : String(val)

  const addRow = (row: Record<string, unknown>) => {
    const mapped: RawVocabRow = {
      word_id: Number(row.word_id),
      word_ar: String(row.word_ar ?? ""),
      word_di: String(row.word_di ?? ""),
      word_tr: String(row.word_tr ?? ""),
      root: toStringOrNull(row.root),
      level: String(row.level ?? ""),
      theme: String(row.theme ?? ""),
      forms: row.forms,
      definitions: row.definitions,
      examples: row.examples,
      created_at: toStringOrNull(row.created_at),
    }
    if (mapped.word_di) rowMap.set(mapped.word_di, mapped)
    if (mapped.word_ar) rowMap.set(mapped.word_ar, mapped)
  }

  for (const row of (diRes.data ?? []) as Record<string, unknown>[]) addRow(row)
  for (const row of (arRes.data ?? []) as Record<string, unknown>[]) addRow(row)

  const result: Record<string, RawVocabRow> = {}
  for (const k of keys) {
    const diKey = k.di?.trim()
    const plainKey = k.plain?.trim()
    const match = diKey ? rowMap.get(diKey) : plainKey ? rowMap.get(plainKey) : undefined
    if (match) {
      if (diKey) result[diKey] = match
      if (plainKey) result[plainKey] = match
    }
  }

  return result
}

export type DefinitionKey = {
  lemma: string
  root: string | null
}

export async function fetchMissingDefinitions(
  keys: DefinitionKey[]
): Promise<DefinitionKey[]> {
  await guardAdmin()

  const valid = keys.filter((k) => k.lemma?.trim())
  if (valid.length === 0) return []

  const lemmas = Array.from(new Set(valid.map((k) => k.lemma.trim())))

  const { data, error } = await serviceClient
    .from("vocab_definitions")
    .select("lemma, root")
    .in("lemma", lemmas)

  if (error) {
    console.error("[fetchMissingDefinitions] error:", error.message)
    throw new Error(error.message)
  }

  const existing = new Set<string>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const lemma = String(row.lemma ?? "")
    const root = row.root ? String(row.root) : ""
    if (lemma) existing.add(`${lemma}|${root}`)
  }

  return valid.filter((k) => {
    const lemma = k.lemma.trim()
    const root = k.root?.trim() ?? ""
    return !existing.has(`${lemma}|${root}`)
  })
}

export type DefinitionCandidate = {
  definition_id: number
  lemma: string
  lemma_plain: string
  root: string | null
  gloss: string
  part_of_speech: string
  definition_en: string | null
  strategy: "exact" | "root" | "plain" | "surface"
}

export async function findDefinitionCandidates(
  lemma: string,
  root: string | null,
  surfaceArabic?: string
): Promise<DefinitionCandidate[]> {
  await guardAdmin()

  const normalizedLemma = lemma.trim()
  const normalizedRoot = root?.trim() || null
  const normalizedSurface = surfaceArabic?.trim()

  if (!normalizedLemma) return []

  const selectCols =
    "definition_id, lemma, lemma_plain, root, gloss, part_of_speech, definition_en"
  type DefResult = { data: unknown[] | null; error: { message: string } | null }
  const emptyResult: DefResult = { data: [], error: null }

  // 1. Exact match on lemma + root.
  const exactQuery = serviceClient
    .from("vocab_definitions")
    .select(selectCols)
    .eq("lemma", normalizedLemma)
    .eq("is_active", true)
  if (normalizedRoot === null) {
    exactQuery.is("root", null)
  } else {
    exactQuery.eq("root", normalizedRoot)
  }

  // 2. Surface-form match.
  let surfaceQuery: Promise<DefResult> = Promise.resolve(emptyResult)
  if (normalizedSurface && normalizedSurface !== normalizedLemma) {
    const q = serviceClient
      .from("vocab_definitions")
      .select(selectCols)
      .eq("lemma", normalizedSurface)
      .eq("is_active", true)
    if (normalizedRoot !== null) {
      q.eq("root", normalizedRoot)
    }
    surfaceQuery = q as unknown as Promise<DefResult>
  }

  // 3. Root-only match (filtered client-side by plain form similarity).
  const rootQuery: Promise<DefResult> = normalizedRoot
    ? (serviceClient
        .from("vocab_definitions")
        .select(selectCols)
        .eq("root", normalizedRoot)
        .eq("is_active", true) as unknown as Promise<DefResult>)
    : Promise.resolve(emptyResult)

  // 4. Plain-form match (same lemma after stripping diacritics).
  const plainLemma = stripDiacritics(normalizedLemma)
  const plainSurface = normalizedSurface ? stripDiacritics(normalizedSurface) : ""
  const plainQuery = serviceClient
    .from("vocab_definitions")
    .select(selectCols)
    .eq("is_active", true)
    .neq("lemma", normalizedLemma)

  const [
    { data: exactRows, error: exactError },
    { data: surfaceRows, error: surfaceError },
    { data: rootRows, error: rootError },
    { data: plainRows, error: plainError },
  ] = await Promise.all([exactQuery, surfaceQuery, rootQuery, plainQuery])

  if (exactError) {
    console.error("[findDefinitionCandidates] exact error:", exactError.message)
    throw new Error(exactError.message)
  }
  if (surfaceError) {
    console.error("[findDefinitionCandidates] surface error:", surfaceError.message)
    throw new Error(surfaceError.message)
  }
  if (rootError) {
    console.error("[findDefinitionCandidates] root error:", rootError.message)
    throw new Error(rootError.message)
  }
  if (plainError) {
    console.error("[findDefinitionCandidates] plain error:", plainError.message)
    throw new Error(plainError.message)
  }

  const targetPlainForms = new Set<string>([plainLemma])
  if (plainSurface && plainSurface !== plainLemma) targetPlainForms.add(plainSurface)

  const candidateMap = new Map<number, DefinitionCandidate & { priority: number }>()

  const addRows = (
    rows: unknown[],
    strategy: DefinitionCandidate["strategy"],
    priority: number
  ) => {
    for (const row of rows as Record<string, unknown>[]) {
      const id = Number(row.definition_id)
      if (candidateMap.has(id)) {
        const existing = candidateMap.get(id)!
        if (priority < existing.priority) {
          existing.strategy = strategy
          existing.priority = priority
        }
        continue
      }
      candidateMap.set(id, {
        definition_id: id,
        lemma: String(row.lemma ?? ""),
        lemma_plain: String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? ""))),
        root: row.root ? String(row.root) : null,
        gloss: String(row.gloss ?? ""),
        part_of_speech: String(row.part_of_speech ?? ""),
        definition_en: row.definition_en ? String(row.definition_en) : null,
        strategy,
        priority,
      })
    }
  }

  addRows(exactRows ?? [], "exact", 1)
  addRows(surfaceRows ?? [], "surface", 2)

  const rootMatches = ((rootRows ?? []) as Record<string, unknown>[]).filter((row) => {
    const rowPlain = String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? "")))
    return Array.from(targetPlainForms).some((f) => f === rowPlain)
  })
  addRows(rootMatches, "root", 3)

  const plainMatches = ((plainRows ?? []) as Record<string, unknown>[]).filter((row) => {
    const rowPlain = String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? "")))
    return Array.from(targetPlainForms).some((f) => f === rowPlain)
  })
  addRows(plainMatches, "plain", 4)

  return Array.from(candidateMap.values()).sort((a, b) => a.priority - b.priority)
}

/* ── Lemma candidates ──────────────────────────────────────────────── */

export type LemmaCandidate = {
  word_id: number
  lemma: string
  lemma_plain: string
  root: string | null
  entry_type: string
  CEFR: string | null
  strategy: "exact" | "root" | "plain" | "surface"
}

export async function findLemmaCandidates(
  lemma: string,
  root: string | null,
  surfaceArabic?: string
): Promise<LemmaCandidate[]> {
  await guardAdmin()

  const normalizedLemma = lemma.trim()
  const normalizedRoot = root?.trim() || null
  const normalizedSurface = surfaceArabic?.trim()

  if (!normalizedLemma) return []

  const selectCols = "word_id, lemma, lemma_plain, root, entry_type, CEFR"
  type LemmaResult = { data: unknown[] | null; error: { message: string } | null }
  const emptyResult: LemmaResult = { data: [], error: null }

  const exactQuery = serviceClient
    .from("vocab_lemmas")
    .select(selectCols)
    .eq("lemma", normalizedLemma)
    .eq("is_active", true)
  if (normalizedRoot === null) {
    exactQuery.is("root", null)
  } else {
    exactQuery.eq("root", normalizedRoot)
  }

  let surfaceQuery: Promise<LemmaResult> = Promise.resolve(emptyResult)
  if (normalizedSurface && normalizedSurface !== normalizedLemma) {
    const q = serviceClient
      .from("vocab_lemmas")
      .select(selectCols)
      .eq("lemma", normalizedSurface)
      .eq("is_active", true)
    if (normalizedRoot !== null) {
      q.eq("root", normalizedRoot)
    }
    surfaceQuery = q as unknown as Promise<LemmaResult>
  }

  const rootQuery: Promise<LemmaResult> = normalizedRoot
    ? (serviceClient
        .from("vocab_lemmas")
        .select(selectCols)
        .eq("root", normalizedRoot)
        .eq("is_active", true) as unknown as Promise<LemmaResult>)
    : Promise.resolve(emptyResult)

  const plainLemma = stripDiacritics(normalizedLemma)
  const plainSurface = normalizedSurface ? stripDiacritics(normalizedSurface) : ""
  const plainQuery = serviceClient
    .from("vocab_lemmas")
    .select(selectCols)
    .eq("is_active", true)
    .neq("lemma", normalizedLemma)

  const [
    { data: exactRows, error: exactError },
    { data: surfaceRows, error: surfaceError },
    { data: rootRows, error: rootError },
    { data: plainRows, error: plainError },
  ] = await Promise.all([exactQuery, surfaceQuery, rootQuery, plainQuery])

  if (exactError) {
    console.error("[findLemmaCandidates] exact error:", exactError.message)
    throw new Error(exactError.message)
  }
  if (surfaceError) {
    console.error("[findLemmaCandidates] surface error:", surfaceError.message)
    throw new Error(surfaceError.message)
  }
  if (rootError) {
    console.error("[findLemmaCandidates] root error:", rootError.message)
    throw new Error(rootError.message)
  }
  if (plainError) {
    console.error("[findLemmaCandidates] plain error:", plainError.message)
    throw new Error(plainError.message)
  }

  const targetPlainForms = new Set<string>([plainLemma])
  if (plainSurface && plainSurface !== plainLemma) targetPlainForms.add(plainSurface)

  const candidateMap = new Map<number, LemmaCandidate & { priority: number }>()

  const addRows = (rows: unknown[], strategy: LemmaCandidate["strategy"], priority: number) => {
    for (const row of rows as Record<string, unknown>[]) {
      const id = Number(row.word_id)
      if (candidateMap.has(id)) {
        const existing = candidateMap.get(id)!
        if (priority < existing.priority) {
          existing.strategy = strategy
          existing.priority = priority
        }
        continue
      }
      candidateMap.set(id, {
        word_id: id,
        lemma: String(row.lemma ?? ""),
        lemma_plain: String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? ""))),
        root: row.root ? String(row.root) : null,
        entry_type: String(row.entry_type ?? ""),
        CEFR: row.CEFR ? String(row.CEFR) : null,
        strategy,
        priority,
      })
    }
  }

  addRows(exactRows ?? [], "exact", 1)
  addRows(surfaceRows ?? [], "surface", 2)

  const rootMatches = ((rootRows ?? []) as Record<string, unknown>[]).filter((row) => {
    const rowPlain = String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? "")))
    return Array.from(targetPlainForms).some((f) => f === rowPlain)
  })
  addRows(rootMatches, "root", 3)

  const plainMatches = ((plainRows ?? []) as Record<string, unknown>[]).filter((row) => {
    const rowPlain = String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? "")))
    return Array.from(targetPlainForms).some((f) => f === rowPlain)
  })
  addRows(plainMatches, "plain", 4)

  return Array.from(candidateMap.values()).sort((a, b) => a.priority - b.priority)
}

/* ── Conjugation candidates ────────────────────────────────────────── */

export type ConjugationCandidate = {
  conjugation_id: number
  lemma: string
  lemma_plain: string
  root: string | null
  type: string
  conjugation_ar: string
  conjugation_diacritic: string
  transliteration: string | null
  english_translation: string | null
  strategy: "exact" | "root" | "plain" | "surface"
}

export async function findConjugationCandidates(
  lemma: string,
  root: string | null,
  surfaceArabic?: string
): Promise<ConjugationCandidate[]> {
  await guardAdmin()

  const normalizedLemma = lemma.trim()
  const normalizedRoot = root?.trim() || null
  const normalizedSurface = surfaceArabic?.trim()

  if (!normalizedLemma) return []

  const selectCols =
    "conjugation_id, lemma, lemma_plain, root, type, conjugation_ar, conjugation_diacritic, transliteration, english_translation"
  type ConjResult = { data: unknown[] | null; error: { message: string } | null }
  const emptyResult: ConjResult = { data: [], error: null }

  const exactQuery = serviceClient
    .from("verb_conjugations")
    .select(selectCols)
    .eq("lemma", normalizedLemma)
    .eq("is_active", true)
  if (normalizedRoot === null) {
    exactQuery.is("root", null)
  } else {
    exactQuery.eq("root", normalizedRoot)
  }

  let surfaceQuery: Promise<ConjResult> = Promise.resolve(emptyResult)
  if (normalizedSurface && normalizedSurface !== normalizedLemma) {
    const q = serviceClient
      .from("verb_conjugations")
      .select(selectCols)
      .eq("lemma", normalizedSurface)
      .eq("is_active", true)
    if (normalizedRoot !== null) {
      q.eq("root", normalizedRoot)
    }
    surfaceQuery = q as unknown as Promise<ConjResult>
  }

  const rootQuery: Promise<ConjResult> = normalizedRoot
    ? (serviceClient
        .from("verb_conjugations")
        .select(selectCols)
        .eq("root", normalizedRoot)
        .eq("is_active", true) as unknown as Promise<ConjResult>)
    : Promise.resolve(emptyResult)

  const plainLemma = stripDiacritics(normalizedLemma)
  const plainSurface = normalizedSurface ? stripDiacritics(normalizedSurface) : ""
  const plainQuery = serviceClient
    .from("verb_conjugations")
    .select(selectCols)
    .eq("is_active", true)
    .neq("lemma", normalizedLemma)

  const [
    { data: exactRows, error: exactError },
    { data: surfaceRows, error: surfaceError },
    { data: rootRows, error: rootError },
    { data: plainRows, error: plainError },
  ] = await Promise.all([exactQuery, surfaceQuery, rootQuery, plainQuery])

  if (exactError) {
    console.error("[findConjugationCandidates] exact error:", exactError.message)
    throw new Error(exactError.message)
  }
  if (surfaceError) {
    console.error("[findConjugationCandidates] surface error:", surfaceError.message)
    throw new Error(surfaceError.message)
  }
  if (rootError) {
    console.error("[findConjugationCandidates] root error:", rootError.message)
    throw new Error(rootError.message)
  }
  if (plainError) {
    console.error("[findConjugationCandidates] plain error:", plainError.message)
    throw new Error(plainError.message)
  }

  const targetPlainForms = new Set<string>([plainLemma])
  if (plainSurface && plainSurface !== plainLemma) targetPlainForms.add(plainSurface)

  const candidateMap = new Map<number, ConjugationCandidate & { priority: number }>()

  const addRows = (rows: unknown[], strategy: ConjugationCandidate["strategy"], priority: number) => {
    for (const row of rows as Record<string, unknown>[]) {
      const id = Number(row.conjugation_id)
      if (candidateMap.has(id)) {
        const existing = candidateMap.get(id)!
        if (priority < existing.priority) {
          existing.strategy = strategy
          existing.priority = priority
        }
        continue
      }
      candidateMap.set(id, {
        conjugation_id: id,
        lemma: String(row.lemma ?? ""),
        lemma_plain: String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? ""))),
        root: row.root ? String(row.root) : null,
        type: String(row.type ?? ""),
        conjugation_ar: String(row.conjugation_ar ?? ""),
        conjugation_diacritic: String(row.conjugation_diacritic ?? ""),
        transliteration: row.transliteration ? String(row.transliteration) : null,
        english_translation: row.english_translation ? String(row.english_translation) : null,
        strategy,
        priority,
      })
    }
  }

  addRows(exactRows ?? [], "exact", 1)
  addRows(surfaceRows ?? [], "surface", 2)

  const rootMatches = ((rootRows ?? []) as Record<string, unknown>[]).filter((row) => {
    const rowPlain = String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? "")))
    return Array.from(targetPlainForms).some((f) => f === rowPlain)
  })
  addRows(rootMatches, "root", 3)

  const plainMatches = ((plainRows ?? []) as Record<string, unknown>[]).filter((row) => {
    const rowPlain = String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? "")))
    return Array.from(targetPlainForms).some((f) => f === rowPlain)
  })
  addRows(plainMatches, "plain", 4)

  return Array.from(candidateMap.values()).sort((a, b) => a.priority - b.priority)
}

/* ── Shows ─────────────────────────────────────────────────────────── */

export async function fetchShowsForAdmin(): Promise<ShowRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("shows")
    .select("*")
    .order("title", { ascending: true })

  if (error) {
    console.error("[fetchShowsForAdmin] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    title_ar: row.title_ar ?? null,
    description: row.description ?? null,
    cover: row.cover ?? null,
    level: row.level,
    category: row.category ?? null,
  }))
}

export async function fetchShowForAdmin(id: string): Promise<ShowRow | null> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("shows")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    if (error) console.error("[fetchShowForAdmin] error:", error.message)
    return null
  }

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    title_ar: data.title_ar ?? null,
    description: data.description ?? null,
    cover: data.cover ?? null,
    level: data.level,
    category: data.category ?? null,
  }
}

export async function createShow(input: ShowInput): Promise<string> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("shows")
    .insert({
      slug: input.slug,
      title: input.title,
      title_ar: input.title_ar,
      description: input.description,
      cover: input.cover,
      level: input.level,
      category: input.category,
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error("[createShow] error:", error?.message)
    throw new Error(error?.message ?? "Failed to create show")
  }

  return data.id
}

export async function updateShow(
  id: string,
  input: Partial<ShowInput>
): Promise<void> {
  await guardAdmin()

  const payload: Record<string, unknown> = {}
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.title !== undefined) payload.title = input.title
  if (input.title_ar !== undefined) payload.title_ar = input.title_ar
  if (input.description !== undefined) payload.description = input.description
  if (input.cover !== undefined) payload.cover = input.cover
  if (input.level !== undefined) payload.level = input.level
  if (input.category !== undefined) payload.category = input.category

  const { error } = await serviceClient
    .from("shows")
    .update(payload)
    .eq("id", id)

  if (error) {
    console.error("[updateShow] error:", error.message)
    throw new Error(error.message)
  }
}

export async function deleteShow(id: string): Promise<void> {
  await guardAdmin()

  const { error } = await serviceClient.from("shows").delete().eq("id", id)

  if (error) {
    console.error("[deleteShow] error:", error.message)
    throw new Error(error.message)
  }
}

/* ── Episodes ──────────────────────────────────────────────────────── */

function normalizeArabicForMatch(str: string): string {
  return str
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u0621\u0623\u0625\u0626]/g, "\u0627")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export async function fetchFuzzyVocabMatches(query: string): Promise<RawVocabRow[]> {
  await guardAdmin()
  const q = query.trim()
  if (!q) return []

  const normalized = normalizeArabicForMatch(q)
  if (!normalized) return []

  const { data, error } = await serviceClient
    .from("app_vocab")
    .select(
      "word_id, word_ar, word_di, word_tr, root, level, theme, forms, definitions, examples, created_at"
    )
    .or(`word_ar.ilike.%${normalized}%,word_di.ilike.%${normalized}%`)
    .limit(20)

  if (error) {
    console.error("[fetchFuzzyVocabMatches] error:", error.message)
    throw new Error(error.message)
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    word_id: Number(row.word_id),
    word_ar: String(row.word_ar ?? ""),
    word_di: String(row.word_di ?? ""),
    word_tr: String(row.word_tr ?? ""),
    root: row.root ? String(row.root) : null,
    level: String(row.level ?? ""),
    theme: String(row.theme ?? ""),
    forms: row.forms,
    definitions: row.definitions,
    examples: row.examples,
    created_at: row.created_at ? String(row.created_at) : null,
  }))
}

export async function fetchEpisodesForShowAdmin(
  showId: string
): Promise<EpisodeRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("episodes")
    .select("*")
    .eq("show_id", showId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[fetchEpisodesForShowAdmin] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapEpisodeRow(row))
}

export async function fetchAllEpisodesForAdmin(): Promise<EpisodeRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("episodes")
    .select("*")
    .order("show_id", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[fetchAllEpisodesForAdmin] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapEpisodeRow(row))
}

export async function fetchEpisodeForAdmin(
  id: string
): Promise<EpisodeWithTranscript | null> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("episodes")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    if (error) console.error("[fetchEpisodeForAdmin] error:", error.message)
    return null
  }

  return {
    ...mapEpisodeRow(data),
    transcript: parseJsonb(data.transcript) as Record<string, unknown> | null,
  }
}

export async function createEpisode(input: EpisodeInput): Promise<string> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("episodes")
    .insert({
      show_id: input.show_id,
      slug: input.slug,
      title: input.title,
      level: input.level,
      tags: input.tags,
      description: input.description,
      youtube_id: input.youtube_id,
      cover: input.cover,
      transcript: input.transcript ?? [],
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error("[createEpisode] error:", error?.message)
    throw new Error(error?.message ?? "Failed to create episode")
  }

  return data.id
}

export async function updateEpisode(
  id: string,
  input: Partial<EpisodeInput>,
  revalidate?: string
): Promise<void> {
  await guardAdmin()

  const payload: Record<string, unknown> = {}
  if (input.show_id !== undefined) payload.show_id = input.show_id
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.title !== undefined) payload.title = input.title
  if (input.level !== undefined) payload.level = input.level
  if (input.tags !== undefined) payload.tags = input.tags
  if (input.description !== undefined) payload.description = input.description
  if (input.youtube_id !== undefined) payload.youtube_id = input.youtube_id
  if (input.cover !== undefined) payload.cover = input.cover
  if (input.transcript !== undefined) payload.transcript = input.transcript

  const { error } = await serviceClient
    .from("episodes")
    .update(payload)
    .eq("id", id)

  if (error) {
    console.error("[updateEpisode] error:", error.message)
    throw new Error(error.message)
  }

  if (revalidate) {
    revalidatePath(revalidate)
  }
}

export async function deleteEpisode(id: string): Promise<void> {
  await guardAdmin()

  const { error } = await serviceClient.from("episodes").delete().eq("id", id)

  if (error) {
    console.error("[deleteEpisode] error:", error.message)
    throw new Error(error.message)
  }
}

/* ── Lemmas ────────────────────────────────────────────────────────── */

export type LemmaRow = {
  word_id: number
  lemma: string
  lemma_plain: string
  transliteration: string | null
  root: string | null
  is_active: boolean
  entry_type: string
  source: string | null
  CEFR: string | null
  created_at: string | null
}

export async function searchLemmas(query: string): Promise<LemmaRow[]> {
  await guardAdmin()

  const q = query.trim()
  let dbQuery = serviceClient.from("vocab_lemmas").select("*")

  if (q) {
    const pattern = `%${q}%`
    dbQuery = dbQuery.or(
      `lemma.ilike.${pattern},lemma_plain.ilike.${pattern},root.ilike.${pattern},source.ilike.${pattern},CEFR.ilike.${pattern},entry_type.ilike.${pattern}`
    )
  }

  const { data, error } = await dbQuery
    .order("lemma", { ascending: true })
    .limit(200)

  if (error) {
    console.error("[searchLemmas] error:", error.message)
    throw new Error(error.message)
  }

  const toStringOrNull = (val: unknown): string | null =>
    val == null || val === "" ? null : String(val)

  return (data ?? []).map((row) => ({
    word_id: Number(row.word_id),
    lemma: String(row.lemma ?? ""),
    lemma_plain: String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? ""))),
    transliteration: toStringOrNull(row.transliteration),
    root: toStringOrNull(row.root),
    is_active: Boolean(row.is_active),
    entry_type: String(row.entry_type ?? ""),
    source: toStringOrNull(row.source),
    CEFR: toStringOrNull(row.CEFR),
    created_at: toStringOrNull(row.created_at),
  }))
}

function mapEpisodeRow(row: Record<string, unknown>): EpisodeRow {
  const toStringOrNull = (val: unknown): string | null =>
    val == null || val === "" ? null : String(val)

  return {
    id: String(row.id),
    show_id: String(row.show_id),
    slug: String(row.slug),
    title: String(row.title),
    level: String(row.level),
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t)) : [],
    description: toStringOrNull(row.description),
    youtube_id: toStringOrNull(row.youtube_id),
    cover: toStringOrNull(row.cover),
    created_at: toStringOrNull(row.created_at),
  }
}

/* ── Diagnostics ─────────────────────────────────────────────────────── */

export type DefinitionRow = {
  definition_id: number
  lemma: string
  lemma_plain: string
  root: string | null
  gloss: string
  part_of_speech: string
  definition_en: string | null
  definition_ar: string | null
  source: string | null
  is_active: boolean
}

export type ConjugationRow = {
  conjugation_id: number
  lemma: string
  lemma_plain: string
  root: string | null
  form_number: string | null
  type: string
  conjugation_ar: string
  conjugation_diacritic: string
  transliteration: string | null
  english_translation: string | null
  source: string | null
  is_active: boolean
}

export type MissingTable = "lemmas" | "definitions" | "conjugations"

export type TranscriptTokenBase = {
  lemma: string
  root: string | null
  pos: string
  cefr: string | null
  surfaceArabic: string | null
  episodes: { id: string; slug: string; source: string; title: string; timestamp?: string; path: string; tokenJson?: string }[]
}

export type TranscriptTokenRef = TranscriptTokenBase & {
  missingTable: MissingTable
}

export type DiagnosticsResult = {
  missingFromDb: TranscriptTokenRef[]
  unusedLemmas: LemmaRow[]
  unusedDefinitions: DefinitionRow[]
  unusedConjugations: ConjugationRow[]
}

export async function fetchAllEpisodesWithTranscripts(): Promise<EpisodeWithTranscript[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("episodes")
    .select("id, show_id, slug, title, level, tags, description, youtube_id, cover, created_at, transcript")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[fetchAllEpisodesWithTranscripts] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    ...mapEpisodeRow(row),
    transcript: parseJsonb(row.transcript) as Record<string, unknown> | null,
  }))
}

export async function fetchLemmaRows(): Promise<LemmaRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("vocab_lemmas")
    .select("*")
    .eq("is_active", true)
    .order("lemma", { ascending: true })

  if (error) {
    console.error("[fetchLemmaRows] error:", error.message)
    throw new Error(error.message)
  }

  const toStringOrNull = (val: unknown): string | null =>
    val == null || val === "" ? null : String(val)

  return (data ?? []).map((row) => ({
    word_id: Number(row.word_id),
    lemma: String(row.lemma ?? ""),
    lemma_plain: String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? ""))),
    transliteration: toStringOrNull(row.transliteration),
    root: toStringOrNull(row.root),
    is_active: Boolean(row.is_active),
    entry_type: String(row.entry_type ?? ""),
    source: toStringOrNull(row.source),
    CEFR: toStringOrNull(row.CEFR),
    created_at: toStringOrNull(row.created_at),
  }))
}

export async function fetchDefinitionRows(): Promise<DefinitionRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("vocab_definitions")
    .select("*")
    .eq("is_active", true)
    .order("lemma", { ascending: true })

  if (error) {
    console.error("[fetchDefinitionRows] error:", error.message)
    throw new Error(error.message)
  }

  const toStringOrNull = (val: unknown): string | null =>
    val == null || val === "" ? null : String(val)

  return (data ?? []).map((row) => ({
    definition_id: Number(row.definition_id),
    lemma: String(row.lemma ?? ""),
    lemma_plain: String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? ""))),
    root: toStringOrNull(row.root),
    gloss: String(row.gloss ?? ""),
    part_of_speech: String(row.part_of_speech ?? ""),
    definition_en: toStringOrNull(row.definition_en),
    definition_ar: toStringOrNull(row.definition_ar),
    source: toStringOrNull(row.source),
    is_active: Boolean(row.is_active),
  }))
}

export async function fetchConjugationRows(): Promise<ConjugationRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("verb_conjugations")
    .select("*")
    .eq("is_active", true)
    .order("lemma", { ascending: true })

  if (error) {
    console.error("[fetchConjugationRows] error:", error.message)
    throw new Error(error.message)
  }

  const toStringOrNull = (val: unknown): string | null =>
    val == null || val === "" ? null : String(val)

  return (data ?? []).map((row) => ({
    conjugation_id: Number(row.conjugation_id),
    lemma: String(row.lemma ?? ""),
    lemma_plain: String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? ""))),
    root: toStringOrNull(row.root),
    form_number: toStringOrNull(row.form_number),
    type: String(row.type ?? ""),
    conjugation_ar: String(row.conjugation_ar ?? ""),
    conjugation_diacritic: String(row.conjugation_diacritic ?? ""),
    transliteration: toStringOrNull(row.transliteration),
    english_translation: toStringOrNull(row.english_translation),
    source: toStringOrNull(row.source),
    is_active: Boolean(row.is_active),
  }))
}

function extractTranscriptTokens(episodes: EpisodeWithTranscript[]): TranscriptTokenBase[] {
  const tokenMap = new Map<string, TranscriptTokenBase>()

  for (const episode of episodes) {
    const transcript = episode.transcript
    if (!transcript) continue

    const blocks = (Array.isArray(transcript)
      ? transcript
      : Array.isArray((transcript as Record<string, unknown>).scriptBlocks)
        ? (transcript as Record<string, unknown>).scriptBlocks
        : []) as Record<string, unknown>[]

    for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
      const block = blocks[blockIdx] as Record<string, unknown>
      const timestamp = typeof block.timestamp === "string" ? block.timestamp : undefined
      const words = Array.isArray(block.tokens)
        ? block.tokens
        : Array.isArray(block.words)
          ? block.words
          : []

      for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
        const word = words[wordIdx] as Record<string, unknown>
        const lemmaRaw = word.lemma ?? word.arabic
        const lemma = typeof lemmaRaw === "string" ? lemmaRaw.trim() : ""
        const root = typeof word.root === "string" && word.root.trim() ? word.root.trim() : null
        const pos = typeof word.pos === "string" && word.pos.trim() ? word.pos.trim().toLowerCase() : ""
        const cefrRaw = (word.cefr as string | undefined) || (word.CEFR as string | undefined)
        const cefr = typeof cefrRaw === "string" && cefrRaw.trim() ? cefrRaw.trim().toLowerCase() : null
        const surfaceArabic = typeof word.arabic === "string" && word.arabic.trim() ? word.arabic.trim() : null

        if (!lemma) continue

        const key = `${lemma}|${root ?? ""}|${pos}`
        const existing = tokenMap.get(key)
        const path = Array.isArray(transcript)
          ? `transcript[${blockIdx}].tokens[${wordIdx}]`
          : `transcript.scriptBlocks[${blockIdx}].words[${wordIdx}]`
        const tokenJson = JSON.stringify(word, null, 2)

        if (existing) {
          if (
            !existing.episodes.some(
              (e) => e.id === episode.id && e.path === path
            )
          ) {
            existing.episodes.push({
              id: episode.id,
              slug: episode.slug,
              source: episode.slug,
              title: episode.title,
              timestamp,
              path,
              tokenJson,
            })
          }
        } else {
          tokenMap.set(key, {
            lemma,
            root,
            pos,
            cefr,
            surfaceArabic,
            episodes: [
              {
                id: episode.id,
                slug: episode.slug,
                source: episode.slug,
                title: episode.title,
                timestamp,
                path,
                tokenJson,
              },
            ],
          })
        }
      }
    }
  }

  return Array.from(tokenMap.values()).sort((a, b) => a.lemma.localeCompare(b.lemma))
}

export async function computeDiagnostics(): Promise<DiagnosticsResult> {
  await guardAdmin()

  const [episodes, lemmas, definitions, conjugations] = await Promise.all([
    fetchAllEpisodesWithTranscripts(),
    fetchLemmaRows(),
    fetchDefinitionRows(),
    fetchConjugationRows(),
  ])

  const tokens = extractTranscriptTokens(episodes)

  // Build exact lookup sets so diacritic differences are surfaced as errors.
  const lemmaKeySet = new Set<string>()
  for (const row of lemmas) {
    const root = row.root ?? ""
    lemmaKeySet.add(`${row.lemma}|${root}`)
  }

  const definitionKeySet = new Set<string>()
  for (const row of definitions) {
    const root = row.root ?? ""
    definitionKeySet.add(`${row.lemma}|${root}`)
  }

  const conjugationKeySet = new Set<string>()
  for (const row of conjugations) {
    const root = row.root ?? ""
    conjugationKeySet.add(`${row.lemma}|${root}`)
  }

  const missingFromDb: TranscriptTokenRef[] = []
  for (const token of tokens) {
    const root = token.root ?? ""
    const hasLemma = lemmaKeySet.has(`${token.lemma}|${root}`)
    const hasDefinition = definitionKeySet.has(`${token.lemma}|${root}`)
    const needsConjugation = token.pos === "verb"
    const hasConjugation = needsConjugation ? conjugationKeySet.has(`${token.lemma}|${root}`) : true

    if (!hasLemma) {
      missingFromDb.push({ ...token, missingTable: "lemmas" })
    }
    if (!hasDefinition) {
      missingFromDb.push({ ...token, missingTable: "definitions" })
    }
    if (needsConjugation && !hasConjugation) {
      missingFromDb.push({ ...token, missingTable: "conjugations" })
    }
  }

  // Database rows unused in transcripts.
  const tokenKeySet = new Set<string>()
  for (const token of tokens) {
    const root = token.root ?? ""
    tokenKeySet.add(`${token.lemma}|${root}`)
    tokenKeySet.add(`${stripDiacritics(token.lemma)}|${root}`)
  }

  const unusedLemmas = lemmas.filter((row) => {
    const root = row.root ?? ""
    return !tokenKeySet.has(`${row.lemma}|${root}`)
  })

  const unusedDefinitions = definitions.filter((row) => {
    const root = row.root ?? ""
    return !tokenKeySet.has(`${row.lemma}|${root}`)
  })

  const unusedConjugations = conjugations.filter((row) => {
    const root = row.root ?? ""
    return !tokenKeySet.has(`${row.lemma}|${root}`)
  })

  return {
    missingFromDb,
    unusedLemmas,
    unusedDefinitions,
    unusedConjugations,
  }
}

/* ── Inline updates ──────────────────────────────────────────────────── */

const UpdateDefinitionSchema = z.object({
  definitionId: z.number().int().positive(),
  gloss: z.string().max(500).optional(),
  partOfSpeech: z.string().max(100).optional(),
  definitionEn: z.string().max(2000).optional(),
  definitionAr: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
})

export async function updateDefinitionRow(input: {
  definitionId: number
  gloss?: string
  partOfSpeech?: string
  definitionEn?: string
  definitionAr?: string
  isActive?: boolean
}): Promise<void> {
  await guardAdmin()

  const parsed = UpdateDefinitionSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`)
  }

  const payload: Record<string, unknown> = {}
  if (input.gloss !== undefined) payload.gloss = input.gloss
  if (input.partOfSpeech !== undefined) payload.part_of_speech = input.partOfSpeech
  if (input.definitionEn !== undefined) payload.definition_en = input.definitionEn || null
  if (input.definitionAr !== undefined) payload.definition_ar = input.definitionAr || null
  if (input.isActive !== undefined) payload.is_active = input.isActive

  const { error } = await serviceClient
    .from("vocab_definitions")
    .update(payload)
    .eq("definition_id", input.definitionId)

  if (error) {
    console.error("[updateDefinitionRow] error:", error.message)
    throw new Error(error.message)
  }
}

const UpdateConjugationSchema = z.object({
  conjugationId: z.number().int().positive(),
  conjugationAr: z.string().max(200).optional(),
  conjugationDiacritic: z.string().max(200).optional(),
  transliteration: z.string().max(200).optional(),
  englishTranslation: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
})

export async function updateConjugationRow(input: {
  conjugationId: number
  conjugationAr?: string
  conjugationDiacritic?: string
  transliteration?: string
  englishTranslation?: string
  isActive?: boolean
}): Promise<void> {
  await guardAdmin()

  const parsed = UpdateConjugationSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`)
  }

  const payload: Record<string, unknown> = {}
  if (input.conjugationAr !== undefined) payload.conjugation_ar = input.conjugationAr
  if (input.conjugationDiacritic !== undefined) payload.conjugation_diacritic = input.conjugationDiacritic
  if (input.transliteration !== undefined) payload.transliteration = input.transliteration || null
  if (input.englishTranslation !== undefined) payload.english_translation = input.englishTranslation || null
  if (input.isActive !== undefined) payload.is_active = input.isActive

  const { error } = await serviceClient
    .from("verb_conjugations")
    .update(payload)
    .eq("conjugation_id", input.conjugationId)

  if (error) {
    console.error("[updateConjugationRow] error:", error.message)
    throw new Error(error.message)
  }
}

const UpdateLemmaSchema = z.object({
  wordId: z.number().int().positive(),
  lemma: z.string().min(1).max(200).optional(),
  transliteration: z.string().max(200).optional(),
  cefr: z.string().max(10).optional(),
  entryType: z.enum(["word", "phrase"]).optional(),
  isActive: z.boolean().optional(),
})

export async function updateLemmaRow(input: {
  wordId: number
  lemma?: string
  transliteration?: string
  cefr?: string
  entryType?: "word" | "phrase"
  isActive?: boolean
}): Promise<void> {
  await guardAdmin()

  const parsed = UpdateLemmaSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`)
  }

  const payload: Record<string, unknown> = {}
  if (input.lemma !== undefined) {
    payload.lemma = input.lemma
    payload.lemma_plain = stripDiacritics(input.lemma)
  }
  if (input.transliteration !== undefined) payload.transliteration = input.transliteration || null
  if (input.cefr !== undefined) payload.CEFR = input.cefr || null
  if (input.entryType !== undefined) payload.entry_type = input.entryType
  if (input.isActive !== undefined) payload.is_active = input.isActive

  const { error } = await serviceClient
    .from("vocab_lemmas")
    .update(payload)
    .eq("word_id", input.wordId)

  if (error) {
    console.error("[updateLemmaRow] error:", error.message)
    throw new Error(error.message)
  }
}

export async function updateConjugationLemmaForRoot(
  oldLemma: string,
  root: string | null,
  newLemma: string
): Promise<{ updated: number }> {
  await guardAdmin()

  const normalizedOld = oldLemma.trim()
  const normalizedNew = newLemma.trim()
  const normalizedRoot = root?.trim() || null

  if (!normalizedOld || !normalizedNew) {
    throw new Error("Old and new lemma are required.")
  }

  const { error } = await serviceClient
    .from("verb_conjugations")
    .update({ lemma: normalizedNew })
    .eq("lemma", normalizedOld)
    .eq("root", normalizedRoot ?? "")

  if (error) {
    console.error("[updateConjugationLemmaForRoot] error:", error.message)
    throw new Error(error.message)
  }

  return { updated: 0 }
}

function amendTranscriptJson(
  transcript: unknown,
  oldLemma: string,
  root: string | null,
  newLemma: string,
  newRoot?: string | null
): unknown {
  const matches = (itemLemma: string, itemRoot: string | null) =>
    itemLemma === oldLemma && itemRoot === (root ?? "")

  const buildUpdate = (item: Record<string, unknown>) => {
    const next: Record<string, unknown> = { ...item, lemma: newLemma }
    if (newRoot !== undefined) {
      next.root = newRoot
    }
    return next
  }

  if (Array.isArray(transcript)) {
    return transcript.map((block) => {
      if (!block || typeof block !== "object") return block
      const b = block as Record<string, unknown>
      const tokens = Array.isArray(b.tokens) ? b.tokens : []
      return {
        ...b,
        tokens: tokens.map((t) => {
          if (!t || typeof t !== "object") return t
          const token = t as Record<string, unknown>
          const tokenLemma =
            typeof token.lemma === "string" && token.lemma.trim()
              ? token.lemma.trim()
              : typeof token.arabic === "string" && token.arabic.trim()
                ? token.arabic.trim()
                : ""
          const tokenRoot = typeof token.root === "string" && token.root.trim() ? token.root.trim() : null
          if (matches(tokenLemma, tokenRoot)) {
            return buildUpdate(token)
          }
          return token
        }),
      }
    })
  }

  if (transcript && typeof transcript === "object") {
    const obj = transcript as Record<string, unknown>
    const scriptBlocks = Array.isArray(obj.scriptBlocks) ? obj.scriptBlocks : []
    return {
      ...obj,
      scriptBlocks: scriptBlocks.map((block) => {
        if (!block || typeof block !== "object") return block
        const b = block as Record<string, unknown>
        const words = Array.isArray(b.words) ? b.words : []
        return {
          ...b,
          words: words.map((w) => {
            if (!w || typeof w !== "object") return w
            const word = w as Record<string, unknown>
            const wordLemma =
              typeof word.lemma === "string" && word.lemma.trim()
                ? word.lemma.trim()
                : typeof word.arabic === "string" && word.arabic.trim()
                  ? word.arabic.trim()
                  : ""
            const wordRoot = typeof word.root === "string" && word.root.trim() ? word.root.trim() : null
            if (matches(wordLemma, wordRoot)) {
              return buildUpdate(word)
            }
            return w
          }),
        }
      }),
    }
  }

  return transcript
}

export async function amendLemmaInAllEpisodes(
  oldLemma: string,
  root: string | null,
  newLemma: string,
  newRoot?: string | null
): Promise<{ updated: number }> {
  await guardAdmin()

  const normalizedOld = oldLemma.trim()
  const normalizedNew = newLemma.trim()
  const normalizedRoot = root?.trim() || null

  if (!normalizedOld || !normalizedNew) {
    throw new Error("Old and new lemma are required.")
  }

  const episodes = await fetchAllEpisodesWithTranscripts()
  let updated = 0

  for (const episode of episodes) {
    if (!episode.transcript) continue

    const amended = amendTranscriptJson(episode.transcript, normalizedOld, normalizedRoot, normalizedNew, newRoot)
    if (JSON.stringify(amended) !== JSON.stringify(episode.transcript)) {
      const { error } = await serviceClient
        .from("episodes")
        .update({ transcript: amended })
        .eq("id", episode.id)

      if (error) {
        console.error(`[amendLemmaInAllEpisodes] update error for ${episode.id}:`, error.message)
        throw new Error(error.message)
      }
      updated++
    }
  }

  return { updated }
}
