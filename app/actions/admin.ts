// app/actions/admin.ts — admin CMS for shows, episodes, and books

"use server"

import { revalidatePath, updateTag } from "next/cache"
import { serviceClient } from "@/app/lib/supabase"
import { readChapterPublication } from '@/app/lib/chapterPublicationRead'
import { mapBookRow, mapChapterRow, mapEpisodeRow, mapPhraseRow, mapShowRow } from '@/app/lib/adminRowMappers'
import { parseJsonb } from "@/app/lib/jsonb"
import { guardAdmin } from "@/app/actions/auth"
import {
  getYouTubeThumbnailUrl,
  normalizeFacebookId,
  normalizeInstagramId,
  normalizeTikTokId,
  normalizeYouTubeId,
} from "@/app/lib/cartoons"
import {
  normalizeThumbnailCrop,
  type ThumbnailCrop,
} from "@/app/lib/thumbnailCrop"
import { withDataDeadline } from '@/app/lib/boundedFetch'
import { z } from 'zod'
import { unstable_rethrow } from 'next/navigation'
import { bookInputSchema, bookSaveError } from '@/app/lib/bookInput'
import { validateBookTokenGrammar } from '@/app/lib/bookTokenGrammar'
import { validateAdditionalStructuredChapter } from '@/app/lib/structuredChapter'
import type { ActionResult } from '@/app/lib/actionResult'

/* ── Types ─────────────────────────────────────────────────────────── */

export type ShowRow = {
  id: string
  slug: string
  title: string
  title_ar: string | null
  description: string | null
  cover: string | null
  cover_crop: ThumbnailCrop
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
  cover_crop: ThumbnailCrop
  created_at: string | null
}

export type EpisodeWithTranscript = EpisodeRow & {
  transcript: Record<string, unknown> | unknown[] | null
}

export type ShowInput = Omit<ShowRow, "id" | "cover">
export type EpisodeInput = Omit<EpisodeRow, "id" | "created_at" | "cover"> & {
  cover?: string | null
  transcript?: Record<string, unknown> | unknown[] | null
}

export type EpisodeSaveResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

type EpisodeDatabaseError = {
  code?: string
  message?: string
}

/* ── Targeted revalidation: invalidate only the pages whose content
   actually changed. Layout-scoped revalidation invalidates every show,
   episode, book, and chapter page at once, and each invalidated page
   regenerates (and re-writes its full payload) on the next request. ── */

function revalidateCartoonIndex(): void {
  revalidatePath("/")
  revalidatePath("/cartoons")
  revalidatePath("/explore")
}

function revalidateBookIndex(): void {
  revalidatePath("/")
  revalidatePath("/books")
  revalidatePath("/explore")
}

function revalidateShowPage(showSlug: string): void {
  revalidatePath(`/cartoons/${showSlug}`)
}

function revalidateEpisodePage(showSlug: string, episodeSlug: string): void {
  revalidatePath(`/cartoons/${showSlug}`)
  revalidatePath(`/cartoons/${showSlug}/${episodeSlug}`)
}

function revalidateBookPage(bookSlug: string): void {
  revalidatePath(`/books/${bookSlug}`)
}

function revalidateChapterPage(bookSlug: string, chapterSlug: string): void {
  revalidatePath(`/books/${bookSlug}`)
  revalidatePath(`/books/${bookSlug}/${chapterSlug}`)
}

async function fetchShowSlugById(showId: string): Promise<string | null> {
  const { data, error } = await serviceClient
    .from("shows")
    .select("slug")
    .eq("id", showId)
    .maybeSingle()

  if (error || !data) return null
  return String((data as Record<string, unknown>).slug)
}

async function fetchEpisodePathById(
  episodeId: string
): Promise<{ showSlug: string; episodeSlug: string } | null> {
  const { data, error } = await serviceClient
    .from("episodes")
    .select("slug, show_id")
    .eq("id", episodeId)
    .maybeSingle()

  if (error || !data) return null
  const showSlug = await fetchShowSlugById(String((data as Record<string, unknown>).show_id))
  if (!showSlug) return null
  return { showSlug, episodeSlug: String((data as Record<string, unknown>).slug) }
}

async function fetchBookSlugById(bookId: string): Promise<string | null> {
  const { data, error } = await serviceClient
    .from("books")
    .select("slug")
    .eq("id", bookId)
    .maybeSingle()

  if (error || !data) return null
  return String((data as Record<string, unknown>).slug)
}

async function fetchChapterPathById(
  chapterId: string
): Promise<{ bookSlug: string; chapterSlug: string } | null> {
  const { data, error } = await serviceClient
    .from("chapters")
    .select("slug, book_id")
    .eq("id", chapterId)
    .maybeSingle()

  if (error || !data) return null
  const bookSlug = await fetchBookSlugById(String((data as Record<string, unknown>).book_id))
  if (!bookSlug) return null
  return { bookSlug, chapterSlug: String((data as Record<string, unknown>).slug) }
}

function isMissingSocialVideoColumn(error: EpisodeDatabaseError | null): boolean {
  return Boolean(
    error &&
    (error.code === "42703" || error.code === "PGRST204") &&
    /(?:instagram_id|tiktok_id|facebook_id)/i.test(error.message ?? "")
  )
}

function episodeSaveError(error: EpisodeDatabaseError | null): string {
  if (error?.code === "23505") return "An episode with this slug already exists for the selected show."
  if (error?.code === "23503") return "The selected show no longer exists. Refresh the page and try again."
  if (error?.code === "23502") return "A required episode field is missing. Please complete the show, slug, and title fields."
  return "The episode could not be saved. Please check the episode details and try again."
}

function validateEpisodeInput(input: Partial<EpisodeInput>): string | null {
  if (!input.show_id?.trim()) return "Please select a show."
  if (!input.slug?.trim()) return "Please enter an episode slug."
  if (!input.title?.trim()) return "Please enter an episode title."
  return null
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
    .select("id,slug,title,title_ar,description,cover,cover_crop,level,category")
    .order("title", { ascending: true })

  if (error) {
    console.error("[fetchShowsForAdmin] error:", error.message)
    throw new Error(error.message)
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapShowRow)
}

export async function fetchShowForAdmin(id: string): Promise<ShowRow | null> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("shows")
    .select("*")
    .eq("id", id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error("[fetchShowForAdmin] error:", error.message)
    throw new Error('Unable to load this show. Please reload the page.')
  }
  if (!data) return null

  return mapShowRow(data as Record<string, unknown>)
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
      cover_crop: normalizeThumbnailCrop(input.cover_crop),
      level: input.level,
      category: input.category,
    } as never)
    .select("id")
    .single()

  if (error || !data) {
    console.error("[createShow] error:", error?.message)
    throw new Error(error?.message ?? "Failed to create show")
  }

  updateTag("cartoons-public")
  revalidateCartoonIndex()
  revalidateShowPage(input.slug)
  return data.id
}

export async function updateShow(
  id: string,
  input: Partial<ShowInput>
): Promise<void> {
  await guardAdmin()

  const previousSlug = await fetchShowSlugById(id)

  const payload: Record<string, unknown> = {}
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.title !== undefined) payload.title = input.title
  if (input.title_ar !== undefined) payload.title_ar = input.title_ar
  if (input.description !== undefined) payload.description = input.description
  if (input.cover_crop !== undefined) payload.cover_crop = normalizeThumbnailCrop(input.cover_crop)
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
  revalidateCartoonIndex()
  if (previousSlug) revalidateShowPage(previousSlug)
  if (input.slug && input.slug !== previousSlug) revalidateShowPage(input.slug)
}

export async function deleteShow(id: string): Promise<void> {
  await guardAdmin()

  const slug = await fetchShowSlugById(id)

  const { error } = await serviceClient.from("shows").delete().eq("id", id)

  if (error) {
    console.error("[deleteShow] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("cartoons-public")
  revalidateCartoonIndex()
  if (slug) revalidateShowPage(slug)
}

/* ── Episodes ──────────────────────────────────────────────────────── */

export async function fetchAllEpisodesForAdmin(): Promise<EpisodeRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("episodes")
    .select("id,show_id,slug,title,level,tags,description,youtube_id,instagram_id,tiktok_id,facebook_id,cover,cover_crop,created_at")
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

  if (error && error.code !== 'PGRST116') {
    console.error("[fetchEpisodeForAdmin] error:", error.message)
    throw new Error('Unable to load this episode. Please reload the page.')
  }
  if (!data) return null

  return {
    ...mapEpisodeRow(data as Record<string, unknown>),
    transcript: parseJsonb((data as Record<string, unknown>).transcript),
  }
}

export async function createEpisode(input: EpisodeInput): Promise<EpisodeSaveResult> {
  await guardAdmin()

  const validationError = validateEpisodeInput(input)
  if (validationError) return { ok: false, error: validationError }

  const cover = input.cover === undefined ? await resolveEpisodeThumbnail(input) : input.cover

  const instagramId = normalizeInstagramId(input.instagram_id) ?? null
  const tiktokId = normalizeTikTokId(input.tiktok_id) ?? null
  const facebookId = normalizeFacebookId(input.facebook_id) ?? null
  const requestedSocialVideo = Boolean(instagramId || tiktokId || facebookId)

  const basePayload = {
    show_id: input.show_id.trim(),
    slug: input.slug.trim(),
    title: input.title.trim(),
    level: input.level.trim(),
    tags: input.tags,
    description: input.description,
    youtube_id: normalizeYouTubeId(input.youtube_id) ?? null,
    cover,
    cover_crop: normalizeThumbnailCrop(input.cover_crop),
    transcript: (input.transcript ?? []) as never,
  }

  let { data, error } = await serviceClient
    .from("episodes")
    .insert({
      ...basePayload,
      instagram_id: instagramId,
      tiktok_id: tiktokId,
      facebook_id: facebookId,
    } as never)
    .select("id")
    .single()

  if (isMissingSocialVideoColumn(error)) {
    if (requestedSocialVideo) {
      console.error("[createEpisode] social video columns are missing from the live database")
      return {
        ok: false,
        error: "Social video IDs are not enabled in the live database yet. Apply the episode social-video migration, or clear those three fields to save this episode with YouTube only.",
      }
    }

    const legacyResult = await serviceClient
      .from("episodes")
      .insert(basePayload as never)
      .select("id")
      .single()
    data = legacyResult.data
    error = legacyResult.error
  }

  if (error || !data) {
    console.error("[createEpisode] error:", error?.message)
    return { ok: false, error: episodeSaveError(error) }
  }

  updateTag("cartoons-public")
  revalidateCartoonIndex()
  const showSlug = await fetchShowSlugById(input.show_id.trim())
  if (showSlug) revalidateEpisodePage(showSlug, input.slug.trim())
  return { ok: true, id: String(data.id) }
}

export async function updateEpisode(
  id: string,
  input: Partial<EpisodeInput>
): Promise<EpisodeSaveResult> {
  await guardAdmin()

  const validationError = validateEpisodeInput(input)
  if (validationError) return { ok: false, error: validationError }

  const previousPath = await fetchEpisodePathById(id)

  const payload: Record<string, unknown> = {}
  if (input.show_id !== undefined) payload.show_id = input.show_id
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.title !== undefined) payload.title = input.title
  if (input.level !== undefined) payload.level = input.level
  if (input.tags !== undefined) payload.tags = input.tags
  if (input.description !== undefined) payload.description = input.description
  if (input.youtube_id !== undefined) payload.youtube_id = normalizeYouTubeId(input.youtube_id) ?? null
  const instagramId = input.instagram_id === undefined ? undefined : normalizeInstagramId(input.instagram_id) ?? null
  const tiktokId = input.tiktok_id === undefined ? undefined : normalizeTikTokId(input.tiktok_id) ?? null
  const facebookId = input.facebook_id === undefined ? undefined : normalizeFacebookId(input.facebook_id) ?? null
  if (instagramId !== undefined) payload.instagram_id = instagramId
  if (tiktokId !== undefined) payload.tiktok_id = tiktokId
  if (facebookId !== undefined) payload.facebook_id = facebookId
  if (input.cover !== undefined) payload.cover = input.cover
  if (input.cover_crop !== undefined) payload.cover_crop = normalizeThumbnailCrop(input.cover_crop)
  const requestedSocialVideo = Boolean(instagramId || tiktokId || facebookId)
  if (input.cover === undefined && (
    input.youtube_id !== undefined ||
    input.instagram_id !== undefined ||
    input.tiktok_id !== undefined ||
    input.facebook_id !== undefined
  )) {
    payload.cover = await resolveEpisodeThumbnail(input)
  }
  if (input.transcript !== undefined) payload.transcript = input.transcript

  let { error } = await serviceClient
    .from("episodes")
    .update(payload as never)
    .eq("id", id)

  if (isMissingSocialVideoColumn(error)) {
    if (requestedSocialVideo) {
      console.error("[updateEpisode] social video columns are missing from the live database")
      return {
        ok: false,
        error: "Social video IDs are not enabled in the live database yet. Apply the episode social-video migration, or clear those three fields to save this episode with YouTube only.",
      }
    }

    delete payload.instagram_id
    delete payload.tiktok_id
    delete payload.facebook_id
    const legacyResult = await serviceClient
      .from("episodes")
      .update(payload as never)
      .eq("id", id)
    error = legacyResult.error
  }

  if (error) {
    console.error("[updateEpisode] error:", error.message)
    return { ok: false, error: episodeSaveError(error) }
  }

  updateTag("cartoons-public")
  revalidateCartoonIndex()
  if (previousPath) revalidateEpisodePage(previousPath.showSlug, previousPath.episodeSlug)
  const nextShowSlug = input.show_id !== undefined
    ? await fetchShowSlugById(input.show_id)
    : previousPath?.showSlug
  const nextEpisodeSlug = input.slug ?? previousPath?.episodeSlug
  if (nextShowSlug && nextEpisodeSlug) {
    revalidateEpisodePage(nextShowSlug, nextEpisodeSlug)
  }
  return { ok: true, id }
}

export async function deleteEpisode(id: string): Promise<void> {
  await guardAdmin()

  const path = await fetchEpisodePathById(id)

  const { error } = await serviceClient.from("episodes").delete().eq("id", id)

  if (error) {
    console.error("[deleteEpisode] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("cartoons-public")
  revalidateCartoonIndex()
  if (path) revalidateEpisodePage(path.showSlug, path.episodeSlug)
}

/* Server Action bodies fail opaquely around ~1 MB; give content editors a
   clear error before they hit that. */
const MAX_CONTENT_JSON_BYTES = 900_000

function assertContentSize(value: unknown, label: string): void {
  const size = JSON.stringify(value ?? null)?.length ?? 0
  if (size > MAX_CONTENT_JSON_BYTES) {
    throw new Error(`${label} is too large (${Math.round(size / 1024)} KB serialized). Split it into smaller blocks.`)
  }
}

export async function updateEpisodeTranscript(
  id: string,
  transcript: unknown
): Promise<void> {
  await guardAdmin()
  assertContentSize(transcript, "Transcript")

  const path = await fetchEpisodePathById(id)

  const { error } = await serviceClient
    .from("episodes")
    .update({ transcript } as never)
    .eq("id", id)

  if (error) {
    console.error("[updateEpisodeTranscript] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("cartoons-public")
  revalidatePath("/explore")
  if (path) revalidateEpisodePage(path.showSlug, path.episodeSlug)
}

/* ── Books ─────────────────────────────────────────────────────────── */

export type BookRow = {
  id: string
  slug: string
  title: string
  is_completed: boolean
  author: string | null
  reading_time_minutes: number | null
  title_ar: string | null
  description: string | null
  cover: string | null
  cover_crop: ThumbnailCrop
  level: string
  category: string | null
  created_at: string | null
  updated_at: string | null
}

export type BookInput = Omit<BookRow, "id" | "created_at" | "updated_at" | "is_completed"> & { is_completed?: boolean }

export async function fetchBooksForAdmin(): Promise<BookRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("books")
    .select("id,slug,title,is_completed,author,reading_time_minutes,title_ar,description,cover,cover_crop,level,category,created_at,updated_at")
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

  if (error && error.code !== 'PGRST116') {
    console.error("[fetchBookForAdmin] error:", error.message)
    throw new Error('Unable to load this book. Please reload the page.')
  }
  if (!data) return null

  return mapBookRow(data as Record<string, unknown>)
}

export async function createBook(input: BookInput): Promise<ActionResult<string>> {
  try {
    await guardAdmin()
    const parsed = bookInputSchema.safeParse(input)
    if (!parsed.success) return {ok:false,error:parsed.error.issues[0].message}
    const value = parsed.data
    const {data,error} = await serviceClient.from('books').insert({...value,author:value.author || null,updated_at:new Date().toISOString()} as never).select('id').single()
    if (error || !data) { console.error('[createBook]',error); return {ok:false,error:bookSaveError(error)} }
    updateTag('books-public'); revalidateBookIndex(); revalidateBookPage(value.slug); revalidatePath('/admin/books')
    return {ok:true,data:String(data.id)}
  } catch (error) {
    unstable_rethrow(error); console.error('[createBook]',error)
    return {ok:false,error:error instanceof Error && error.message==='Forbidden'?'Administrator access is required to save books.':'Unable to save the book. Please try again.'}
  }
}

export async function updateBook(id:string,input:Partial<BookInput>):Promise<ActionResult<string>> {
  try {
    await guardAdmin()
    if (!z.string().uuid().safeParse(id).success) return {ok:false,error:'Invalid book ID.'}
    const parsed = bookInputSchema.partial().extend({is_completed:z.boolean().optional()}).safeParse(input)
    if (!parsed.success) return {ok:false,error:parsed.error.issues[0].message}
    const previousSlug = await fetchBookSlugById(id)
    if (!previousSlug) return {ok:false,error:'This book is no longer available. Refresh the library.'}
    const {data,error} = await serviceClient.from('books').update({...parsed.data,updated_at:new Date().toISOString()} as never).eq('id',id).select('id').maybeSingle()
    if (error || !data) { console.error('[updateBook]',error); return {ok:false,error:error?bookSaveError(error):'This book is no longer available. Refresh the library.'} }
    updateTag('books-public'); revalidateBookIndex(); revalidateBookPage(previousSlug)
    if(parsed.data.slug && parsed.data.slug!==previousSlug)revalidateBookPage(parsed.data.slug)
    revalidatePath('/admin/books')
    return {ok:true,data:id}
  } catch(error) {
    unstable_rethrow(error); console.error('[updateBook]',error)
    return {ok:false,error:error instanceof Error && error.message==='Forbidden'?'Administrator access is required to save books.':'Unable to save the book. Please try again.'}
  }
}

export async function deleteBook(id: string): Promise<void> {
  await guardAdmin()

  const slug = await fetchBookSlugById(id)

  const { error } = await serviceClient.from("books").delete().eq("id", id)

  if (error) {
    console.error("[deleteBook] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("books-public")
  revalidateBookIndex()
  if (slug) revalidateBookPage(slug)
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
  productionStatus?: string | null
  is_published?: boolean
}

export type ChapterWithContent = ChapterRow & {
  content: Record<string, unknown> | unknown[] | null
}

export type ChapterInput = Omit<ChapterRow, "id" | "created_at" | "updated_at" | "productionStatus"> & {
  content?: Record<string, unknown> | unknown[] | null
}

export async function fetchChaptersForBookAdmin(
  bookId: string
): Promise<ChapterRow[]> {
  await guardAdmin()

  return (await readAllAdminChapterMetadata(bookId)).map(mapChapterRow)
}

/** Metadata only, without the Data API's single-response row cap. */
async function readAllAdminChapterMetadata(bookId?: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  for (let offset=0; ; offset+=500) {
    const {data,error}=await readChapterPublication(hasPublication => {
      const columns = hasPublication
        ? 'id,book_id,slug,title,chapter_number,created_at,updated_at,is_published,production_status:content->>production_status'
        : 'id,book_id,slug,title,chapter_number,created_at,updated_at,production_status:content->>production_status'
      let query=serviceClient.from('chapters').select(columns).order('chapter_number').order('id').range(offset,offset+499)
      if (bookId) query=query.eq('book_id',bookId)
      return query
    })
    if(error)throw new Error('Unable to load the book chapters.')
    rows.push(...(data ?? []) as unknown as Record<string, unknown>[])
    if((data?.length ?? 0)<500)return rows
  }
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

  if (error && error.code !== 'PGRST116') {
    console.error("[fetchChapterForAdmin] error:", error.message)
    throw new Error('Unable to load this chapter. Please reload the page.')
  }
  if (!data) return null

  return {
    ...mapChapterRow(data as Record<string, unknown>),
    content: parseJsonb((data as Record<string, unknown>).content),
  }
}

// Older deployments use only the parent Book gate. Never silently save a draft
// into a released Book when the database cannot enforce chapter publication.
async function assertLegacyChapterPublication(bookId: string, published?: boolean): Promise<void> {
  if (published !== false) return
  const { data, error } = await serviceClient.from('books').select('is_completed').eq('id', bookId).single()
  if (error || !data) throw new Error('Unable to verify Book publication. Please reload and retry.')
  if (data.is_completed !== false) throw new Error('This database does not support chapter drafts in released Books yet. Save the chapter in an in-progress Book, or install the existing chapter-publication migration before saving a draft here.')
}

function chapterSaveError(error: unknown): string {
  const failure = error as { code?: string; message?: string }
  if (failure?.message === 'Forbidden') return 'Administrator access is required to save chapters.'
  if (failure?.code === '23505') return 'A chapter already uses this slug or chapter number in this Book. Choose another value.'
  if (failure?.code === '23503') return 'The selected Book no longer exists. Reload the Books list.'
  if (failure instanceof Error) return failure.message
  return 'Unable to save the chapter. Please check the fields and try again.'
}

/** Expected save failures must cross the production Server Action boundary as data. */
export async function createChapterResult(input: ChapterInput): Promise<ActionResult<string>> {
  try { return { ok: true, data: await createChapter(input) } }
  catch (error) { unstable_rethrow(error); console.error('[createChapterResult]', error); return { ok: false, error: chapterSaveError(error) } }
}

export async function updateChapterResult(id: string, input: Partial<ChapterInput>): Promise<ActionResult<string>> {
  try { await updateChapter(id, input); return { ok: true, data: id } }
  catch (error) { unstable_rethrow(error); console.error('[updateChapterResult]', error); return { ok: false, error: chapterSaveError(error) } }
}

export async function createChapter(input: ChapterInput): Promise<string> {
  await guardAdmin()
  validateBookTokenGrammar(input.content)
  validateAdditionalStructuredChapter(input.content)

  const { data, error } = await readChapterPublication(async hasPublication => {
    if (!hasPublication) await assertLegacyChapterPublication(input.book_id, input.is_published ?? false)
    return serviceClient
    .from("chapters")
    .insert({
      book_id: input.book_id,
      slug: input.slug,
      title: input.title,
      chapter_number: input.chapter_number,
      ...(hasPublication ? { is_published: input.is_published === undefined ? false : z.boolean().parse(input.is_published) } : {}),
      content: (input.content ?? []) as never,
    } as never)
    .select("id")
    .single()
  })

  if (error || !data) {
    console.error("[createChapter] error:", error?.message)
    throw new Error(chapterSaveError(error))
  }

  updateTag("books-public")
  revalidateBookIndex()
  const bookSlug = await fetchBookSlugById(input.book_id)
  if (bookSlug) revalidateChapterPage(bookSlug, input.slug)
  return data.id
}

export async function updateChapter(
  id: string,
  input: Partial<ChapterInput>
): Promise<void> {
  await guardAdmin()

  validateBookTokenGrammar(input.content)
  validateAdditionalStructuredChapter(input.content)

  const previousPath = await fetchChapterPathById(id)

  const payload: Record<string, unknown> = {}
  if (input.book_id !== undefined) payload.book_id = input.book_id
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.title !== undefined) payload.title = input.title
  if (input.chapter_number !== undefined) payload.chapter_number = input.chapter_number
  if (input.content !== undefined) payload.content = input.content
  if (input.is_published !== undefined) payload.is_published = z.boolean().parse(input.is_published)

  const { error } = await readChapterPublication(async hasPublication => {
    const compatiblePayload = { ...payload }
    if (!hasPublication) {
      let bookId = input.book_id
      if (!bookId) {
        const { data, error } = await serviceClient.from('chapters').select('book_id').eq('id', id).single()
        if (error || !data) throw new Error('Unable to verify chapter publication. Please reload and retry.')
        bookId = data.book_id
      }
      await assertLegacyChapterPublication(bookId!, input.is_published)
      delete compatiblePayload.is_published
    }
    return serviceClient.from('chapters').update(compatiblePayload as never).eq('id', id)
  })

  if (error) {
    console.error("[updateChapter] error:", error.message)
    throw new Error(chapterSaveError(error))
  }

  updateTag("books-public")
  revalidateBookIndex()
  if (previousPath) revalidateChapterPage(previousPath.bookSlug, previousPath.chapterSlug)
  const nextBookSlug = input.book_id !== undefined
    ? await fetchBookSlugById(input.book_id)
    : previousPath?.bookSlug
  const nextChapterSlug = input.slug ?? previousPath?.chapterSlug
  if (nextBookSlug && nextChapterSlug) {
    revalidateChapterPage(nextBookSlug, nextChapterSlug)
  }
}

export async function deleteChapter(id: string): Promise<void> {
  await guardAdmin()

  const path = await fetchChapterPathById(id)

  const { error } = await serviceClient.from("chapters").delete().eq("id", id)

  if (error) {
    console.error("[deleteChapter] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("books-public")
  revalidateBookIndex()
  if (path) revalidateChapterPage(path.bookSlug, path.chapterSlug)
}

export async function updateChapterContent(
  id: string,
  content: unknown
): Promise<void> {
  await guardAdmin()
  assertContentSize(content, "Chapter content")

  validateBookTokenGrammar(content)
  validateAdditionalStructuredChapter(content)

  const path = await fetchChapterPathById(id)

  const { error } = await serviceClient
    .from("chapters")
    .update({ content } as never)
    .eq("id", id)

  if (error) {
    console.error("[updateChapterContent] error:", error.message)
    throw new Error(error.message)
  }

  updateTag("books-public")
  revalidatePath("/explore")
  if (path) revalidateChapterPage(path.bookSlug, path.chapterSlug)
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

  return withDataDeadline(8000, async () => {
  const idTerm = input.id?.trim()
  const wordTerm = input.word?.trim()
  const definitionTerm = input.definition?.trim()

  const hasCriteria = Boolean(idTerm || wordTerm || definitionTerm)
  if (!hasCriteria) return []

  if (idTerm && !/^-?\d+$/.test(idTerm)) return []
  if (idTerm && input.idExact && (!Number.isSafeInteger(Number(idTerm)) || Number(idTerm) < -2147483648 || Number(idTerm) > 2147483647)) return []
  const batches: (number[] | null)[] = []
  if (idTerm && !input.idExact) {
    const { matchingHansIds } = await import('@/app/lib/hansIdIndex')
    const ids = await matchingHansIds(idTerm)
    for (let offset = 0; offset < ids.length; offset += 200) batches.push(ids.slice(offset, offset + 200))
  } else batches.push(null)

  const results: HansWehrSearchResult[] = []
  for (const ids of batches) {
    let query = serviceClient.from('hanswehr_dictionary').select('id, word, definition').limit(100 - results.length)
    if (ids) query = query.in('id', ids)
    else if (idTerm) query = query.eq('id', Number(idTerm))
    if (wordTerm) query = input.wordExact ? query.eq('word', wordTerm) : query.ilike('word', `%${wordTerm}%`)
    if (definitionTerm) query = input.definitionExact ? query.eq('definition', definitionTerm) : query.ilike('definition', `%${definitionTerm}%`)
    const { data, error } = await query.order('id', { ascending: true })
    if (error) {
      console.error('[searchHansWehr] error:', error.message)
      throw new Error('Unable to search the dictionary. Please reload the page.')
    }
    results.push(...(data ?? []).map(row => ({id: Number(row.id), word: String(row.word), definition: String(row.definition ?? '')})))
    if (results.length >= 100) break
  }
  return results
  })
}

/* ── Phrases ───────────────────────────────────────────────────────── */

export type PhraseRow = {
  id: number
  phrase_ar_di: string
  phrase_tr: string
  english: string
  cefr: string
  notes: string | null
  word_glosses?: { arabic: string; english: string }[]
}

export async function fetchPhrasePageForAdmin(input: { page?: number; search?: string } = {}): Promise<{ phrases: PhraseRow[]; total: number }> {
  await guardAdmin()
  const { page, search } = z.object({
    page: z.number().int().min(0).max(100000).default(0),
    search: z.string().trim().max(200).default(''),
  }).strict().parse(input)
  let query = serviceClient.from('phrases')
    .select('id,phrase_ar_di,phrase_tr,english,cefr,notes,word_glosses', { count: 'exact' })
  // Quote PostgREST filter values; escape LIKE wildcards so search stays literal.
  if (search) {
    const pattern = JSON.stringify(`%${search.replace(/[\\%_]/g, '\\$&')}%`)
    const arabicSearch = search.normalize('NFKC').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/gu, '')
    const arabicPattern = JSON.stringify([...arabicSearch].map(character =>
      character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      (/[\u0621-\u064a]/u.test(character) ? '[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]*' : ''),
    ).join(''))
    query = query.or([`phrase_ar_di.imatch.${arabicPattern}`, ...['phrase_tr', 'english', 'cefr'].map(field => `${field}.ilike.${pattern}`)].join(','))
  }
  const { data, error, count } = await query.order('id').range(page * 50, page * 50 + 49)
  if (error) throw new Error('Unable to load the Phrase Library.')
  return { phrases: (data ?? []).map(mapPhraseRow), total: count ?? 0 }
}

export async function fetchAllPhrasesForAdmin(): Promise<PhraseRow[]> {
  await guardAdmin()

  const phrases: PhraseRow[] = []
  for (let offset=0; ; offset+=500) {
    const {data,error}=await serviceClient.from('phrases').select('id,phrase_ar_di,phrase_tr,english,cefr,notes').order('id').range(offset,offset+499)
    if(error)throw new Error('Unable to load the Phrase Library.')
    phrases.push(...(data ?? []).map(mapPhraseRow))
    if((data?.length ?? 0)<500)return phrases
  }
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
  id = z.number().int().positive().safe().parse(id)
  input = z.object({
    phrase_ar_di: z.string().trim().min(1).max(1000).optional(),
    phrase_tr: z.string().max(2000).optional(),
    english: z.string().trim().min(1).max(10000).optional(),
    cefr: z.string().max(20).optional(),
    notes: z.string().max(20000).nullable().optional(),
  }).strict().parse(input)

  const payload: Record<string, unknown> = {}
  if (input.phrase_ar_di !== undefined) payload.phrase_ar_di = input.phrase_ar_di
  if (input.phrase_tr !== undefined) payload.phrase_tr = input.phrase_tr
  if (input.english !== undefined) payload.english = input.english
  if (input.cefr !== undefined) payload.cefr = input.cefr
  if (input.notes !== undefined) payload.notes = input.notes

  const { error } = await serviceClient.rpc('website_write_phrase' as never, { p_id: id, p_fields: payload } as never)
  if (error) throw new Error('Unable to save this phrase. Check for an existing equivalent phrase and retry.')
  updateTag('phrases')
}

/* ── Helpers ───────────────────────────────────────────────────────── */

export interface BooksAdminIndex { books: BookRow[]; chapters: ChapterRow[] }
export interface ShowsAdminIndex { shows: ShowRow[]; episodes: EpisodeRow[] }

async function readAllAdminBookMetadata(): Promise<Record<string,unknown>[]> {
  const rows: Record<string,unknown>[]=[]
  for(let offset=0; ; offset+=500){
    const {data,error}=await serviceClient.from('books').select('id,slug,title,is_completed,author,reading_time_minutes,title_ar,description,cover,cover_crop,level,category,created_at,updated_at').order('title').order('id').range(offset,offset+499)
    if(error)throw new Error('Unable to load the book catalogue.')
    rows.push(...data ?? [])
    if((data?.length ?? 0)<500)return rows
  }
}

/** One authorization check; paginated metadata reads omit manuscripts. */
export async function fetchBooksIndexForAdmin(): Promise<BooksAdminIndex> {
  await guardAdmin()
  const [books, chapters] = await Promise.all([
    readAllAdminBookMetadata(),
    readAllAdminChapterMetadata(),
  ])
  return { books: books.map(mapBookRow), chapters: chapters.map(mapChapterRow) }
}

export async function fetchShowsIndexForAdmin(): Promise<ShowsAdminIndex> {
  await guardAdmin()
  const [shows, episodes] = await Promise.all([
    serviceClient.from('shows').select('id,slug,title,title_ar,description,cover,cover_crop,level,category').order('title').limit(1000),
    serviceClient.from('episodes').select('id,show_id,slug,title,level,tags,description,youtube_id,instagram_id,tiktok_id,facebook_id,cover,cover_crop,created_at').order('show_id').order('created_at').limit(1000),
  ])
  if (shows.error || episodes.error) throw new Error('Unable to load the show catalogue.')
  return { shows: (shows.data ?? []).map(row => mapShowRow(row)), episodes: (episodes.data ?? []).map(row => mapEpisodeRow(row)) }
}
