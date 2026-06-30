"use server"

import fs from "fs"
import path from "path"
import { serviceClient } from "@/app/lib/supabase"
import {
  type ShowMeta,
  type EpisodeMeta,
  type EpisodeFull,
  type CartoonWordEntry,
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

/* ── Shows ─────────────────────────────────────────────────────────── */

export async function fetchShowsForPublic(): Promise<ShowMeta[]> {
  const { data: shows, error } = await serviceClient
    .from("shows")
    .select("id, slug, title, title_ar, description, cover, level, order, category, genre")
    .order("order", { ascending: true })

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
    order: row.order ? Number(row.order) : undefined,
    category: row.category ? String(row.category) : undefined,
    genre: row.genre ? String(row.genre) : undefined,
    episodeCount: counts.get(String(row.id)) ?? 0,
  }))
}

export async function fetchShowsForEpisodeEdit(): Promise<ShowRow[]> {
  const { data, error } = await serviceClient
    .from("shows")
    .select("id, slug, title, title_ar, description, cover, level, order, category, genre")
    .order("order", { ascending: true })

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
    order: Number(row.order) || 0,
    category: row.category ? String(row.category) : null,
    genre: row.genre ? String(row.genre) : null,
  }))
}

export async function fetchShowBySlugPublic(slug: string): Promise<ShowMeta | null> {
  const { data, error } = await serviceClient
    .from("shows")
    .select("id, slug, title, title_ar, description, cover, level, order, category, genre")
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
    order: data.order ? Number(data.order) : undefined,
    category: data.category ? String(data.category) : undefined,
    genre: data.genre ? String(data.genre) : undefined,
    episodeCount: count ?? 0,
  }
}

/* ── Episodes ──────────────────────────────────────────────────────── */

export async function fetchEpisodesForShowPublic(showSlug: string): Promise<EpisodeMeta[]> {
  const { data: show, error: showError } = await serviceClient
    .from("shows")
    .select("id")
    .eq("slug", showSlug)
    .limit(1)
    .single()

  if (showError || !show) {
    console.error("[fetchEpisodesForShowPublic] show error:", showError?.message)
    return []
  }

  const { data, error } = await serviceClient
    .from("episodes")
    .select("id, slug, title, level, tags, description, youtube_id, youtube_short, episode_number")
    .eq("show_id", show.id)
    .order("episode_number", { ascending: true })

  if (error) {
    console.error("[fetchEpisodesForShowPublic] error:", error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map(mapEpisodeRow)
}

export async function fetchEpisodeForPublic(
  showSlug: string,
  episodeSlug: string
): Promise<EpisodeFull | null> {
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
    .select("id, slug, title, level, tags, description, youtube_id, youtube_short, episode_number, transcript")
    .eq("show_id", show.id)
    .eq("slug", episodeSlug)
    .limit(1)
    .single()

  if (error || !data) {
    console.error("[fetchEpisodeForPublic] error:", error?.message)
    return null
  }

  const meta = mapEpisodeRow(data)
  const transcript = (data.transcript ?? {}) as Record<string, unknown>
  const scriptBlocks = Array.isArray(transcript.scriptBlocks) ? transcript.scriptBlocks : []
  const vocabList = Array.isArray(transcript.vocabList) ? transcript.vocabList : []
  const grammarPoints = Array.isArray(transcript.grammarPoints) ? transcript.grammarPoints : []

  const wordMap: Record<string, CartoonWordEntry> = {}
  const diacritizedMap: Record<string, CartoonWordEntry> = {}

  for (const block of scriptBlocks) {
    const words = (block as Record<string, unknown>).words
    if (!Array.isArray(words)) continue
    for (const w of words) {
      const word = w as Record<string, string>
      const entry: CartoonWordEntry = {
        db: word.db ?? undefined,
        arabic: word.arabic ?? "",
        plain: word.plain ?? stripDiacritics(word.arabic ?? ""),
        transliteration: word.transliteration ?? "",
        english: word.english ?? "",
        cefr: word.cefr ?? "",
      }
      if (entry.plain) wordMap[entry.plain] = entry
      if (entry.arabic) diacritizedMap[entry.arabic] = entry
    }
  }

  return {
    ...meta,
    id: String(data.id),
    show: String(show.slug),
    show_id: String(show.id),
    scriptBlocks: scriptBlocks as EpisodeFull["scriptBlocks"],
    vocabList: vocabList as EpisodeFull["vocabList"],
    grammarPoints: grammarPoints as EpisodeFull["grammarPoints"],
    wordMap,
    diacritizedMap,
  }
}

function mapEpisodeRow(row: Record<string, unknown>): EpisodeMeta {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    episode: Number(row.episode_number) || 0,
    level: String(row.level ?? ""),
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t)) : [],
    description: row.description ? String(row.description) : undefined,
    youtubeId: row.youtube_id ? String(row.youtube_id) : undefined,
    youtubeShort: Boolean(row.youtube_short),
  }
}
