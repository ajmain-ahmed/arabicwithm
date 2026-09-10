'use server'

import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { fetchExploreEpisodeByIdPublic, fetchExploreEpisodeMetasForPublic } from '@/app/actions/cartoons'
import {
  fetchExploreBookChapterMetasForPublic,
  fetchExploreBookChapterPageCounts,
  fetchExploreBookChapterPages,
} from '@/app/actions/books'
import {
  buildExploreFeedPlan,
  sliceExploreFeedBatch,
  type ExploreFeedBatch,
  type ExploreFeedItem,
  type ExploreFeedPlanItem,
} from '@/app/lib/explore'

/* ── Explore feed batches ────────────────────────────────────────────
   Each (seed, page) is a small, separately cacheable entry rather than
   one blob holding every episode transcript and book page. Batch
   planning only uses episode/chapter ids plus per-chapter page counts;
   transcripts and chapter content are hydrated per item, only for the
   items the batch contains. Tagged with the catalogue tags so the
   existing admin revalidation already covers these entries. */

async function hydrateExplorePlanItem(item: ExploreFeedPlanItem): Promise<ExploreFeedItem | null> {
  if (item.kind === 'video') {
    const episode = await fetchExploreEpisodeByIdPublic(item.episodeId)
    return episode ? { kind: 'video', episode } : null
  }
  const pages = await fetchExploreBookChapterPages(item.chapterId)
  const page = pages[item.pageIndex]
  return page ? { kind: 'book', page } : null
}

const fetchExploreFeedBatch = unstable_cache(
  async (seed: string, page: number): Promise<ExploreFeedBatch> => {
    const [episodeMetas, bookChapterMetas, bookPageCounts] = await Promise.all([
      fetchExploreEpisodeMetasForPublic(),
      fetchExploreBookChapterMetasForPublic(),
      fetchExploreBookChapterPageCounts(),
    ])
    const plan = buildExploreFeedPlan(episodeMetas, bookChapterMetas, bookPageCounts, seed)
    const batch = sliceExploreFeedBatch(plan, page)
    const items = (await Promise.all(batch.items.map(hydrateExplorePlanItem))).filter(
      (item): item is ExploreFeedItem => item !== null,
    )
    return { items, hasMore: batch.hasMore }
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
