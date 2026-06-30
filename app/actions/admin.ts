// app/actions/admin.ts

"use server"

import { serviceClient } from "@/app/lib/supabase"
import { isAdminUser, type RawVocabRow } from "./vocab"

/* ── Types ─────────────────────────────────────────────────────────── */

export type AdminVocabRow = {
  word_id: number
  word_ar: string
  word_di: string
  word_tr: string
  root: string | null
  level: string
  theme: string
  primary_gloss: string
}

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
}

export type EpisodeWithTranscript = EpisodeRow & {
  transcript: Record<string, unknown> | null
}

export type ShowInput = Omit<ShowRow, "id">
export type EpisodeInput = Omit<EpisodeRow, "id"> & {
  transcript?: Record<string, unknown> | null
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

function primaryGloss(definitions: unknown): string {
  const parsed = parseJsonb(definitions)
  if (!Array.isArray(parsed) || parsed.length === 0) return ""
  const first = parsed[0]
  return (
    first?.directEnglish ??
    first?.english ??
    ""
  )
}

async function guardAdmin() {
  const ok = await isAdminUser()
  if (!ok) throw new Error("Forbidden")
}

/* ── Vocabulary ────────────────────────────────────────────────────── */

export type VocabListResult = {
  rows: AdminVocabRow[]
  count: number
}

export async function fetchVocabForAdmin({
  query,
  page,
  pageSize,
  sortKey = "word_id",
  sortDir = "asc",
}: {
  query?: string
  page: number
  pageSize: number
  sortKey?: string
  sortDir?: "asc" | "desc"
}): Promise<VocabListResult> {
  await guardAdmin()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const validSortCols = new Set([
    "word_id",
    "word_ar",
    "word_di",
    "word_tr",
    "level",
    "theme",
  ])
  const orderCol = validSortCols.has(sortKey) ? sortKey : "word_id"

  let builder = serviceClient
    .from("app_vocab")
    .select("word_id, word_ar, word_di, word_tr, root, level, theme, definitions", {
      count: "exact",
    })
    .order(orderCol, { ascending: sortDir === "asc" })

  if (query && query.trim()) {
    const q = `%${query.trim()}%`
    builder = builder.or(
      `word_ar.ilike.${q},word_di.ilike.${q},word_tr.ilike.${q},level.ilike.${q},theme.ilike.${q}`
    )
  }

  const { data, error, count } = await builder.range(from, to)

  if (error) {
    console.error("[fetchVocabForAdmin] error:", error.message)
    throw new Error(error.message)
  }

  const rows = (data ?? []).map((row) => ({
    word_id: row.word_id,
    word_ar: row.word_ar ?? "",
    word_di: row.word_di ?? "",
    word_tr: row.word_tr ?? "",
    root: row.root ?? null,
    level: row.level ?? "",
    theme: row.theme ?? "",
    primary_gloss: primaryGloss(row.definitions),
  }))

  return { rows, count: count ?? 0 }
}

export async function fetchAllVocabForAdmin(): Promise<AdminVocabRow[]> {
  await guardAdmin()

  const all: AdminVocabRow[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await serviceClient
      .from("app_vocab")
      .select("word_id, word_ar, word_di, word_tr, root, level, theme, definitions")
      .order("word_id", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error("[fetchAllVocabForAdmin] error:", error.message)
      throw new Error(error.message)
    }

    const rows = (data ?? []).map((row) => ({
      word_id: row.word_id,
      word_ar: row.word_ar ?? "",
      word_di: row.word_di ?? "",
      word_tr: row.word_tr ?? "",
      root: row.root ?? null,
      level: row.level ?? "",
      theme: row.theme ?? "",
      primary_gloss: primaryGloss(row.definitions),
    }))

    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }

  return all
}

export async function findVocabIdByDiacritized(
  wordDi: string
): Promise<number | null> {
  await guardAdmin()
  if (!wordDi) return null

  const { data, error } = await serviceClient
    .from("app_vocab")
    .select("word_id")
    .eq("word_di", wordDi)
    .limit(1)
    .single()

  if (error || !data) return null
  return data.word_id
}

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

  return (data ?? []).map(mapEpisodeRow)
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

  return (data ?? []).map(mapEpisodeRow)
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
  }
}

/* ── Duplicate detection ───────────────────────────────────────────── */

export type DuplicateWord = {
  word_id: number
  word_ar: string
  word_di: string
  word_tr: string
  gloss: string
  level: string
  theme: string
  source: string | null
}

export type DuplicateGroup = {
  key: string
  words: DuplicateWord[]
}

function normalizeArabic(str: string): string {
  return str
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u0621\u0623\u0625\u0626]/g, "\u0627")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export async function fetchVocabDuplicates(): Promise<{
  exactAr: DuplicateGroup[]
  exactDi: DuplicateGroup[]
  byGloss: DuplicateGroup[]
  byRoot: DuplicateGroup[]
}> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("app_vocab")
    .select("word_id, word_ar, word_di, word_tr, root, level, theme, source, definitions")

  if (error) {
    console.error("[fetchVocabDuplicates] error:", error.message)
    throw new Error(error.message)
  }

  const rows = (data ?? []).map((row) => ({
    word_id: Number(row.word_id),
    word_ar: String(row.word_ar ?? ""),
    word_di: String(row.word_di ?? ""),
    word_tr: String(row.word_tr ?? ""),
    root: row.root ? String(row.root) : null,
    level: String(row.level ?? ""),
    theme: String(row.theme ?? ""),
    source: row.source ? String(row.source) : null,
    gloss: primaryGloss(row.definitions),
  }))

  const groups = new Map<string, DuplicateWord[]>()
  const exactArGroups: DuplicateGroup[] = []
  const exactDiGroups: DuplicateGroup[] = []

  // Exact duplicates by normalized plain Arabic
  groups.clear()
  for (const row of rows) {
    const key = normalizeArabic(row.word_ar)
    if (!key) continue
    const list = groups.get(key) ?? []
    list.push({
      word_id: row.word_id,
      word_ar: row.word_ar,
      word_di: row.word_di,
      word_tr: row.word_tr,
      gloss: row.gloss,
      level: row.level,
      theme: row.theme,
      source: row.source,
    })
    groups.set(key, list)
  }
  for (const [key, list] of groups) {
    if (list.length > 1) exactArGroups.push({ key, words: list })
  }

  // Exact duplicates by diacritized Arabic (preserve diacritics and hamzas)
  groups.clear()
  for (const row of rows) {
    const key = row.word_di
      .normalize("NFC")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
    if (!key) continue
    const list = groups.get(key) ?? []
    list.push({
      word_id: row.word_id,
      word_ar: row.word_ar,
      word_di: row.word_di,
      word_tr: row.word_tr,
      gloss: row.gloss,
      level: row.level,
      theme: row.theme,
      source: row.source,
    })
    groups.set(key, list)
  }
  for (const [key, list] of groups) {
    if (list.length > 1) exactDiGroups.push({ key, words: list })
  }

  // Potential duplicates by primary English gloss
  groups.clear()
  for (const row of rows) {
    const key = row.gloss.trim().toLowerCase()
    if (!key || key.length < 3) continue
    const list = groups.get(key) ?? []
    list.push({
      word_id: row.word_id,
      word_ar: row.word_ar,
      word_di: row.word_di,
      word_tr: row.word_tr,
      gloss: row.gloss,
      level: row.level,
      theme: row.theme,
      source: row.source,
    })
    groups.set(key, list)
  }
  const byGloss: DuplicateGroup[] = []
  for (const [key, list] of groups) {
    if (list.length > 1) byGloss.push({ key, words: list })
  }
  byGloss.sort((a, b) => a.key.localeCompare(b.key))

  // Potential duplicates by shared root
  groups.clear()
  for (const row of rows) {
    if (!row.root) continue
    const key = row.root.trim().toLowerCase()
    const list = groups.get(key) ?? []
    list.push({
      word_id: row.word_id,
      word_ar: row.word_ar,
      word_di: row.word_di,
      word_tr: row.word_tr,
      gloss: row.gloss,
      level: row.level,
      theme: row.theme,
      source: row.source,
    })
    groups.set(key, list)
  }
  const byRoot: DuplicateGroup[] = []
  for (const [key, list] of groups) {
    if (list.length > 1) byRoot.push({ key, words: list })
  }
  byRoot.sort((a, b) => a.key.localeCompare(b.key))

  return { exactAr: exactArGroups, exactDi: exactDiGroups, byGloss, byRoot }
}
