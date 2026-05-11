  // // store/revisionStore.ts

  import { create } from "zustand"
  import { fetchRevisionVocabIds } from "@/app/actions/vocab"
  import { toggleRevision as serverToggleRevision, fetchRevisionSession, type RevisionCard } from "@/app/actions/revision"
  import { useEffect } from "react"
  import type { ProgressState } from "@/app/lib/sm2"

  interface RevisionStore {
    revisionIds: Set<number>
    loading: boolean
    initialized: boolean
    init: () => Promise<void>
    isInRevision: (vocabId: number) => boolean
    addToRevision: (vocabId: number) => Promise<boolean>
    removeFromRevision: (vocabId: number) => Promise<boolean>
    toggleRevision: (vocabId: number) => Promise<boolean>
    sessionCache: SessionCache | null
    sessionLoading: boolean
    getSession: () => Promise<{ dueCards: RevisionCard[]; completedCards: RevisionCard[] }>
    updateSessionCard: (vocabId: number, updatedProgress: ProgressState, lastRating?: string) => void
    clearSession: () => void
  }

  interface SessionCache {
    dueCards: RevisionCard[]
    completedCards: RevisionCard[]
    fetchedAt: number
  }

  const store = create<RevisionStore>((set, get) => ({
    revisionIds: new Set(),
    loading: false,
    initialized: false,
    sessionCache: null,
    sessionLoading: false,

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

    getSession: async () => {
      const { sessionCache } = get()
      if (sessionCache && Date.now() - sessionCache.fetchedAt < 5 * 60 * 1000) {
        return { dueCards: sessionCache.dueCards, completedCards: sessionCache.completedCards }
      }

      set({ sessionLoading: true })
      try {
        const { dueCards, completedCards } = await fetchRevisionSession()
        set({
          sessionCache: { dueCards, completedCards, fetchedAt: Date.now() },
          sessionLoading: false,
        })
        return { dueCards, completedCards }
      } catch (err) {
        console.error('[revisionStore] fetch session failed:', err)
        set({ sessionLoading: false })
        return { dueCards: [], completedCards: [] }
      }
    },

    updateSessionCard: (vocabId, updatedProgress, lastRating?) => {
      set((state) => {
        if (!state.sessionCache) return {}

        const { dueCards, completedCards } = state.sessionCache

        const updateFields = (c: RevisionCard) => {
          const nowISO = new Date().toISOString()
          const updates: any = {
            ...c,
            repetitions: updatedProgress.repetitions,
            interval_days: updatedProgress.interval_days,
            ease_factor: updatedProgress.ease_factor,
            learning_step: updatedProgress.learning_step,
            lapses: updatedProgress.lapses,
            last_review_at: nowISO,
          }
          if (lastRating) {
            updates.lastRating = lastRating
          }
          return updates as RevisionCard
        }

        if (updatedProgress.interval_days > 0) {
          const card = dueCards.find(c => c.id === vocabId)
          if (card) {
            return {
              sessionCache: {
                ...state.sessionCache,
                dueCards: dueCards.filter(c => c.id !== vocabId),
                completedCards: [...completedCards, updateFields(card)],
              },
            }
          }
          return {
            sessionCache: {
              ...state.sessionCache,
              dueCards,
              completedCards: completedCards.map(c => c.id === vocabId ? updateFields(c) : c),
            },
          }
        }

        return {
          sessionCache: {
            ...state.sessionCache,
            dueCards: dueCards.map(c => c.id === vocabId ? updateFields(c) : c),
            completedCards: completedCards.map(c => c.id === vocabId ? updateFields(c) : c),
          },
        }
      })
    },

    clearSession: () => set({ sessionCache: null }),
  }))

  // Lazy wrapper: automatically calls init() on first use in a component
  export const useRevisionStore = ((selector: any) => {
    const { init, initialized } = store.getState()
    useEffect(() => {
      if (!initialized) init()
    }, [initialized, init])
    return store(selector)
  }) as typeof store
