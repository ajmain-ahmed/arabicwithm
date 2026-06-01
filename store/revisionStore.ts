import { create } from "zustand"
import { useEffect } from "react"
import { fetchRevisionVocabIds } from "@/app/actions/vocab"
import { toggleRevision as serverToggleRevision, submitRevisionTogglesBatch, fetchRevisionSession, fetchCustomSessionMetadata, type RevisionCard, type LevelMeta } from "@/app/actions/revision"
import type { ProgressState } from "@/app/lib/sm2"

const SESSION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const METADATA_TTL = 10 * 60 * 1000      // 10 minutes

interface RevisionStore {
  revisionIds: Set<number>
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  isInRevision: (vocabId: number) => boolean
  addToRevision: (vocabId: number) => Promise<boolean>
  removeFromRevision: (vocabId: number) => Promise<boolean>
  toggleRevision: (vocabId: number) => Promise<boolean>
  toggleRevisionBuffered: (vocabId: number) => void
  flushPendingToggles: () => Promise<void>
  sessionCache: SessionCache | null
  sessionLoading: boolean
  getSession: () => Promise<{ dueCards: RevisionCard[]; completedCards: RevisionCard[] }>
  updateSessionCard: (vocabId: number, updatedProgress: ProgressState, lastRating?: string) => void
  clearSession: () => void
  // Custom metadata cache (static, fetched once globally)
  customMetadata: LevelMeta[] | null
  customMetadataFetchedAt: number
  customMetadataLoading: boolean
  fetchCustomMetadata: () => Promise<LevelMeta[]>
  _invalidateRevisionId: (vocabId: number, inRevision: boolean) => void
}

interface SessionCache {
  dueCards: RevisionCard[]
  completedCards: RevisionCard[]
  fetchedAt: number
}

export const useRevisionStore = create<RevisionStore>((set, get) => {
  const pendingToggles = new Map<number, boolean>()
  let toggleTimer: ReturnType<typeof setTimeout> | null = null

  return {
  revisionIds: new Set(),
  loading: false,
  initialized: false,
  sessionCache: null,
  sessionLoading: false,
  customMetadata: null,
  customMetadataFetchedAt: 0,
  customMetadataLoading: false,

  init: async () => {
    if (get().initialized || get().loading) return
    set({ loading: true })
    try {
      const ids = await fetchRevisionVocabIds()
      set({ revisionIds: new Set(ids), initialized: true, loading: false })
    } catch (e) {
      console.error("[revisionStore] init failed:", e)
      set({ initialized: false, loading: false })
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
      get().clearSession()
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
      get().clearSession()
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
      get().clearSession()
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

  toggleRevisionBuffered: (vocabId: number) => {
    const currentlyIn = get().isInRevision(vocabId)
    const nextInRevision = !currentlyIn

    // Optimistically update local state
    set((state) => {
      const next = new Set(state.revisionIds)
      if (nextInRevision) next.add(vocabId)
      else next.delete(vocabId)
      return { revisionIds: next }
    })

    // Accumulate in pending batch (last write wins)
    pendingToggles.set(vocabId, nextInRevision)

    // Reset debounce timer
    if (toggleTimer) clearTimeout(toggleTimer)
    toggleTimer = setTimeout(() => {
      toggleTimer = null
      get().flushPendingToggles()
    }, 1500)
  },

  flushPendingToggles: async () => {
    if (pendingToggles.size === 0) return
    if (toggleTimer) {
      clearTimeout(toggleTimer)
      toggleTimer = null
    }

    const batch = Array.from(pendingToggles.entries()).map(([vocabId, inRevision]) => ({
      vocabId,
      inRevision,
    }))

    try {
      await submitRevisionTogglesBatch(batch)
      pendingToggles.clear()
      get().clearSession()
    } catch (e) {
      console.error('[revisionStore] batch toggle failed:', e)
      // Rollback optimistic updates on failure
      set((state) => {
        const next = new Set(state.revisionIds)
        batch.forEach(({ vocabId, inRevision }) => {
          if (inRevision) next.delete(vocabId)
          else next.add(vocabId)
        })
        return { revisionIds: next }
      })
    }
  },

  getSession: async () => {
    const { sessionCache } = get()
    const now = Date.now()

    if (sessionCache && now - sessionCache.fetchedAt < SESSION_CACHE_TTL) {
      return { dueCards: sessionCache.dueCards, completedCards: sessionCache.completedCards }
    }

    set({ sessionLoading: true })
    try {
      const { dueCards, completedCards } = await fetchRevisionSession()
      set({
        sessionCache: { dueCards, completedCards, fetchedAt: now },
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

  fetchCustomMetadata: async () => {
    const { customMetadata, customMetadataFetchedAt } = get()
    const now = Date.now()
    if (customMetadata && now - customMetadataFetchedAt < METADATA_TTL) {
      return customMetadata
    }
    set({ customMetadataLoading: true })
    try {
      const meta = await fetchCustomSessionMetadata()
      set({ customMetadata: meta, customMetadataFetchedAt: now, customMetadataLoading: false })
      return meta
    } catch (err) {
      console.error('[revisionStore] fetchCustomMetadata failed:', err)
      set({ customMetadataLoading: false })
      return []
    }
  },

  _invalidateRevisionId: (vocabId: number, inRevision: boolean) => {
    set((state) => {
      const next = new Set(state.revisionIds)
      if (inRevision) next.add(vocabId)
      else next.delete(vocabId)
      return { revisionIds: next }
    })
  },
  }
})

export function useInitRevisionStore() {
  const initialized = useRevisionStore((s) => s.initialized)
  const init = useRevisionStore((s) => s.init)
  useEffect(() => {
    if (!initialized) init()
  }, [initialized, init])
}