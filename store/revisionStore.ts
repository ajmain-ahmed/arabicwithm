import { create } from "zustand"
import { fetchRevisionVocabIds } from "@/app/actions/vocab"
import { toggleRevision as serverToggleRevision } from "@/app/actions/revision"

interface RevisionStore {
  revisionIds: Set<number>
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  isInRevision: (vocabId: number) => boolean
  addToRevision: (vocabId: number) => Promise<boolean>
  removeFromRevision: (vocabId: number) => Promise<boolean>
  toggleRevision: (vocabId: number) => Promise<boolean>
}

export const useRevisionStore = create<RevisionStore>((set, get) => ({
  revisionIds: new Set(),
  loading: false,
  initialized: false,

  init: async () => {
    if (get().initialized || get().loading) return
    set({ loading: true })
    try {
      const ids = await fetchRevisionVocabIds()
      set({ revisionIds: new Set(ids), initialized: true, loading: false })
    } catch (e) {
      console.error("[revisionStore] init failed:", e)
      set({ initialized: true, loading: false })
    }
  },

  isInRevision: (vocabId: number) => {
    return get().revisionIds.has(vocabId)
  },

  addToRevision: async (vocabId: number) => {
    if (get().isInRevision(vocabId)) return true

    set((state) => {
      const next = new Set(state.revisionIds)
      next.add(vocabId)
      return { revisionIds: next }
    })

    try {
      const result = await serverToggleRevision(vocabId)
      set((state) => {
        const next = new Set(state.revisionIds)
        if (result.inRevision) next.add(vocabId)
        else next.delete(vocabId)
        return { revisionIds: next }
      })
      return result.inRevision
    } catch (e) {
      console.error("[revisionStore] add failed:", e)
      set((state) => {
        const next = new Set(state.revisionIds)
        next.delete(vocabId)
        return { revisionIds: next }
      })
      return false
    }
  },

  removeFromRevision: async (vocabId: number) => {
    if (!get().isInRevision(vocabId)) return false

    set((state) => {
      const next = new Set(state.revisionIds)
      next.delete(vocabId)
      return { revisionIds: next }
    })

    try {
      const result = await serverToggleRevision(vocabId)
      set((state) => {
        const next = new Set(state.revisionIds)
        if (result.inRevision) next.add(vocabId)
        else next.delete(vocabId)
        return { revisionIds: next }
      })
      return !result.inRevision
    } catch (e) {
      console.error("[revisionStore] remove failed:", e)
      set((state) => {
        const next = new Set(state.revisionIds)
        next.add(vocabId)
        return { revisionIds: next }
      })
      return false
    }
  },

  toggleRevision: async (vocabId: number) => {
    const currentlyIn = get().isInRevision(vocabId)

    set((state) => {
      const next = new Set(state.revisionIds)
      if (currentlyIn) next.delete(vocabId)
      else next.add(vocabId)
      return { revisionIds: next }
    })

    try {
      const result = await serverToggleRevision(vocabId)
      set((state) => {
        const next = new Set(state.revisionIds)
        if (result.inRevision) next.add(vocabId)
        else next.delete(vocabId)
        return { revisionIds: next }
      })
      return result.inRevision
    } catch (e) {
      console.error("[revisionStore] toggle failed:", e)
      set((state) => {
        const next = new Set(state.revisionIds)
        if (currentlyIn) next.add(vocabId)
        else next.delete(vocabId)
        return { revisionIds: next }
      })
      return currentlyIn
    }
  },
}))