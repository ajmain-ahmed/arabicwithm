// app/actions/admin.ts — admin CMS for shows, episodes, and books

"use server"

import { revalidatePath, updateTag } from "next/cache"
import { serviceClient } from "@/app/lib/supabase"
import { parseJsonb } from "@/app/lib/jsonb"
import { guardAdmin } from "@/app/actions/auth"
import {
  getYouTubeThumbnailUrl,
  normalizeFacebookId,
  normalizeInstagramId,
  normalizeTikTokId,
  normalizeYouTubeId,
} from "@/app/lib/cartoons"

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
  instagram_id: string | null
  tiktok_id: string | null
  facebook_id: string | null
  cover: string | null
  created_at: string | null
}

export type EpisodeWithTranscript = EpisodeRow & {
  transcript: Record<string, unknown> | unknown[] | null
}

export type ShowInput = Omit<ShowRow, "id" | "cover">
export type EpisodeInput = Omit<EpisodeRow, "id" | "created_at" | "cover"> & {
  transcript?: Record<string, unknown> | unknown[] | null
}

async function fetchOEmbedThumbnail(endpoint: string): Promise<string | null> {
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4500),
    })
    if (!response.ok) return null
    const data = await response.json() as { thumbnail_url?: unknown }
    return typeof data.thumbnail_url === "string" && /^https:\/\//i.test(data.thumbnail_url)
      ? data.thumbnail_url
      : null
  } catch {
    return null
  }
}

async function resolveEpisodeThumbnail(input: Partial<EpisodeInput>): Promise<string | null> {
  const youtubeThumbnail = getYouTubeThumbnailUrl(input.youtube_id)
  if (youtubeThumbnail) return youtubeThumbnail

  const tiktokId = normalizeTikTokId(input.tiktok_id)
  if (tiktokId) {
    const original = input.tiktok_id?.trim()
    const publicUrl = original && /^https?:\/\//i.test(original)
      ? original
      : `https://www.tiktok.com/@video/video/${tiktokId}`
    const thumbnail = await fetchOEmbedThumbnail(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(publicUrl)}`
    )
    if (thumbnail) return thumbnail
  }

  const instagramId = normalizeInstagramId(input.instagram_id)
  if (instagramId) {
    const publicUrl = `https://www.instagram.com/reel/${instagramId}/`
    const thumbnail = await fetchOEmbedThumbnail(
      `https://www.instagram.com/oembed/?url=${encodeURIComponent(publicUrl)}`
    )
    if (thumbnail) return thumbnail
  }

  const facebookId = normalizeFacebookId(input.facebook_id)
  if (facebookId) {
    const publicUrl = /^\d+$/.test(facebookId)
      ? `https://www.facebook.com/watch/?v=${facebookId}`
      : facebookId
    return fetchOEmbedThumbnail(
      `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(publicUrl)}`
    )
  }

  return null
}

/* ── Shows ─────────────────────────────────────────────────────────── */

export async function fetchShowsForAdmin(): Promise<ShowRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("shows")
    .select("id, slug, title, title_ar, description, cover, level, category")
    .order("title", { ascending: true })

  if (error) {
    console.error("[fetchShowsForAdmin] error:", error.message)
    throw new Error(error.message)
  }

  return ((data ?? []) as ShowRow[]).map((row) => ({
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

  const row = data as ShowRow
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    title_ar: row.title_ar ?? null,
    description: row.description ?? null,
    cover: row.cover ?? null,
    level: row.level,
    category: row.category ?? null,
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
      level: input.level,
      category: input.category,
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error("[createShow] error:", error?.message)
    throw new Error(error?.message ?? "Failed to create show")
  }

  updateTag("cartoons-public")
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
  if (input.level !== undefined) payload.level = input.level
  if (input.category !== undefined) payload.category = input.category

  const { error } = await serviceClient
    .from("shows")
    .update(payload as never)
    .eq("id", id)

  if (error) {
    console.error("[updateShow] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("cartoons-public")
}

export async function deleteShow(id: string): Promise<void> {
  await guardAdmin()

  const { error } = await serviceClient.from("shows").delete().eq("id", id)

  if (error) {
    console.error("[deleteShow] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("cartoons-public")
}

/* ── Episodes ──────────────────────────────────────────────────────── */

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

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapEpisodeRow(row))
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
    ...mapEpisodeRow(data as Record<string, unknown>),
    transcript: parseJsonb((data as Record<string, unknown>).transcript),
  }
}

export async function createEpisode(input: EpisodeInput): Promise<string> {
  await guardAdmin()

  const cover = await resolveEpisodeThumbnail(input)

  const { data, error } = await serviceClient
    .from("episodes")
    .insert({
      show_id: input.show_id,
      slug: input.slug,
      title: input.title,
      level: input.level,
      tags: input.tags,
      description: input.description,
      youtube_id: normalizeYouTubeId(input.youtube_id) ?? null,
      instagram_id: normalizeInstagramId(input.instagram_id) ?? null,
      tiktok_id: normalizeTikTokId(input.tiktok_id) ?? null,
      facebook_id: normalizeFacebookId(input.facebook_id) ?? null,
      cover,
      transcript: (input.transcript ?? []) as never,
    } as never)
    .select("id")
    .single()

  if (error || !data) {
    console.error("[createEpisode] error:", error?.message)
    throw new Error(error?.message ?? "Failed to create episode")
  }

  updateTag("cartoons-public")
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
  if (input.youtube_id !== undefined) payload.youtube_id = normalizeYouTubeId(input.youtube_id) ?? null
  if (input.instagram_id !== undefined) payload.instagram_id = normalizeInstagramId(input.instagram_id) ?? null
  if (input.tiktok_id !== undefined) payload.tiktok_id = normalizeTikTokId(input.tiktok_id) ?? null
  if (input.facebook_id !== undefined) payload.facebook_id = normalizeFacebookId(input.facebook_id) ?? null
  if (
    input.youtube_id !== undefined ||
    input.instagram_id !== undefined ||
    input.tiktok_id !== undefined ||
    input.facebook_id !== undefined
  ) {
    payload.cover = await resolveEpisodeThumbnail(input)
  }
  if (input.transcript !== undefined) payload.transcript = input.transcript

  const { error } = await serviceClient
    .from("episodes")
    .update(payload as never)
    .eq("id", id)

  if (error) {
    console.error("[updateEpisode] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("cartoons-public")
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

  updateTag("cartoons-public")
}

export async function updateEpisodeTranscript(
  id: string,
  transcript: unknown
): Promise<void> {
  await guardAdmin()

  const { error } = await serviceClient
    .from("episodes")
    .update({ transcript } as never)
    .eq("id", id)

  if (error) {
    console.error("[updateEpisodeTranscript] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("cartoons-public")
}

/* ── Books ─────────────────────────────────────────────────────────── */

export type BookRow = {
  id: string
  slug: string
  title: string
  title_ar: string | null
  description: string | null
  cover: string | null
  level: string
  category: string | null
  created_at: string | null
  updated_at: string | null
}

export type BookInput = Omit<BookRow, "id" | "created_at" | "updated_at">

export async function fetchBooksForAdmin(): Promise<BookRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("books")
    .select("*")
    .order("title", { ascending: true })

  if (error) {
    console.error("[fetchBooksForAdmin] error:", error.message)
    throw new Error(error.message)
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapBookRow(row))
}

export async function fetchBookForAdmin(id: string): Promise<BookRow | null> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("books")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    if (error) console.error("[fetchBookForAdmin] error:", error.message)
    return null
  }

  return mapBookRow(data as Record<string, unknown>)
}

export async function createBook(input: BookInput): Promise<string> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("books")
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
    console.error("[createBook] error:", error?.message)
    throw new Error(error?.message ?? "Failed to create book")
  }

  updateTag("books-public")
  return data.id
}

export async function updateBook(
  id: string,
  input: Partial<BookInput>
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
    .from("books")
    .update(payload as never)
    .eq("id", id)

  if (error) {
    console.error("[updateBook] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("books-public")
}

export async function deleteBook(id: string): Promise<void> {
  await guardAdmin()

  const { error } = await serviceClient.from("books").delete().eq("id", id)

  if (error) {
    console.error("[deleteBook] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("books-public")
}

/* ── Chapters ──────────────────────────────────────────────────────── */

export type ChapterRow = {
  id: string
  book_id: string
  slug: string
  title: string
  chapter_number: number
  created_at: string | null
  updated_at: string | null
}

export type ChapterWithContent = ChapterRow & {
  content: Record<string, unknown> | unknown[] | null
}

export type ChapterInput = Omit<ChapterRow, "id" | "created_at" | "updated_at"> & {
  content?: Record<string, unknown> | unknown[] | null
}

export async function fetchChaptersForBookAdmin(
  bookId: string
): Promise<ChapterRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("chapters")
    .select("*")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true })

  if (error) {
    console.error("[fetchChaptersForBookAdmin] error:", error.message)
    throw new Error(error.message)
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapChapterRow(row))
}

export async function fetchChapterForAdmin(
  id: string
): Promise<ChapterWithContent | null> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("chapters")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    if (error) console.error("[fetchChapterForAdmin] error:", error.message)
    return null
  }

  return {
    ...mapChapterRow(data as Record<string, unknown>),
    content: parseJsonb((data as Record<string, unknown>).content),
  }
}

export async function createChapter(input: ChapterInput): Promise<string> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("chapters")
    .insert({
      book_id: input.book_id,
      slug: input.slug,
      title: input.title,
      chapter_number: input.chapter_number,
      content: (input.content ?? []) as never,
    } as never)
    .select("id")
    .single()

  if (error || !data) {
    console.error("[createChapter] error:", error?.message)
    throw new Error(error?.message ?? "Failed to create chapter")
  }

  updateTag("books-public")
  return data.id
}

export async function updateChapter(
  id: string,
  input: Partial<ChapterInput>
): Promise<void> {
  await guardAdmin()

  const payload: Record<string, unknown> = {}
  if (input.book_id !== undefined) payload.book_id = input.book_id
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.title !== undefined) payload.title = input.title
  if (input.chapter_number !== undefined) payload.chapter_number = input.chapter_number
  if (input.content !== undefined) payload.content = input.content

  const { error } = await serviceClient
    .from("chapters")
    .update(payload as never)
    .eq("id", id)

  if (error) {
    console.error("[updateChapter] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("books-public")
}

export async function deleteChapter(id: string): Promise<void> {
  await guardAdmin()

  const { error } = await serviceClient.from("chapters").delete().eq("id", id)

  if (error) {
    console.error("[deleteChapter] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("books-public")
}

export async function updateChapterContent(
  id: string,
  content: unknown
): Promise<void> {
  await guardAdmin()

  const { error } = await serviceClient
    .from("chapters")
    .update({ content } as never)
    .eq("id", id)

  if (error) {
    console.error("[updateChapterContent] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("books-public")
}

/* ── Hans Wehr ─────────────────────────────────────────────────────── */

export type HansWehrEntry = {
  id: number
  word: string
  definition: string
  is_root: boolean
  parent_id: number
  quran_occurrence: number | null
}

export async function fetchHansWehrEntries(headwords: string[]): Promise<HansWehrEntry[]> {
  await guardAdmin()

  const unique = Array.from(new Set(headwords.map((h) => h.trim()).filter(Boolean)))
  if (unique.length === 0) return []

  const { data, error } = await serviceClient
    .from("hanswehr_dictionary")
    .select("id, word, definition, is_root, parent_id, quran_occurrence")
    .in("word", unique)

  if (error) {
    console.error("[fetchHansWehrEntries] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    word: String(row.word),
    definition: String(row.definition ?? ""),
    is_root: Boolean(row.is_root),
    parent_id: Number(row.parent_id),
    quran_occurrence: row.quran_occurrence == null ? null : Number(row.quran_occurrence),
  }))
}

export async function updateHansWehrDefinition(
  id: number,
  definition: string
): Promise<void> {
  await guardAdmin()

  const { error } = await serviceClient
    .from("hanswehr_dictionary")
    .update({ definition })
    .eq("id", id)

  if (error) {
    console.error("[updateHansWehrDefinition] error:", error.message)
    throw new Error(error.message)
  }
}

export type HansWehrSearchResult = {
  id: number
  word: string
  definition: string
}

export type HansWehrSearchInput = {
  id?: string
  word?: string
  definition?: string
  idExact?: boolean
  wordExact?: boolean
  definitionExact?: boolean
}

export async function searchHansWehr(
  input: HansWehrSearchInput
): Promise<HansWehrSearchResult[]> {
  await guardAdmin()

  const idTerm = input.id?.trim()
  const wordTerm = input.word?.trim()
  const definitionTerm = input.definition?.trim()

  const hasCriteria = Boolean(idTerm || wordTerm || definitionTerm)
  if (!hasCriteria) return []

  let query = serviceClient
    .from("hanswehr_dictionary")
    .select("id, word, definition")
    .limit(100)

  if (idTerm) {
    if (input.idExact) {
      const idNum = Number(idTerm)
      if (!Number.isNaN(idNum)) {
        query = query.eq("id", idNum)
      }
    } else {
      query = query.ilike("id::text", `%${idTerm}%`)
    }
  }

  if (wordTerm) {
    if (input.wordExact) {
      query = query.eq("word", wordTerm)
    } else {
      query = query.ilike("word", `%${wordTerm}%`)
    }
  }

  if (definitionTerm) {
    if (input.definitionExact) {
      query = query.eq("definition", definitionTerm)
    } else {
      query = query.ilike("definition", `%${definitionTerm}%`)
    }
  }

  const { data, error } = await query.order("id", { ascending: true })

  if (error) {
    console.error("[searchHansWehr] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    word: String(row.word),
    definition: String(row.definition ?? ""),
  }))
}

/* ── Phrases ───────────────────────────────────────────────────────── */

export type PhraseRow = {
  id: number
  phrase_ar_di: string
  phrase_tr: string
  english: string
  cefr: string
  notes: string | null
}

export async function fetchAllPhrasesForAdmin(): Promise<PhraseRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("phrases")
    .select("id, phrase_ar_di, phrase_tr, english, cefr, notes")
    .order("id", { ascending: true })

  if (error) {
    console.error("[fetchAllPhrasesForAdmin] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapPhraseRow(row))
}

export async function fetchPhrases(ids: number[]): Promise<PhraseRow[]> {
  await guardAdmin()

  const unique = Array.from(new Set(ids.filter((id) => !Number.isNaN(id))))
  if (unique.length === 0) return []

  const { data, error } = await serviceClient
    .from("phrases")
    .select("id, phrase_ar_di, phrase_tr, english, cefr, notes")
    .in("id", unique)

  if (error) {
    console.error("[fetchPhrases] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapPhraseRow(row))
}

export async function updatePhrase(
  id: number,
  input: Partial<Omit<PhraseRow, "id">>
): Promise<void> {
  await guardAdmin()

  const payload: Record<string, unknown> = {}
  if (input.phrase_ar_di !== undefined) payload.phrase_ar_di = input.phrase_ar_di
  if (input.phrase_tr !== undefined) payload.phrase_tr = input.phrase_tr
  if (input.english !== undefined) payload.english = input.english
  if (input.cefr !== undefined) payload.cefr = input.cefr
  if (input.notes !== undefined) payload.notes = input.notes

  const { error } = await serviceClient
    .from("phrases")
    .update(payload as never)
    .eq("id", id)

  if (error) {
    console.error("[updatePhrase] error:", error.message)
    throw new Error(error.message)
  }
}

/* ── Helpers ───────────────────────────────────────────────────────── */

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
    instagram_id: toStringOrNull(row.instagram_id),
    tiktok_id: toStringOrNull(row.tiktok_id),
    facebook_id: toStringOrNull(row.facebook_id),
    cover: toStringOrNull(row.cover),
    created_at: toStringOrNull(row.created_at),
  }
}

function mapBookRow(row: Record<string, unknown>): BookRow {
  const toStringOrNull = (val: unknown): string | null =>
    val == null || val === "" ? null : String(val)

  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    title_ar: toStringOrNull(row.title_ar),
    description: toStringOrNull(row.description),
    cover: toStringOrNull(row.cover),
    level: String(row.level),
    category: toStringOrNull(row.category),
    created_at: toStringOrNull(row.created_at),
    updated_at: toStringOrNull(row.updated_at),
  }
}

function mapChapterRow(row: Record<string, unknown>): ChapterRow {
  const toStringOrNull = (val: unknown): string | null =>
    val == null || val === "" ? null : String(val)

  return {
    id: String(row.id),
    book_id: String(row.book_id),
    slug: String(row.slug),
    title: String(row.title),
    chapter_number: Number(row.chapter_number),
    created_at: toStringOrNull(row.created_at),
    updated_at: toStringOrNull(row.updated_at),
  }
}

function mapPhraseRow(row: Record<string, unknown>): PhraseRow {
  return {
    id: Number(row.id),
    phrase_ar_di: String(row.phrase_ar_di),
    phrase_tr: String(row.phrase_tr),
    english: String(row.english),
    cefr: String(row.cefr),
    notes: row.notes ? String(row.notes) : null,
  }
}
