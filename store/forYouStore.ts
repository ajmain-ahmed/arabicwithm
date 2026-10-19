import { create } from 'zustand'
import type { ForYouClip } from '@/app/lib/forYou'

/* Session cache for the For You feed: switching to Explore and back (or a
   remount) restores the clips, position, and exclusions without refetching. */

interface ForYouCacheState {
  clips: ForYouClip[]
  index: number
  excluded: number[]
  setAll: (clips: ForYouClip[], index: number, excluded: number[]) => void
}

export const useForYouCache = create<ForYouCacheState>((set) => ({
  clips: [],
  index: 0,
  excluded: [],
  setAll: (clips, index, excluded) => set({ clips, index, excluded }),
}))
