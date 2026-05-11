// store/vocabStore.ts

import { create } from "zustand"
import type { VocabRow, WordProgress, ThemeProgress, ExampleRow } from "@/app/actions/vocab"
import { fetchThemeVocabWithProgress, fetchThemesWithProgress } from "@/app/actions/vocab"

interface ThemeCache {
  vocab: VocabRow[]
  progress: WordProgress[]
  examples: ExampleRow[]
}

interface ThemeListCache {
  themes: ThemeProgress[]
}

interface VocabStore {
  themeCache: Record<string, ThemeCache>  // key = `${themeId}:${levelCode}`
  themeListCache: Record<string, ThemeListCache>  // key = levelCode
  loadingThemeId: number | null
  error: string | null
  fetchTheme: (themeId: number, levelCode: string) => Promise<{
    vocab: VocabRow[]
    progress: WordProgress[]
    examples: ExampleRow[]
  }>
  fetchThemeList: (levelCode: string) => Promise<ThemeProgress[]>
  updateLocalProgress: (
    themeId: number,
    levelCode: string,
    vocabId: number,
    patch: Partial<WordProgress>
  ) => void
  invalidateTheme: (themeId: number, levelCode?: string) => void
  invalidateThemeList: (levelCode: string) => void
}

export const useVocabStore = create<VocabStore>((set, get) => ({
  themeCache: {},
  themeListCache: {},
  loadingThemeId: null,
  error: null,

  fetchTheme: async (themeId: number, levelCode: string) => {
    const cacheKey = `${themeId}:${levelCode}`
    const cached = get().themeCache[cacheKey]
    if (cached) {
      return { vocab: cached.vocab, progress: cached.progress, examples: cached.examples }
    }

    set({ loadingThemeId: themeId, error: null })
    try {
      const { vocab, progress, examples } = await fetchThemeVocabWithProgress(themeId, levelCode)
      set((state) => ({
        themeCache: {
          ...state.themeCache,
          [cacheKey]: { vocab, progress, examples },
        },
        loadingThemeId: null,
      }))
      return { vocab, progress, examples }
    } catch (err: any) {
      set({ error: err.message, loadingThemeId: null })
      return { vocab: [], progress: [], examples: [] }
    }
  },

  updateLocalProgress: (themeId, levelCode, vocabId, patch) => {
    set((state) => {
      const cacheKey = `${themeId}:${levelCode}`
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

  fetchThemeList: async (levelCode: string) => {
    const key = levelCode
    const cached = get().themeListCache[key]
    if (cached) {
      return cached.themes
    }

    const themes = await fetchThemesWithProgress(levelCode)
    set(state => ({
      themeListCache: {
        ...state.themeListCache,
        [key]: { themes },
      },
    }))
    return themes
  },

  invalidateTheme: (themeId, levelCode) => {
    set((state) => {
      const next = { ...state.themeCache }
      if (levelCode) {
        delete next[`${themeId}:${levelCode}`]
      } else {
        // Invalidate all level codes for this theme
        Object.keys(next).forEach(k => {
          if (k.startsWith(`${themeId}:`)) delete next[k]
        })
      }
      return { themeCache: next }
    })
  },

  invalidateThemeList: (levelCode: string) => {
    set((state) => {
      const next = { ...state.themeListCache }
      delete next[levelCode]
      return { themeListCache: next }
    })
  },
}))
