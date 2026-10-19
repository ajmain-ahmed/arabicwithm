import { connection } from 'next/server'
import type { Metadata } from 'next'
import { fetchExploreFeedPage } from '@/app/actions/explore'
import { getExploreSeed } from '@/app/lib/explore'
import ExploreViews from './ExploreViews'


export const metadata: Metadata = {
  title: 'Explore Arabic | ArabicWithM',
  description: 'Discover randomized Arabic videos and book passages with translations.',
}

export default async function ExplorePage() {
  await connection()
  const seed = getExploreSeed()
  const initialBatch = await fetchExploreFeedPage(seed, 0)
  return (
    <>
    <ExploreViews
      key={seed}
      seed={seed}
      items={initialBatch.items}
      hasMore={initialBatch.hasMore}
    />
    </>
  )
}
