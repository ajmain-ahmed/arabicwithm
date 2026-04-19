// store/vocabStore.ts

import { create } from "zustand"
import type { VocabRow, WordProgress } from "@/app/actions/vocab"
import { fetchThemeVocabWithProgress } from "@/app/actions/vocab"

export type { VocabRow as Vocab }

interface ThemeCache {
  vocab: VocabRow[]
  progress: WordProgress[]
  fetchedAt: number
}

interface VocabStore {
  // theme_id → cached data
  themeCache: Record<number, ThemeCache>
  loadingThemeId: number | null
  error: string | null

  // Fetch vocab + progress for a theme (uses cache if already loaded)
  fetchTheme: (themeId: number) => Promise<{ vocab: VocabRow[]; progress: WordProgress[] }>

  // Update a single word's progress in the local cache (optimistic)
  updateLocalProgress: (
    themeId: number,
    wordId: number,
    patch: Partial<WordProgress>
  ) => void

  // Invalidate a theme's cache (e.g. after navigating away and back)
  invalidateTheme: (themeId: number) => void
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export const useVocabStore = create<VocabStore>((set, get) => ({
  themeCache: {},
  loadingThemeId: null,
  error: null,

  fetchTheme: async (themeId: number) => {
    const cached = get().themeCache[themeId]
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return { vocab: cached.vocab, progress: cached.progress }
    }

    set({ loadingThemeId: themeId, error: null })
    try {
      const { vocab, progress } = await fetchThemeVocabWithProgress(themeId)
      set((state) => ({
        themeCache: {
          ...state.themeCache,
          [themeId]: { vocab, progress, fetchedAt: Date.now() },
        },
        loadingThemeId: null,
      }))
      return { vocab, progress }
    } catch (err: any) {
      set({ error: err.message, loadingThemeId: null })
      return { vocab: [], progress: [] }
    }
  },

  updateLocalProgress: (themeId, wordId, patch) => {
    set((state) => {
      const cached = state.themeCache[themeId]
      if (!cached) return state

      const existingIdx = cached.progress.findIndex((p) => p.word_id === wordId)
      let newProgress: WordProgress[]

      if (existingIdx >= 0) {
        newProgress = cached.progress.map((p, i) =>
          i === existingIdx ? { ...p, ...patch } : p
        )
      } else {
        newProgress = [
          ...cached.progress,
          {
            word_id: wordId,
            is_completed: false,
            is_in_revision: false,
            ...patch,
          },
        ]
      }

      return {
        themeCache: {
          ...state.themeCache,
          [themeId]: { ...cached, progress: newProgress },
        },
      }
    })
  },

  invalidateTheme: (themeId) => {
    set((state) => {
      const next = { ...state.themeCache }
      delete next[themeId]
      return { themeCache: next }
    })
  },
}))