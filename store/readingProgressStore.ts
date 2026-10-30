import { create } from 'zustand'
import { supabase } from '@/app/lib/supabase/client'

/* One canonical account-backed reading position per book. Every reader page
   is resumable, including the opening page; mobile discovery can still use
   READING_TRACK_MIN_PAGE to decide when to show Continue Reading. */

export interface ReadingPosition {
  chapterSlug: string
  language?: 'ar' | 'en'
  page: number
  blockIndex?: number
  totalPages: number
  updatedAt: string
}

export const READING_TRACK_MIN_PAGE = 2
const SYNC_DEBOUNCE_MS = 20_000

interface ReadingProgressState {
  positions: Record<string, ReadingPosition>
  hydrateFromMetadata: (metadata: Record<string, unknown>) => void
  track: (bookSlug: string, chapterSlug: string, page: number, totalPages: number, blockIndex?: number, language?: 'ar' | 'en') => void
  flush: () => Promise<void>
}

export function parseStoredPositions(metadata: Record<string, unknown>): Record<string, ReadingPosition> {
  const raw = metadata.book_progress
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: Record<string, ReadingPosition> = {}
  for (const [bookSlug, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const record = entry as Record<string, unknown>
    if (typeof record.chapterSlug !== 'string') continue
    result[bookSlug] = {
      chapterSlug: record.chapterSlug,
      ...(record.language === 'ar' || record.language === 'en' ? { language: record.language } : {}),
      page: typeof record.page === 'number' && Number.isFinite(record.page) ? Math.max(1, Math.trunc(record.page)) : 1,
      totalPages: typeof record.totalPages === 'number' && Number.isFinite(record.totalPages) ? Math.max(1, Math.trunc(record.totalPages)) : 1,
      ...(typeof record.blockIndex==='number'&&Number.isInteger(record.blockIndex)&&record.blockIndex>=0?{blockIndex:record.blockIndex}:{}),
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
    }
  }
  return result
}

const dirtyBooks = new Set<string>()
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncing = false

export const useReadingProgressStore = create<ReadingProgressState>((set, get) => ({
  positions: {},
  hydrateFromMetadata: (metadata) => {
    const stored = parseStoredPositions(metadata)
    const current = get().positions
    const merged: Record<string, ReadingPosition> = { ...stored }
    for (const [slug, position] of Object.entries(current)) {
      // Local (this-session) positions win over the metadata snapshot.
      if (!stored[slug] || position.updatedAt >= stored[slug].updatedAt) merged[slug] = position
    }
    set({ positions: merged })
  },
  track: (bookSlug, chapterSlug, page, totalPages, blockIndex, language) => {
    const position: ReadingPosition = {
      chapterSlug,
      ...(language ? { language } : {}),
      page: Math.max(1, Math.trunc(page)),
      totalPages: Math.max(1, Math.trunc(totalPages)),
      ...(typeof blockIndex==='number'&&Number.isInteger(blockIndex)&&blockIndex>=0?{blockIndex}:{}),
      updatedAt: new Date().toISOString(),
    }
    set(state => ({ positions: { ...state.positions, [bookSlug]: position } }))
    dirtyBooks.add(bookSlug)
    if (!syncTimer) {
      syncTimer = setTimeout(() => { syncTimer = null; void get().flush() }, SYNC_DEBOUNCE_MS)
    }
  },
  flush: async () => {
    if (syncing || dirtyBooks.size === 0) return
    const pending = new Set(dirtyBooks)
    syncing = true
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) return
      const stored = parseStoredPositions(data.user.user_metadata)
      const positions = get().positions
      const next = { ...stored }
      for (const bookSlug of pending) {
        const position = positions[bookSlug]
        if (position) next[bookSlug] = position
      }
      const { error: writeError } = await supabase.auth.updateUser({ data: { book_progress: next } })
      if (writeError) return
      for (const bookSlug of pending) {
        if (get().positions[bookSlug] === positions[bookSlug]) dirtyBooks.delete(bookSlug)
      }
    } catch {
      // Leave entries dirty — the next track or flush retries.
    } finally {
      syncing = false
    }
  },
}))

/* Flush on tab hide so a reading session's position survives closing the tab. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void useReadingProgressStore.getState().flush()
  })
}
