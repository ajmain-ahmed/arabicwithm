// app/prototype/_components/catalogueRows.ts — data for the prototype's
// Netflix-style homepage rows. Cached with the shared "cartoons-public" tag so
// admin show/episode writes (updateTag in app/actions/admin.ts) bust these
// caches along with the rest of the cartoon catalogue. revalidate: false →
// served from memory, no per-request DB queries.

import { unstable_cache } from "next/cache"
import { hasServiceClientConfig, serviceClient } from "@/app/lib/supabase"
import { normalizeThumbnailCrop, type ThumbnailCrop } from "@/app/lib/thumbnailCrop"

export interface NewOnShow {
  id: string
  slug: string
  title: string
  level: string
  category: string | null
  coverCrop: ThumbnailCrop
}

export interface NewOnEpisode {
  id: string
  slug: string
  title: string
  level: string
  showSlug: string
  showTitle: string
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
      coverCrop: normalizeThumbnailCrop(row.cover_crop),
    }))
  },
  ["prototype", "new-on-shows", "v1"],
  { revalidate: false, tags: ["cartoons-public"] }
)

export const fetchNewOnEpisodes = unstable_cache(
  async (): Promise<NewOnEpisode[]> => {
    if (!hasServiceClientConfig()) return []
    const withCrop = await serviceClient
      .from("episodes")
      .select("id, slug, title, level, show_id, cover_crop")
      .order("created_at", { ascending: false })
      .limit(12)
    const result = withCrop.error && /cover_crop/i.test(withCrop.error.message)
      ? await serviceClient
          .from("episodes")
          .select("id, slug, title, level, show_id")
          .order("created_at", { ascending: false })
          .limit(12)
      : withCrop
    const { data, error } = result
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
        coverCrop: normalizeThumbnailCrop(row.cover_crop),
      }
    })
  },
  ["prototype", "new-on-episodes", "v1"],
  { revalidate: false, tags: ["cartoons-public"] }
)
