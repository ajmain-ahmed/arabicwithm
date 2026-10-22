'use server'

import { z } from 'zod'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { fetchExploreEpisodeMetasForPublic, fetchExploreEpisodesByIdsPublic } from '@/app/actions/cartoons'
import {
  fetchExploreBookChapterMetasForPublic,
  fetchExploreBookChapterPageCounts,
  fetchExploreBookChapterPagesByChapterIds,
} from '@/app/actions/books'
import {
  buildExploreFeedPlan,
  sliceExploreFeedBatch,
  type ExploreFeedBatch,
  type ExploreFeedItem,
  type ExploreFeedPlanItem,
} from '@/app/lib/explore'

// Catalogue reads are cached; unique per-visit feed batches are not. Two
// batched queries hydrate a whole page instead of one query per item.
async function hydrateExplorePlanItems(planItems: ExploreFeedPlanItem[]): Promise<ExploreFeedItem[]> {
  const [episodeById, pagesByChapter] = await Promise.all([
    fetchExploreEpisodesByIdsPublic(planItems.filter((item) => item.kind === 'video').map((item) => item.episodeId)),
    fetchExploreBookChapterPagesByChapterIds(planItems.filter((item) => item.kind === 'book').map((item) => item.chapterId)),
  ])
  const items: ExploreFeedItem[] = []
  for (const planItem of planItems) {
    if (planItem.kind === 'video') {
      const episode = episodeById.get(planItem.episodeId)
      if (episode) items.push({ kind: 'video', episode })
    } else {
      const page = pagesByChapter.get(planItem.chapterId)?.[planItem.pageIndex]
      if (page) items.push({ kind: 'book', page })
    }
  }
  return items
}

async function fetchExploreFeedBatch(seed: string, page: number, videosOnly = false): Promise<ExploreFeedBatch> {
    const [episodeMetas, userId] = await Promise.all([
      fetchExploreEpisodeMetasForPublic(),
      getAuthenticatedUserId(),
    ])
    const [bookChapterMetas, bookPageCounts] = userId && !videosOnly
      ? await Promise.all([fetchExploreBookChapterMetasForPublic(), fetchExploreBookChapterPageCounts()])
      : [[], {}]
    const plan = buildExploreFeedPlan(episodeMetas, bookChapterMetas, bookPageCounts, seed)
    const batch = sliceExploreFeedBatch(plan, page)
    const items = await hydrateExplorePlanItems(batch.items)
    return { items, hasMore: batch.hasMore }
}

const batchInputSchema = z.object({
  seed: z.string().trim().min(1).max(64),
  page: z.number().int().min(0).max(500),
})

export async function fetchExploreFeedPage(seed: string, page: number, videosOnly = false): Promise<ExploreFeedBatch> {
  const parsed = batchInputSchema.safeParse({ seed, page })
  if (!parsed.success) return { items: [], hasMore: false }
  return fetchExploreFeedBatch(parsed.data.seed, parsed.data.page, videosOnly)
}
