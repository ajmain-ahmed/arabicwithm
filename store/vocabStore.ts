// store/vocabStore.ts

import { create } from "zustand"
import type { VocabRow, WordProgress, ExampleRow } from "@/app/actions/vocab"
import {
  fetchThemeVocabWithProgress,
  fetchExamplesForTheme,
} from "@/app/actions/vocab"

export type { VocabRow as Vocab }

interface ThemeCache {
  vocab: VocabRow[]
  progress: WordProgress[]
  examples: ExampleRow[]
  fetchedAt: number
}

interface VocabStore {
  themeCache: Record<number, ThemeCache>
  loadingThemeId: number | null
  error: string | null

  fetchTheme: (themeId: number) => Promise<{
    vocab: VocabRow[]
    progress: WordProgress[]
    examples: ExampleRow[]
  }>

  updateLocalProgress: (
    themeId: number,
    wordId: number,
    patch: Partial<WordProgress>
  ) => void

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
      return { vocab: cached.vocab, progress: cached.progress, examples: cached.examples }
    }

    set({ loadingThemeId: themeId, error: null })

    try {
      const { vocab, progress } = await fetchThemeVocabWithProgress(themeId)
      const wordIds = vocab.map((v) => v.id)
      const examples = await fetchExamplesForTheme(wordIds)

      set((state) => ({
        themeCache: {
          ...state.themeCache,
          [themeId]: { vocab, progress, examples, fetchedAt: Date.now() },
        },
        loadingThemeId: null,
      }))

      return { vocab, progress, examples }
    } catch (err: any) {
      set({ error: err.message, loadingThemeId: null })
      return { vocab: [], progress: [], examples: [] }
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