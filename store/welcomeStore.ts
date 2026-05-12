import { create } from 'zustand'
import { fetchDailyReviewCounts, fetchCustomSessionMetadata } from '@/app/actions/revision'

interface WelcomeCache {
    dailyCounts: { newCount: number; learningCount: number; reviewCount: number }
    metadata: {
        code: string
        label: string
        themes: { theme_id: number; display_name: string; total_words: number }[]
    }[]
    fetchedAt: number
}

interface WelcomeStore {
    cache: WelcomeCache | null
    loading: boolean
    promise: Promise<WelcomeCache> | null
    getData: () => Promise<WelcomeCache>
    clearCache: () => void
}

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export const useWelcomeStore = create<WelcomeStore>((set, get) => ({
    cache: null,
    loading: false,
    promise: null,

    getData: async () => {
        const { cache, loading, promise } = get()

        if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
            return cache
        }

        if (loading && promise) {
            return promise
        }

        const newPromise = (async () => {
            set({ loading: true, promise: null })
            try {
                const [counts, metadata] = await Promise.all([
                    fetchDailyReviewCounts(),
                    fetchCustomSessionMetadata(),
                ])
                const newCache: WelcomeCache = {
                    dailyCounts: counts,
                    metadata,
                    fetchedAt: Date.now(),
                }
                set({ cache: newCache, loading: false, promise: null })
                return newCache
            } catch (err) {
                console.error(err)
                set({ loading: false, promise: null })
                if (cache) return cache
                throw err
            }
        })()

        set({ promise: newPromise })
        return newPromise
    },

    clearCache: () => set({ cache: null, loading: false, promise: null }),
}))
