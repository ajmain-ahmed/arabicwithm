import { create } from "zustand"
import { fetchVocab } from "@/app/actions/vocab"

export type Vocab = {
  idx: number
  id: number
  word: string
  word_diacritic: string
  transliteration: string
  definition: string
  level: string
  type: string
  root: string
}

interface VocabStore {
  vocab: Vocab[]
  isLoading: boolean
  error: string | null
  fetch: () => Promise<void>
}

export const useVocabStore = create<VocabStore>((set, get) => ({
  vocab: [],
  isLoading: false,
  error: null,
  fetch: async () => {
    if (get().vocab.length > 0) return // already loaded
    set({ isLoading: true, error: null })
    try {
      const data = await fetchVocab()
      set({ vocab: data, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },
}))