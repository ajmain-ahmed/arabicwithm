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
  fetchUserProgressWords: (force?: boolean) => Promise<void>
  updateUserProgressWord: (
    vocabId: number,
    status: 'revision' | 'completed' | null,
    meta?: Partial<ProgressWord>
  ) => void
  removeUserProgressWords: (vocabIds: number[]) => void
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
      const oldStatus = existingIdx >= 0 ? cached.progress[existingIdx].status : null
      const newStatus = patch.status !== undefined ? patch.status : oldStatus

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

      // Surgical themeListCache update — only adjust counts for the affected theme
      const themeListCached = state.themeListCache[levelCode]
      let nextThemeList = state.themeListCache
      if (themeListCached) {
        const themeIdx = themeListCached.themes.findIndex((t) => t.display_name === themeName)
        if (themeIdx >= 0 && oldStatus !== newStatus) {
          const updatedThemes = themeListCached.themes.map((t, i) => {
            if (i !== themeIdx) return t
            let completed = t.completed_count
            let revision = t.revision_count
            if (oldStatus === 0) revision -= 1
            if (oldStatus === 1) completed -= 1
            if (newStatus === 0) revision += 1
            if (newStatus === 1) completed += 1
            return {
              ...t,
              completed_count: Math.max(0, completed),
              revision_count: Math.max(0, revision),
            }
          })
          nextThemeList = {
            ...state.themeListCache,
            [levelCode]: { themes: updatedThemes },
          }
        }
      }

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

  fetchUserProgressWords: async (force?: boolean) => {
    if ((!force && get().userProgressInitialized) || get().userProgressLoading) return
    set({ userProgressLoading: true })
    try {
      const words = await fetchUserProgressWordsServer()
      set((state) => {
        const fetchedIds = new Set(words.map(w => w.vocab_id))
        // Preserve any locally-added words that haven't been flushed to DB yet
        const localOnly = (state.userProgressWords ?? []).filter(w => !fetchedIds.has(w.vocab_id))
        return {
          userProgressWords: [...words, ...localOnly],
          userProgressLoading: false,
          userProgressInitialized: true,
        }
      })
    } catch (err: any) {
      set({ error: err.message, userProgressLoading: false })
    }
  },

  updateUserProgressWord: (vocabId: number, status: 'revision' | 'completed' | null, meta?: Partial<ProgressWord>) => {
    set((state) => {
      const currentWords = state.userProgressWords ?? []
      const exists = currentWords.find(w => w.vocab_id === vocabId)
      if (status === null) {
        // Remove from progress words
        return {
          userProgressWords: currentWords.filter(w => w.vocab_id !== vocabId),
        }
      }
      if (exists) {
        return {
          userProgressWords: currentWords.map(w =>
            w.vocab_id === vocabId ? { ...w, status } : w
          ),
        }
      }
      // Word not in cache — if we have metadata, insert it optimistically
      if (meta) {
        const newWord: ProgressWord = {
          vocab_id: vocabId,
          word_ar: meta.word_ar ?? '',
          word_di: meta.word_di ?? '',
          word_tr: meta.word_tr ?? '',
          level: meta.level ?? '',
          theme: meta.theme ?? '',
          root: meta.root ?? null,
          status,
          updated_at: new Date().toISOString(),
          meaning: meta.meaning,
        }
        return {
          userProgressWords: [...currentWords, newWord],
        }
      }
      // No metadata available — mark stale so widget refetches fresh data
      return { userProgressInitialized: false }
    })
  },

  removeUserProgressWords: (vocabIds: number[]) => {
    set((state) => {
      if (!state.userProgressWords) return state
      const idSet = new Set(vocabIds)
      return {
        userProgressWords: state.userProgressWords.filter(w => !idSet.has(w.vocab_id)),
      }
    })
  },

  invalidateUserProgress: () => {
    set({ userProgressWords: null, userProgressInitialized: false })
  },
}))
