'use server'

import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { fetchEpisodesForExplorePublic } from '@/app/actions/cartoons'
import { fetchBookPagesForExplorePublic } from '@/app/actions/books'
import {
  buildExploreFeedItems,
  sliceExploreFeedBatch,
  type ExploreFeedBatch,
} from '@/app/lib/explore'

/* ── Explore feed batches ────────────────────────────────────────────
   Each (seed, page) is a small, separately cacheable entry rather than
   one blob holding every episode transcript and book page. Tagged with
   the catalogue tags so the existing admin revalidation already covers
   these entries. */

const fetchExploreFeedBatch = unstable_cache(
  async (seed: string, page: number): Promise<ExploreFeedBatch> => {
    const [episodes, bookPages] = await Promise.all([
      fetchEpisodesForExplorePublic(),
      fetchBookPagesForExplorePublic(),
    ])
    return sliceExploreFeedBatch(buildExploreFeedItems(episodes, bookPages, seed), page)
  },
  ['explore', 'feed', 'v1'],
  { revalidate: false, tags: ['cartoons-public', 'books-public', 'explore-public'] }
)

const batchInputSchema = z.object({
  seed: z.string().trim().min(1).max(64),
  page: z.number().int().min(0).max(500),
})

export async function fetchExploreFeedPage(seed: string, page: number): Promise<ExploreFeedBatch> {
  const parsed = batchInputSchema.safeParse({ seed, page })
  if (!parsed.success) return { items: [], hasMore: false }
  return fetchExploreFeedBatch(parsed.data.seed, parsed.data.page)
}
