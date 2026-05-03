import { create } from "zustand"
import type { VocabRow, WordProgress, ExampleRow } from "@/app/actions/vocab"
import { fetchThemeVocabWithProgress } from "@/app/actions/vocab"

interface ThemeCache {
  vocab: VocabRow[]
  progress: WordProgress[]
  examples: ExampleRow[]
  fetchedAt: number
}

interface VocabStore {
  themeCache: Record<string, ThemeCache>  // key = `${themeId}:${dialectCode}`
  loadingThemeId: number | null
  error: string | null
  fetchTheme: (themeId: number, dialectCode: string) => Promise<{
    vocab: VocabRow[]
    progress: WordProgress[]
    examples: ExampleRow[]
  }>
  updateLocalProgress: (
    themeId: number,
    dialectCode: string,
    vocabId: number,
    patch: Partial<WordProgress>
  ) => void
  invalidateTheme: (themeId: number, dialectCode?: string) => void
}

const CACHE_TTL_MS = 0  // TEMP: always fetch fresh data while debugging examples

export const useVocabStore = create<VocabStore>((set, get) => ({
  themeCache: {},
  loadingThemeId: null,
  error: null,

  fetchTheme: async (themeId: number, dialectCode: string) => {
    const cacheKey = `${themeId}:${dialectCode}`
    const cached = get().themeCache[cacheKey]
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return { vocab: cached.vocab, progress: cached.progress, examples: cached.examples }
    }

    set({ loadingThemeId: themeId, error: null })
    try {
      const { vocab, progress, examples } = await fetchThemeVocabWithProgress(themeId, dialectCode)
      set((state) => ({
        themeCache: {
          ...state.themeCache,
          [cacheKey]: { vocab, progress, examples, fetchedAt: Date.now() },
        },
        loadingThemeId: null,
      }))
      return { vocab, progress, examples }
    } catch (err: any) {
      set({ error: err.message, loadingThemeId: null })
      return { vocab: [], progress: [], examples: [] }
    }
  },

  updateLocalProgress: (themeId, dialectCode, vocabId, patch) => {
    set((state) => {
      const cacheKey = `${themeId}:${dialectCode}`
      const cached = state.themeCache[cacheKey]
      if (!cached) return state
      const existingIdx = cached.progress.findIndex((p) => p.vocab_id === vocabId)
      let newProgress: WordProgress[]
      if (existingIdx >= 0) {
        newProgress = cached.progress.map((p, i) =>
          i === existingIdx ? { ...p, ...patch } : p
        )
      } else {
        newProgress = [
          ...cached.progress,
          { vocab_id: vocabId, is_completed: false, is_in_revision: false, ...patch },
        ]
      }
      return {
        themeCache: {
          ...state.themeCache,
          [cacheKey]: { ...cached, progress: newProgress },
        },
      }
    })
  },

  invalidateTheme: (themeId, dialectCode) => {
    set((state) => {
      const next = { ...state.themeCache }
      if (dialectCode) {
        delete next[`${themeId}:${dialectCode}`]
      } else {
        // Invalidate all dialects for this theme
        Object.keys(next).forEach(k => {
          if (k.startsWith(`${themeId}:`)) delete next[k]
        })
      }
      return { themeCache: next }
    })
  },
}))