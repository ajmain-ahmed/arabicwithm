import { create } from 'zustand'
import type { MyListItem } from '@/app/actions/myList'

/* Session cache for My List: the homepage fetches once per session; show-page
   add/remove keeps it in sync so revisits need no extra query. `null` means
   "not loaded yet". */

interface MyListCacheState {
  items: MyListItem[] | null
  set: (items: MyListItem[]) => void
  add: (item: MyListItem) => void
  remove: (showId: string) => void
}

export const useMyListCache = create<MyListCacheState>((set) => ({
  items: null,
  set: (items) => set({ items }),
  add: (item) => set((state) => ({ items: state.items ? [item, ...state.items] : [item] })),
  remove: (showId) => set((state) => ({ items: state.items ? state.items.filter((item) => item.showId !== showId) : state.items })),
}))
