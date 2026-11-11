// Data for the homepage's Netflix-style "New on" rows. Cached with the shared
// "cartoons-public" tag so admin show/episode writes (updateTag in
// app/actions/admin.ts) bust these caches along with the rest of the cartoon
// catalogue. Production: no per-request DB queries. Dev: re-fetch every 60s
// so live-site edits surface without clearing .next.

import { unstable_cache } from "next/cache"
import { hasServiceClientConfig, serviceClient } from "@/app/lib/supabase"
import { normalizeThumbnailCrop, type ThumbnailCrop } from "@/app/lib/thumbnailCrop"
import { catalogueCoverUrl } from '@/app/lib/catalogueCoverUrl'

/* Dev refreshes these rows every 60s; production relies on updateTag only. */
const publicRevalidate = process.env.NODE_ENV === "development" ? 60 : false

export interface NewOnShow {
  id: string
  slug: string
  title: string
  level: string
  category: string | null
  cover?: string
  coverCrop: ThumbnailCrop
}

export interface NewOnEpisode {
  id: string
  slug: string
  title: string
  level: string
  showSlug: string
  showTitle: string
  cover?: string
  coverCrop: ThumbnailCrop
}

export const fetchNewOnShows = unstable_cache(
  async (): Promise<NewOnShow[]> => {
    if (!hasServiceClientConfig()) return []
    const { data, error } = await serviceClient
      .from("shows")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12)
    if (error) {
      console.error("[fetchNewOnShows] error:", error)
      return []
    }
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      level: String(row.level ?? ""),
      category: row.category ? String(row.category) : null,
      cover: catalogueCoverUrl({ kind: 'shows', id: String(row.id), slug: String(row.slug), cover: row.cover }),
      coverCrop: normalizeThumbnailCrop(row.cover_crop),
    }))
  },
  ["prototype", "new-on-shows", "v2-direct-covers"],
  { revalidate: publicRevalidate, tags: ["cartoons-public"] }
)

export const fetchNewOnEpisodes = unstable_cache(
  async (): Promise<NewOnEpisode[]> => {
    if (!hasServiceClientConfig()) return []
    const { data, error } = await serviceClient
      .from("episodes")
      .select("id, slug, title, level, show_id, cover, cover_crop")
      .not("transcript", "is", null)
      .not("transcript", "eq", "[]")
      .order("created_at", { ascending: false })
      .limit(12)

    if (error) {
      console.error("[fetchNewOnEpisodes] error:", error)
      return []
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>
    if (rows.length === 0) return []

    const showIds = Array.from(new Set(rows.map((row) => String(row.show_id))))
    const { data: shows } = await serviceClient.from("shows").select("id, slug, title").in("id", showIds)
    const showById = new Map(
      ((shows ?? []) as Array<Record<string, unknown>>).map((show) => [
        String(show.id),
        { slug: String(show.slug), title: String(show.title) },
      ])
    )

    return rows.map((row) => {
      const show = showById.get(String(row.show_id))
      return {
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title),
        level: String(row.level ?? ""),
        showSlug: show?.slug ?? "",
        showTitle: show?.title ?? "",
        cover: catalogueCoverUrl({ kind: 'episodes', id: String(row.id), slug: String(row.slug), cover: row.cover }),
        coverCrop: normalizeThumbnailCrop(row.cover_crop),
      }
    })
  },
  ["prototype", "new-on-episodes", "v2-direct-covers"],
  { revalidate: publicRevalidate, tags: ["cartoons-public"] }
)
