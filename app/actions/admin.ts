// app/actions/admin.ts

"use server"

import { serviceClient } from "@/app/lib/supabase"
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
  order: number
  category: string | null
  genre: string | null
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
  youtube_short: boolean
  cover: string | null
  episode_number: number
  unmatched_count: number
}

export type EpisodeWithTranscript = EpisodeRow & {
  transcript: Record<string, unknown> | null
}

export type ShowInput = Omit<ShowRow, "id">
export type EpisodeInput = Omit<EpisodeRow, "id" | "unmatched_count"> & {
  transcript?: Record<string, unknown> | unknown[] | null
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function parseJsonb(val: unknown): unknown {
  if (val == null) return null
  if (typeof val === "string") {
    try {
      return JSON.parse(val)
    } catch {
      return null
    }
  }
  return val
}

async function guardAdmin() {
  const ok = await isAdminUser()
  if (!ok) throw new Error("Forbidden")
}

/* ── Vocabulary lookups (used by episode editor) ───────────────────── */

export async function fetchVocabMatchesForWords(
  keys: { di?: string; plain?: string }[]
): Promise<Record<string, RawVocabRow>> {
  await guardAdmin()

  // Collect every non-empty lookup string. A transcript "db" value may be either
  // diacritized (matches word_di) or plain (matches word_ar), so we query both
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
    .select("lemma_diacritic, arabic_root")
    .in("lemma_diacritic", lemmas)

  if (error) {
    console.error("[fetchMissingDefinitions] error:", error.message)
    throw new Error(error.message)
  }

  const existing = new Set<string>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const lemma = String(row.lemma_diacritic ?? "")
    const root = row.arabic_root ? String(row.arabic_root) : ""
    if (lemma) existing.add(`${lemma}|${root}`)
  }

  return valid.filter((k) => {
    const lemma = k.lemma.trim()
    const root = k.root?.trim() ?? ""
    return !existing.has(`${lemma}|${root}`)
  })
}

/* ── Shows ─────────────────────────────────────────────────────────── */

export async function fetchShowsForAdmin(): Promise<ShowRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("shows")
    .select("*")
    .order("order", { ascending: true })

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
    order: row.order ?? 99,
    category: row.category ?? null,
    genre: row.genre ?? null,
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
    order: data.order ?? 99,
    category: data.category ?? null,
    genre: data.genre ?? null,
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
      order: input.order,
      category: input.category,
      genre: input.genre,
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
  if (input.order !== undefined) payload.order = input.order
  if (input.category !== undefined) payload.category = input.category
  if (input.genre !== undefined) payload.genre = input.genre

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

async function computeUnmatchedCounts(
  rows: Record<string, unknown>[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  const episodeDbKeys = new Map<string, Set<string>>()
  const allDbKeys = new Set<string>()

  for (const row of rows) {
    const id = String(row.id)
    const transcript = parseJsonb(row.transcript)
    const dbKeys = new Set<string>()

    if (Array.isArray(transcript)) {
      // New block-based transcript format.
      for (const block of transcript) {
        const tokens = (block as Record<string, unknown>).tokens
        if (!Array.isArray(tokens)) continue
        for (const t of tokens) {
          const token = t as Record<string, unknown>
          const db = (token.db || token.arabic) as string | undefined
          if (typeof db === "string" && db.trim()) {
            dbKeys.add(db.trim())
            allDbKeys.add(db.trim())
          }
        }
      }
    } else if (transcript && typeof transcript === "object" && Array.isArray((transcript as Record<string, unknown>).scriptBlocks)) {
      // Legacy transcript object.
      for (const block of (transcript as Record<string, unknown>).scriptBlocks as Record<string, unknown>[]) {
        const words = block.words
        if (!Array.isArray(words)) continue
        for (const w of words) {
          const db = (w as Record<string, unknown>).db
          if (typeof db === "string" && db.trim()) {
            dbKeys.add(db.trim())
            allDbKeys.add(db.trim())
          }
        }
      }
    }

    episodeDbKeys.set(id, dbKeys)
  }

  // Fetch all word_di values once and compare locally. This avoids subtle
  // issues with .in() on diacritized Arabic strings.
  const allDi = new Set<string>()
  if (allDbKeys.size > 0) {
    const { data, error } = await serviceClient
      .from("app_vocab")
      .select("word_di")

    if (error) {
      console.error("[computeUnmatchedCounts] error:", error.message)
    } else {
      for (const row of data ?? []) {
        const di = (row as { word_di?: string }).word_di
        if (di) allDi.add(di)
      }
    }
  }

  for (const [id, keys] of episodeDbKeys) {
    let unmatched = 0
    for (const key of keys) {
      if (!allDi.has(key)) unmatched++
    }
    counts.set(id, unmatched)
  }

  return counts
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
    .order("episode_number", { ascending: true })

  if (error) {
    console.error("[fetchEpisodesForShowAdmin] error:", error.message)
    throw new Error(error.message)
  }

  const counts = await computeUnmatchedCounts(data ?? [])
  return (data ?? []).map((row) => ({
    ...mapEpisodeRow(row),
    unmatched_count: counts.get(String(row.id)) ?? 0,
  }))
}

export async function fetchAllEpisodesForAdmin(): Promise<EpisodeRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("episodes")
    .select("*")
    .order("show_id", { ascending: true })
    .order("episode_number", { ascending: true })

  if (error) {
    console.error("[fetchAllEpisodesForAdmin] error:", error.message)
    throw new Error(error.message)
  }

  const counts = await computeUnmatchedCounts(data ?? [])
  return (data ?? []).map((row) => ({
    ...mapEpisodeRow(row),
    unmatched_count: counts.get(String(row.id)) ?? 0,
  }))
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
      youtube_short: input.youtube_short,
      cover: input.cover,
      episode_number: input.episode_number,
      transcript: input.transcript ?? { scriptBlocks: [], vocabList: [], grammarPoints: [] },
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
  input: Partial<EpisodeInput>
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
  if (input.youtube_short !== undefined) payload.youtube_short = input.youtube_short
  if (input.cover !== undefined) payload.cover = input.cover
  if (input.episode_number !== undefined) payload.episode_number = input.episode_number
  if (input.transcript !== undefined) payload.transcript = input.transcript

  const { error } = await serviceClient
    .from("episodes")
    .update(payload)
    .eq("id", id)

  if (error) {
    console.error("[updateEpisode] error:", error.message)
    throw new Error(error.message)
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
    youtube_short: Boolean(row.youtube_short),
    cover: toStringOrNull(row.cover),
    episode_number: Number(row.episode_number) || 0,
    unmatched_count: 0,
  }
}


