import type { Metadata } from 'next'
import ExploreViews from './ExploreViews'
import { fetchExploreFeedPage } from '@/app/actions/explore'
import { getExploreSeed } from '@/app/lib/explore'


export const metadata: Metadata = {
  title: 'Explore Arabic | ArabicWithM',
  description: 'Discover randomized Arabic videos and book passages with translations.',
}

/* The first feed batch is fetched here (not in the browser) so the streamed
   HTML carries content: first-time visitors see videos immediately instead of
   a loading stage, while returning visitors still restore their session cache
   client-side with only a small fresh batch fetched. A failed fetch falls back
   to the client's own first load (initialBatch = null). */
export default async function ExplorePage({searchParams}:{searchParams:Promise<{view?:string;tab?:string}>}) {
  const query=await searchParams
  const initialView=(query.view??query.tab)==='foryou'?'foryou':'explore'
  const seed = getExploreSeed()
  const initialBatch = initialView==='explore'?await fetchExploreFeedPage(seed, 0).catch(() => null):null
  return <ExploreViews initialView={initialView} initialSeed={seed} initialBatch={initialBatch} />
}
