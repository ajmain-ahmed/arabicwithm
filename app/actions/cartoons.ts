"use server"

import fs from "fs"
import path from "path"
import { unstable_cache } from "next/cache"
import { serviceClient } from "@/app/lib/supabase"
import {
  type ShowMeta,
  type EpisodeMeta,
  type EpisodeFull,
  type CartoonWordEntry,
  type VocabListItem,
  isNewTranscript,
  normalizeNewTranscript,
} from "@/app/lib/cartoons"
import { type ShowRow } from "@/app/actions/admin"
import { stripDiacritics } from "@/app/lib/arabic"

function normalizeShowCover(cover: string | null, slug: string): string {
  let candidate = (cover ?? "").trim()

  // Some stored cover values omit the leading slash; ensure one is present
  // so they resolve against the public directory.
  if (candidate && !candidate.startsWith("/") && !candidate.startsWith("http")) {
    candidate = `/${candidate}`
  }

  // Legacy data imported from the filesystem used /assets/cartoons/... paths,
  // but the public files live under /cartoons/... Fix that prefix.
  if (candidate.startsWith("/assets/cartoons/")) {
    candidate = candidate.replace("/assets/cartoons/", "/cartoons/")
  }

  if (!candidate) {
    candidate = `/cartoons/${slug}/${slug}_cover.avif`
  }

  const publicPath = path.join(process.cwd(), "public", candidate)
  if (fs.existsSync(publicPath)) return candidate

  // Try common alternative extensions if the stored extension is wrong.
  const base = candidate.replace(/\.[^./]+$/, "")
  for (const ext of [".avif", ".jpg", ".jpeg", ".png", ".webp"]) {
    const alt = `${base}${ext}`
    if (fs.existsSync(path.join(process.cwd(), "public", alt))) return alt
  }

  // Fallback for TMNT which uses _cover.avif.
  const fallback = `/cartoons/${slug}/_cover.avif`
  if (fs.existsSync(path.join(process.cwd(), "public", fallback))) return fallback

  return candidate
}

function normalizeEpisodeCover(
  cover: string | null,
  showSlug: string,
  episodeSlug: string,
  showCover?: string
): string {
  let candidate = (cover ?? "").trim()

  // Normalize relative paths to be absolute against the public directory.
  if (candidate && !candidate.startsWith("/") && !candidate.startsWith("http")) {
    candidate = `/${candidate}`
  }

  // Rewrite legacy /assets/cartoons/ prefix.
  if (candidate.startsWith("/assets/cartoons/")) {
    candidate = candidate.replace("/assets/cartoons/", "/cartoons/")
  }

  // If no stored cover, fall back to the episode-specific image generated from slugs.
  if (!candidate) {
    candidate = `/cartoons/${showSlug}/${episodeSlug}.avif`
  }

  // If the resolved file exists on disk, return it.
  const publicPath = path.join(process.cwd(), "public", candidate)
  if (fs.existsSync(publicPath)) return candidate

  // Try common alternative extensions.
  const base = candidate.replace(/\.[^./]+$/, "")
  for (const ext of [".avif", ".jpg", ".jpeg", ".png", ".webp"]) {
    const alt = `${base}${ext}`
    if (fs.existsSync(path.join(process.cwd(), "public", alt))) return alt
  }

  // Last resort: use the show cover if we have it.
  if (showCover) return showCover

  return candidate
}

/* ── Shows ─────────────────────────────────────────────────────────── */

export const fetchShowsForPublic = unstable_cache(
  async (): Promise<ShowMeta[]> => {
    const { data: shows, error } = await serviceClient
      .from("shows")
      .select("id, slug, title, title_ar, description, cover, level, category")
      .order("title", { ascending: true })

    if (error) {
      console.error("[fetchShowsForPublic] error:", error.message)
      throw new Error(error.message)
    }

    // Count episodes per show in one query.
    const { data: episodes, error: epError } = await serviceClient
      .from("episodes")
      .select("show_id")

    if (epError) {
      console.error("[fetchShowsForPublic] episodes error:", epError.message)
      throw new Error(epError.message)
    }

    const counts = new Map<string, number>()
    for (const ep of episodes ?? []) {
      const id = String(ep.show_id)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }

    return (shows ?? []).map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      titleAr: row.title_ar ? String(row.title_ar) : undefined,
      description: row.description ? String(row.description) : undefined,
      cover: normalizeShowCover(row.cover ? String(row.cover) : null, String(row.slug)),
      level: String(row.level ?? ""),
      category: row.category ? String(row.category) : undefined,
      episodeCount: counts.get(String(row.id)) ?? 0,
    }))
  },
  ["cartoons", "shows", "public"],
  { revalidate: 300 }
)

export async function fetchShowsForEpisodeEdit(): Promise<ShowRow[]> {
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
    const { data, error } = await serviceClient
      .from("shows")
      .select("id, slug, title, title_ar, description, cover, level, category")
      .eq("slug", slug)
      .limit(1)
      .single()

    if (error || !data) return null

    const { count } = await serviceClient
      .from("episodes")
      .select("id", { count: "exact", head: true })
      .eq("show_id", data.id)

    return {
      id: String(data.id),
      slug: String(data.slug),
      title: String(data.title),
      titleAr: data.title_ar ? String(data.title_ar) : undefined,
      description: data.description ? String(data.description) : undefined,
      cover: normalizeShowCover(data.cover ? String(data.cover) : null, String(data.slug)),
      level: String(data.level ?? ""),
      category: data.category ? String(data.category) : undefined,
      episodeCount: count ?? 0,
    }
  },
  ["cartoons", "show"],
  { revalidate: 300 }
)

/* ── Episodes ──────────────────────────────────────────────────────── */

export const fetchEpisodesForShowPublic = unstable_cache(
  async (showSlug: string): Promise<EpisodeMeta[]> => {
    const { data: show, error: showError } = await serviceClient
      .from("shows")
      .select("id, slug, cover")
      .eq("slug", showSlug)
      .limit(1)
      .single()

    if (showError || !show) {
      console.error("[fetchEpisodesForShowPublic] show error:", showError?.message)
      return []
    }

    const { data, error } = await serviceClient
      .from("episodes")
      .select("id, slug, title, level, tags, description, youtube_id, cover")
      .eq("show_id", show.id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[fetchEpisodesForShowPublic] error:", error.message)
      throw new Error(error.message)
    }

    const normalizedShowCover = normalizeShowCover(show.cover ? String(show.cover) : null, showSlug)

    return (data ?? []).map((row) =>
      mapEpisodeRow(row, showSlug, normalizedShowCover)
    )
  },
  ["cartoons", "episodes"],
  { revalidate: 300 }
)

export const fetchEpisodeForPublic = unstable_cache(
  async (
    showSlug: string,
    episodeSlug: string
  ): Promise<EpisodeFull | null> => {
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

    const { data, error } = await serviceClient
      .from("episodes")
      .select("id, slug, title, level, tags, description, youtube_id, transcript")
      .eq("show_id", show.id)
      .eq("slug", episodeSlug)
      .limit(1)
      .single()

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
      grammarPoints: grammarPoints as unknown as EpisodeFull["grammarPoints"],
      transcript,
      transcriptFormat: isNew ? 'new' : 'legacy',
      wordMap,
      diacritizedMap,
    }
  },
  ["cartoons", "episode"],
  { revalidate: 300 }
)

function mapEpisodeRow(
  row: Record<string, unknown>,
  showSlug?: string,
  showCover?: string
): EpisodeMeta {
  const episodeSlug = String(row.slug)
  const storedCover = row.cover ? String(row.cover) : null
  const cover =
    showSlug != null
      ? normalizeEpisodeCover(storedCover, showSlug, episodeSlug, showCover)
      : storedCover ?? undefined

  return {
    id: String(row.id),
    slug: episodeSlug,
    title: String(row.title),
    level: String(row.level ?? ""),
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t)) : [],
    description: row.description ? String(row.description) : undefined,
    youtubeId: row.youtube_id ? String(row.youtube_id) : undefined,
    cover,
  }
}
