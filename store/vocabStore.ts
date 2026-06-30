// store/vocabStore.ts

import { create } from "zustand"
import type { VocabRow, ThemeProgress, ExampleRow } from "@/app/actions/vocab"
import { fetchThemeVocabWithProgress, fetchThemesWithProgress } from "@/app/actions/vocab"

interface ThemeCache {
  vocab: VocabRow[]
  examples: ExampleRow[]
}

interface ThemeListCache {
  themes: ThemeProgress[]
}

interface VocabStore {
  themeCache: Record<string, ThemeCache>  // key = `${themeName}:${levelCode}`
  themeListCache: Record<string, ThemeListCache>  // key = levelCode
  loadingThemeId: string | null
  error: string | null
  fetchTheme: (themeName: string, levelCode: string) => Promise<{
    vocab: VocabRow[]
    examples: ExampleRow[]
  }>
  fetchThemeList: (levelCode: string) => Promise<ThemeProgress[]>
  invalidateTheme: (themeName: string, levelCode?: string) => void
  invalidateThemeList: (levelCode: string) => void
}

export const useVocabStore = create<VocabStore>((set, get) => ({
  themeCache: {},
  themeListCache: {},
  loadingThemeId: null,
  error: null,

  fetchTheme: async (themeName: string, levelCode: string) => {
    const cacheKey = `${themeName}:${levelCode}`
    const cached = get().themeCache[cacheKey]
    if (cached) {
      return { vocab: cached.vocab, examples: cached.examples }
    }

    set({ loadingThemeId: themeName, error: null })
    try {
      const { vocab, examples } = await fetchThemeVocabWithProgress(themeName, levelCode)
      set((state) => ({
        themeCache: {
          ...state.themeCache,
          [cacheKey]: { vocab, examples },
        },
        loadingThemeId: null,
      }))
      return { vocab, examples }
    } catch (err: any) {
      set({ error: err.message, loadingThemeId: null })
      return { vocab: [], examples: [] }
    }
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

  invalidateTheme: (themeName, levelCode) => {
    set((state) => {
      const next = { ...state.themeCache }
      if (levelCode) {
        delete next[`${themeName}:${levelCode}`]
      } else {
        // Invalidate all level codes for this theme
        Object.keys(next).forEach(k => {
          if (k.startsWith(`${themeName}:`)) delete next[k]
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
