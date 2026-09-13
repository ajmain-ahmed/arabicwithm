// app/prototype/_components/newOnShows.ts — "New on ArabicWithM" row data.
// Cached with the shared "cartoons-public" tag so admin show/episode writes
// (updateTag in app/actions/admin.ts) bust this cache along with the rest of
// the cartoon catalogue. revalidate: false → served from memory, no per-request
// DB queries.

import { unstable_cache } from "next/cache"
import { hasServiceClientConfig, serviceClient } from "@/app/lib/supabase"

export interface NewOnShow {
  id: string
  slug: string
  title: string
  level: string
  category: string | null
}

export const fetchNewOnShows = unstable_cache(
  async (): Promise<NewOnShow[]> => {
    if (!hasServiceClientConfig()) return []
    const { data, error } = await serviceClient
      .from("shows")
      .select("id, slug, title, level, category")
      .order("created_at", { ascending: false })
      .limit(12)
    if (error) {
      console.error("[fetchNewOnShows] error:", error)
      return []
    }
    return (data ?? []) as NewOnShow[]
  },
  ["prototype", "new-on-shows", "v1"],
  { revalidate: false, tags: ["cartoons-public"] }
)
