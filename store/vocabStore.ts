// store/vocabStore.ts

import { create } from "zustand"
import type { VocabRow, WordProgress, ThemeProgress, ExampleRow } from "@/app/actions/vocab"
import { fetchThemeVocabWithProgress, fetchThemesWithProgress } from "@/app/actions/vocab"
import type { ProgressWord } from "@/app/actions/profile"
import { fetchUserProgressWords as fetchUserProgressWordsServer } from "@/app/actions/profile"

interface ThemeCache {
  vocab: VocabRow[]
  progress: WordProgress[]
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
    progress: WordProgress[]
    examples: ExampleRow[]
  }>
  fetchThemeList: (levelCode: string) => Promise<ThemeProgress[]>
  updateLocalProgress: (
    themeName: string,
    levelCode: string,
    vocabId: number,
    patch: Partial<WordProgress>
  ) => void
  invalidateTheme: (themeName: string, levelCode?: string) => void
  invalidateThemeList: (levelCode: string) => void

  // Global user progress words (used by profile page)
  userProgressWords: ProgressWord[] | null
  userProgressLoading: boolean
  userProgressInitialized: boolean
  fetchUserProgressWords: () => Promise<void>
  updateUserProgressWord: (vocabId: number, status: 'revision' | 'completed' | null) => void
  invalidateUserProgress: () => void
}

export const useVocabStore = create<VocabStore>((set, get) => ({
  themeCache: {},
  themeListCache: {},
  loadingThemeId: null,
  error: null,

  // Global user progress words
  userProgressWords: null,
  userProgressLoading: false,
  userProgressInitialized: false,

  fetchTheme: async (themeName: string, levelCode: string) => {
    const cacheKey = `${themeName}:${levelCode}`
    const cached = get().themeCache[cacheKey]
    if (cached) {
      return { vocab: cached.vocab, progress: cached.progress, examples: cached.examples }
    }

    set({ loadingThemeId: themeName, error: null })
    try {
      const { vocab, progress, examples } = await fetchThemeVocabWithProgress(themeName, levelCode)
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

  updateLocalProgress: (themeName, levelCode, vocabId, patch) => {
    set((state) => {
      const cacheKey = `${themeName}:${levelCode}`
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
          { vocab_id: vocabId, status: null, ...patch },
        ]
      }
      // Also invalidate the theme list cache so sidebar counts refresh on next load
      const nextThemeList = { ...state.themeListCache }
      delete nextThemeList[levelCode]
      return {
        themeCache: {
          ...state.themeCache,
          [cacheKey]: { ...cached, progress: newProgress },
        },
        themeListCache: nextThemeList,
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

  fetchUserProgressWords: async () => {
    if (get().userProgressInitialized || get().userProgressLoading) return
    set({ userProgressLoading: true })
    try {
      const words = await fetchUserProgressWordsServer()
      set({ userProgressWords: words, userProgressLoading: false, userProgressInitialized: true })
    } catch (err: any) {
      set({ error: err.message, userProgressLoading: false })
    }
  },

  updateUserProgressWord: (vocabId: number, status: 'revision' | 'completed' | null) => {
    set((state) => {
      if (!state.userProgressWords) return state
      const exists = state.userProgressWords.find(w => w.vocab_id === vocabId)
      if (status === null) {
        // Remove from progress words
        return {
          userProgressWords: state.userProgressWords.filter(w => w.vocab_id !== vocabId),
        }
      }
      if (exists) {
        return {
          userProgressWords: state.userProgressWords.map(w =>
            w.vocab_id === vocabId ? { ...w, status } : w
          ),
        }
      }
      // Word not in cache — we don't have its metadata (word_ar, etc.) here.
      // The next time the user visits the profile page, a fresh fetch will pick it up.
      return state
    })
  },

  invalidateUserProgress: () => {
    set({ userProgressWords: null, userProgressInitialized: false })
  },
}))
