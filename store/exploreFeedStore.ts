import { create } from 'zustand'
import type { ExploreFeedItem } from '@/app/lib/explore'

/* Session cache for the explore feed: returning to /explore restores the
   items already fetched this session (no repeat DB round trips) and a fresh
   batch is appended on top. */

interface ExploreFeedCacheState {
  items: ExploreFeedItem[]
  setItems: (items: ExploreFeedItem[]) => void
}

export const useExploreFeedCache = create<ExploreFeedCacheState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}))
