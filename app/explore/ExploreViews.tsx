'use client'

import type { ForYouClip } from '@/app/lib/forYou'
import ForYouFeed from './ForYouFeed'

export default function ExploreViews({ clips }: { clips: ForYouClip[] }) {
  return <ForYouFeed initialClips={clips} />
}
