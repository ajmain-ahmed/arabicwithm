import type { Metadata } from 'next'
import ExploreViews from './ExploreViews'


export const metadata: Metadata = {
  title: 'Explore Arabic | ArabicWithM',
  description: 'Discover randomized Arabic videos and book passages with translations.',
}

/* The feed is fetched client-side (see ExploreFeed): the page shell renders
   instantly, first-time visitors get a loading state, and returning visitors
   restore their cached feed from the Zustand store with only a small fresh
   batch fetched. */
export default function ExplorePage() {
  return <ExploreViews />
}
