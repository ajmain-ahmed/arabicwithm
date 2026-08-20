"use server"

import { existsSync } from "node:fs"
import path from "node:path"
import { unstable_cache } from "next/cache"
import { serviceClient, hasServiceClientConfig } from "@/app/lib/supabase"
import {
  type ShowMeta,
  type EpisodeMeta,
  type EpisodeFull,
  type CartoonWordEntry,
  type VocabListItem,
  type GrammarPoint,
  type NewTranscript,
  type ExploreEpisode,
  isNewTranscript,
  normalizeNewTranscript,
  getShowCoverPath,
  getEpisodeCoverPath,
  getYouTubeThumbnailUrl,
  normalizeYouTubeId,
  normalizeInstagramId,
  normalizeTikTokId,
  normalizeFacebookId,
  getEpisodeVideoSources,
  canonicalizeCartoonCategory,
} from "@/app/lib/cartoons"
import { type ShowRow } from "@/app/actions/admin"
import { guardAdmin } from "@/app/actions/auth"
import { stripDiacritics } from "@/app/lib/arabic"

function uniqueTags(values: Array<string | null | undefined>): string[] {
  const tags = new Map<string, string>()
  for (const value of values) {
    const tag = canonicalizeCartoonCategory(value)
    if (!tag) continue
    tags.set(tag.toLowerCase(), tag)
  }
  return Array.from(tags.values())
}

function episodeCover(showSlug: string, episodeSlug: string, youtubeId?: string, storedCover?: string): string | undefined {
  const preferredCover = getEpisodeCoverPath(showSlug, episodeSlug)
  const baseCover = preferredCover.replace(/\.avif$/, "")
  for (const extension of ["avif", "webp", "png", "jpg", "jpeg"]) {
    const localCover = `${baseCover}.${extension}`
    const absoluteCover = path.join(process.cwd(), "public", localCover.replace(/^\//, ""))
    if (existsSync(absoluteCover)) return localCover
  }
  return getYouTubeThumbnailUrl(youtubeId) ?? (/^https:\/\//i.test(storedCover ?? "") ? storedCover : undefined)
}

function isMissingSocialVideoColumn(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error &&
    (error.code === "42703" || error.code === "PGRST204") &&
    /(?:instagram_id|tiktok_id|facebook_id)/i.test(error.message ?? "")
  )
}

/* ── Shows ─────────────────────────────────────────────────────────── */

export const fetchShowsForPublic = unstable_cache(
  async (): Promise<ShowMeta[]> => {
    if (!hasServiceClientConfig()) {
      console.warn("[fetchShowsForPublic] Supabase service client not configured")
      return []
    }

    const { data: shows, error } = await serviceClient
      .from("shows")
      .select("id, slug, title, title_ar, description, level, category")
      .order("title", { ascending: true })

    if (error) {
      console.error("[fetchShowsForPublic] error:", error.message)
      throw new Error(error.message)
    }

    // Count episodes per show in one query.
    const { data: episodes, error: epError } = await serviceClient
      .from("episodes")
      .select("show_id, tags")

    if (epError) {
      console.error("[fetchShowsForPublic] episodes error:", epError.message)
      throw new Error(epError.message)
    }

    const counts = new Map<string, number>()
    const tagsByShow = new Map<string, string[]>()
    for (const ep of episodes ?? []) {
      const id = String(ep.show_id)
      counts.set(id, (counts.get(id) ?? 0) + 1)
      const episodeTags = Array.isArray(ep.tags) ? ep.tags.map((tag) => String(tag)) : []
      tagsByShow.set(id, [...(tagsByShow.get(id) ?? []), ...episodeTags])
    }

    return (shows ?? []).map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      titleAr: row.title_ar ? String(row.title_ar) : undefined,
      description: row.description ? String(row.description) : undefined,
      cover: getShowCoverPath(String(row.slug)),
      level: String(row.level ?? ""),
      category: row.category ? String(row.category) : undefined,
      tags: uniqueTags([
        row.category ? String(row.category) : undefined,
        ...(tagsByShow.get(String(row.id)) ?? []),
      ]),
      episodeCount: counts.get(String(row.id)) ?? 0,
    }))
  },
  ["cartoons", "shows", "public"],
  { revalidate: 300, tags: ["cartoons-public"] }
)

export async function fetchShowsForEpisodeEdit(): Promise<ShowRow[]> {
  await guardAdmin()

  const { data, error } = await serviceClient
    .from("shows")
    .select("id, slug, title, title_ar, description, cover, level, category")
    .order("title", { ascending: true })

  if (error) {
    console.error("[fetchShowsForEpisodeEdit] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    title_ar: row.title_ar ? String(row.title_ar) : null,
    description: row.description ? String(row.description) : null,
    cover: row.cover ? String(row.cover) : null,
    level: String(row.level ?? ""),
    category: row.category ? String(row.category) : null,
  }))
}

export const fetchShowBySlugPublic = unstable_cache(
  async (slug: string): Promise<ShowMeta | null> => {
    if (!hasServiceClientConfig()) {
      console.warn("[fetchShowBySlugPublic] Supabase service client not configured")
      return null
    }

    const { data, error } = await serviceClient
      .from("shows")
      .select("id, slug, title, title_ar, description, level, category")
      .eq("slug", slug)
      .limit(1)
      .single()

    if (error || !data) return null

    const { data: episodes } = await serviceClient
      .from("episodes")
      .select("id, tags")
      .eq("show_id", data.id)

    return {
      id: String(data.id),
      slug: String(data.slug),
      title: String(data.title),
      titleAr: data.title_ar ? String(data.title_ar) : undefined,
      description: data.description ? String(data.description) : undefined,
      cover: getShowCoverPath(String(data.slug)),
      level: String(data.level ?? ""),
      category: data.category ? String(data.category) : undefined,
      tags: uniqueTags([
        data.category ? String(data.category) : undefined,
        ...(episodes ?? []).flatMap((episode) =>
          Array.isArray(episode.tags) ? episode.tags.map((tag) => String(tag)) : []
        ),
      ]),
      episodeCount: episodes?.length ?? 0,
    }
  },
  ["cartoons", "show"],
  { revalidate: 300, tags: ["cartoons-public"] }
)

/* ── Episodes ──────────────────────────────────────────────────────── */

export const fetchEpisodesForShowPublic = unstable_cache(
  async (showSlug: string): Promise<EpisodeMeta[]> => {
    if (!hasServiceClientConfig()) {
      console.warn("[fetchEpisodesForShowPublic] Supabase service client not configured")
      return []
    }

    const { data: show, error: showError } = await serviceClient
      .from("shows")
      .select("id, slug")
      .eq("slug", showSlug)
      .limit(1)
      .single()

    if (showError || !show) {
      console.error("[fetchEpisodesForShowPublic] show error:", showError?.message)
      return []
    }

    const withSocial = await serviceClient
      .from("episodes")
      .select("id, slug, title, level, tags, description, youtube_id, instagram_id, tiktok_id, facebook_id, cover")
      .eq("show_id", show.id)
      .order("created_at", { ascending: true })

    const fallback = isMissingSocialVideoColumn(withSocial.error)
      ? await serviceClient
          .from("episodes")
          .select("id, slug, title, level, tags, description, youtube_id, cover")
          .eq("show_id", show.id)
          .order("created_at", { ascending: true })
      : null
    const data = (fallback?.data ?? withSocial.data) as unknown as Record<string, unknown>[] | null
    const error = fallback ? fallback.error : withSocial.error

    if (error) {
      console.error("[fetchEpisodesForShowPublic] error:", error.message)
      throw new Error(error.message)
    }

    return (data ?? []).map((row) => mapEpisodeRow(row, showSlug))
  },
  ["cartoons", "episodes"],
  { revalidate: 300, tags: ["cartoons-public"] }
)

export const fetchEpisodeForPublic = unstable_cache(
  async (
    showSlug: string,
    episodeSlug: string
  ): Promise<EpisodeFull | null> => {
    if (!hasServiceClientConfig()) {
      console.warn("[fetchEpisodeForPublic] Supabase service client not configured")
      return null
    }

    const { data: show, error: showError } = await serviceClient
      .from("shows")
      .select("id, slug, title")
      .eq("slug", showSlug)
      .limit(1)
      .single()

    if (showError || !show) {
      console.error("[fetchEpisodeForPublic] show error:", showError?.message)
      return null
    }

    const withSocial = await serviceClient
      .from("episodes")
      .select("id, slug, title, level, tags, description, youtube_id, instagram_id, tiktok_id, facebook_id, cover, transcript")
      .eq("show_id", show.id)
      .eq("slug", episodeSlug)
      .limit(1)
      .single()

    const fallback = isMissingSocialVideoColumn(withSocial.error)
      ? await serviceClient
          .from("episodes")
          .select("id, slug, title, level, tags, description, youtube_id, cover, transcript")
          .eq("show_id", show.id)
          .eq("slug", episodeSlug)
          .limit(1)
          .single()
      : null
    const data = (fallback?.data ?? withSocial.data) as unknown as Record<string, unknown> | null
    const error = fallback ? fallback.error : withSocial.error

    if (error || !data) {
      console.error("[fetchEpisodeForPublic] error:", error?.message)
      return null
    }

    const meta = mapEpisodeRow(data)
    const transcript = data.transcript ?? {}

    const isNew = isNewTranscript(transcript)

    let rawScriptBlocks: Record<string, unknown>[] = []
    let vocabList: Record<string, unknown>[] = []
    let grammarPoints: Record<string, unknown>[] = []

    if (isNew) {
      const normalized = normalizeNewTranscript(transcript)
      rawScriptBlocks = normalized.scriptBlocks as unknown as Record<string, unknown>[]
      vocabList = normalized.vocabList as unknown as Record<string, unknown>[]
      grammarPoints = []
    } else {
      const legacyTranscript = transcript as Record<string, unknown>
      rawScriptBlocks = Array.isArray(legacyTranscript.scriptBlocks)
        ? legacyTranscript.scriptBlocks
        : []
      vocabList = Array.isArray(legacyTranscript.vocabList)
        ? legacyTranscript.vocabList
        : []
      grammarPoints = Array.isArray(legacyTranscript.grammarPoints)
        ? legacyTranscript.grammarPoints
        : []
    }

    const wordMap: Record<string, CartoonWordEntry> = {}
    const diacritizedMap: Record<string, CartoonWordEntry> = {}

    const enrichWord = (w: Record<string, unknown>): CartoonWordEntry => {
      const arabic = String(w.arabic ?? '')
      const plain = String(w.plain ?? stripDiacritics(arabic))
      const lemma = typeof w.lemma === 'string' ? w.lemma.trim() : ''
      const entry: CartoonWordEntry = {
        arabic,
        plain,
        transliteration: String(w.transliteration ?? ''),
        english: String(w.english ?? ''),
        pos: typeof w.pos === 'string' ? w.pos : undefined,
        root: typeof w.root === 'string' ? w.root : undefined,
        lemma: lemma || arabic,
      }
      const cefrRaw = typeof w.cefr === 'string' ? w.cefr.trim() : typeof w.CEFR === 'string' ? w.CEFR.trim() : ''
      if (cefrRaw) entry.cefr = cefrRaw.toLowerCase()
      return entry
    }

    const enrichGrammarPoint = (row: Record<string, unknown>): GrammarPoint => ({
      number: Number(row.number ?? 0),
      pattern: String(row.pattern ?? ''),
      explanation: String(row.explanation ?? ''),
      example: String(row.example ?? ''),
    })

    const scriptBlocks: EpisodeFull["scriptBlocks"] = []
    for (const block of rawScriptBlocks) {
      const b = block as Record<string, unknown>
      const enrichedWords: CartoonWordEntry[] = []
      const words = b.words
      if (Array.isArray(words)) {
        for (const w of words) {
          const enriched = enrichWord(w as Record<string, unknown>)
          enrichedWords.push(enriched)
          if (enriched.plain) wordMap[enriched.plain] = enriched
          if (enriched.arabic) diacritizedMap[enriched.arabic] = enriched
        }
      }

      scriptBlocks.push({
        timestamp: b.timestamp == null ? null : Number(b.timestamp),
        title: String(b.title ?? ''),
        arabicDiacritic: String(b.arabicDiacritic ?? ''),
        arabicPlain: String(b.arabicPlain ?? ''),
        english: String(b.english ?? ''),
        words: enrichedWords,
        notes: Array.isArray(b.notes)
          ? b.notes.map((n) => String(n ?? '')).filter(Boolean)
          : [],
      })
    }

    // Vocab list is already populated from the transcript; no external lookup needed.
    const enrichedVocabList: EpisodeFull["vocabList"] = vocabList.map((row) => {
      const item: VocabListItem = {
        number: Number(row.number ?? 0),
        arabic: String(row.arabic ?? ''),
        transliteration: String(row.transliteration ?? ''),
        english: String(row.english ?? ''),
      }
      const cefr = typeof row.cefr === 'string' ? row.cefr.trim().toLowerCase() : ''
      if (cefr) item.cefr = cefr
      return item
    })

    return {
      ...meta,
      id: String(data.id),
      show: String(show.slug),
      show_id: String(show.id),
      scriptBlocks,
      vocabList: enrichedVocabList,
      grammarPoints: grammarPoints.map(enrichGrammarPoint),
      transcript: transcript as Record<string, unknown> | NewTranscript | undefined,
      transcriptFormat: isNew ? 'new' : 'legacy',
      wordMap,
      diacritizedMap,
    }
  },
  ["cartoons", "episode"],
  { revalidate: 300, tags: ["cartoons-public"] }
)

export const fetchEpisodesForExplorePublic = unstable_cache(
  async (): Promise<ExploreEpisode[]> => {
    if (!hasServiceClientConfig()) {
      console.warn("[fetchEpisodesForExplorePublic] Supabase service client not configured")
      return []
    }

    const [showResult, socialEpisodeResult] = await Promise.all([
      serviceClient.from("shows").select("id, slug, title"),
      serviceClient
        .from("episodes")
        .select("id, show_id, slug, title, level, tags, description, youtube_id, instagram_id, tiktok_id, facebook_id, cover, transcript")
        .order("created_at", { ascending: true }),
    ])

    const legacyEpisodeResult = isMissingSocialVideoColumn(socialEpisodeResult.error)
      ? await serviceClient
          .from("episodes")
          .select("id, show_id, slug, title, level, tags, description, youtube_id, cover, transcript")
          .order("created_at", { ascending: true })
      : null
    const shows = showResult.data
    const showError = showResult.error
    const episodes = (legacyEpisodeResult?.data ?? socialEpisodeResult.data) as unknown as Record<string, unknown>[] | null
    const episodeError = legacyEpisodeResult ? legacyEpisodeResult.error : socialEpisodeResult.error

    if (showError || episodeError) {
      const message = showError?.message ?? episodeError?.message ?? "Unable to load Explore episodes"
      console.error("[fetchEpisodesForExplorePublic] error:", message)
      throw new Error(message)
    }

    const showsById = new Map(
      (shows ?? []).map((show) => [
        String(show.id),
        { slug: String(show.slug), title: String(show.title) },
      ])
    )

    return (episodes ?? []).flatMap((row) => {
      const show = showsById.get(String(row.show_id))
      const meta = mapEpisodeRow(row, show?.slug)
      if (!show || getEpisodeVideoSources(meta).length === 0) return []

      const transcript = row.transcript as unknown
      const normalizedBlocks = isNewTranscript(transcript)
        ? normalizeNewTranscript(transcript).scriptBlocks
        : Array.isArray((transcript as Record<string, unknown> | null)?.scriptBlocks)
          ? ((transcript as Record<string, unknown>).scriptBlocks as Record<string, unknown>[]).map((block) => ({
              timestamp: block.timestamp == null ? null : Number(block.timestamp),
              title: String(block.title ?? ""),
              arabicDiacritic: String(block.arabicDiacritic ?? ""),
              arabicPlain: String(block.arabicPlain ?? ""),
              english: String(block.english ?? ""),
              words: [],
              notes: [],
            }))
          : []

      return [{
        ...meta,
        showSlug: show.slug,
        showTitle: show.title,
        transcriptLines: normalizedBlocks.map((block) => ({
          timestamp: block.timestamp,
          arabic: block.arabicDiacritic,
          arabicPlain: block.arabicPlain,
          translation: block.english || block.title,
          words: block.words,
        })),
      }]
    })
  },
  ["cartoons", "explore"],
  { revalidate: 300, tags: ["cartoons-public"] }
)

function mapEpisodeRow(
  row: Record<string, unknown>,
  showSlug?: string
): EpisodeMeta {
  const episodeSlug = String(row.slug)
  const youtubeId = normalizeYouTubeId(row.youtube_id ? String(row.youtube_id) : undefined)
  const instagramId = normalizeInstagramId(row.instagram_id ? String(row.instagram_id) : undefined)
  const tiktokId = normalizeTikTokId(row.tiktok_id ? String(row.tiktok_id) : undefined)
  const facebookId = normalizeFacebookId(row.facebook_id ? String(row.facebook_id) : undefined)
  const storedCover = row.cover ? String(row.cover) : undefined
  const cover = showSlug != null ? episodeCover(showSlug, episodeSlug, youtubeId, storedCover) : storedCover

  return {
    id: String(row.id),
    slug: episodeSlug,
    title: String(row.title),
    level: String(row.level ?? ""),
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t)) : [],
    description: row.description ? String(row.description) : undefined,
    youtubeId,
    instagramId,
    tiktokId,
    facebookId,
    cover,
  }
}
