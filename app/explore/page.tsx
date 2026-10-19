import { connection } from 'next/server'
import type { Metadata } from 'next'
import { getExploreSeed } from '@/app/lib/explore'
import ExploreViews from './ExploreViews'
import { fetchForYouClips } from '@/app/actions/forYou'


export const metadata: Metadata = {
  title: 'Explore Arabic | ArabicWithM',
  description: 'Discover randomized Arabic videos and book passages with translations.',
}

export default async function ExplorePage() {
  await connection()
  const seed = getExploreSeed()
  const clips = await fetchForYouClips(seed)
  return (
    <>
    <ExploreViews
      clips={clips}
      key={seed}
    />
    </>
  )
}
