import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { saveAudioProgress } from '@/app/actions/audiobooks'
import type { AudioLanguage } from '@/app/lib/audioUpload'
import type { ChapterAudioPlayback } from '@/app/actions/audiobooks'

interface AudioSession {
  userId: string
  chapterId: string
  language: AudioLanguage
  positionSeconds: number
}

interface CachedPlayback {
  playback: ChapterAudioPlayback
  expiresAt: number | null
}

export interface AudioProgressEntry extends AudioSession {
  completed: boolean
  updatedAt: number
}

interface AudiobookState {
  session: AudioSession | null
  playbackCache: Record<string, CachedPlayback>
  progressOutbox: Record<string, AudioProgressEntry>
  cachePlayback: (userId: string, chapterId: string, language: AudioLanguage, playback: ChapterAudioPlayback, expiresAt: number | null) => void
  readCachedPlayback: (userId: string, chapterId: string, language: AudioLanguage) => CachedPlayback | null
  recordProgress: (userId: string, chapterId: string, language: AudioLanguage, positionSeconds: number, completed: boolean) => number
  markProgressSynced: (userId: string, chapterId: string, language: AudioLanguage, updatedAt: number) => void
  flushProgressOutbox: (currentUserId?: string) => Promise<void>
  clearPlaybackCache: () => void
}

function playbackKey(userId: string, chapterId: string, language: AudioLanguage): string {
  return `${userId}:${chapterId}:${language}`
}

export const useAudiobookStore = create<AudiobookState>()(persist((set, get) => ({
  session: null,
  playbackCache: {},
  progressOutbox: {},
  cachePlayback: (userId, chapterId, language, playback, expiresAt) => {
    const key = playbackKey(userId, chapterId, language)
    set(state => ({
      playbackCache: { ...state.playbackCache, [key]: { playback, expiresAt } },
      session: { userId, chapterId, language, positionSeconds: playback.positionSeconds },
    }))
  },
  readCachedPlayback: (userId, chapterId, language) => {
    const cached = get().playbackCache[playbackKey(userId, chapterId, language)]
    if (!cached || (cached.expiresAt !== null && cached.expiresAt <= Date.now())) return null
    const session = get().session
    if (session && session.userId === userId && session.chapterId === chapterId && session.language === language) {
      return { ...cached, playback: { ...cached.playback, positionSeconds: session.positionSeconds } }
    }
    return cached
  },
  recordProgress: (userId, chapterId, language, positionSeconds, completed) => {
    const updatedAt = Date.now()
    const entry = { userId, chapterId, language, positionSeconds, completed, updatedAt }
    const key = playbackKey(userId, chapterId, language)
    set(state => ({
      session: { userId, chapterId, language, positionSeconds },
      progressOutbox: { ...state.progressOutbox, [key]: entry },
    }))
    return updatedAt
  },
  markProgressSynced: (userId, chapterId, language, updatedAt) => {
    const key = playbackKey(userId, chapterId, language)
    if (get().progressOutbox[key]?.updatedAt !== updatedAt) return
    set(state => {
      const progressOutbox = { ...state.progressOutbox }
      delete progressOutbox[key]
      return { progressOutbox }
    })
  },
  flushProgressOutbox: async (currentUserId) => {
    const entries = Object.values(get().progressOutbox).filter(entry => !currentUserId || entry.userId === currentUserId).sort((a, b) => a.updatedAt - b.updatedAt)
    for (const entry of entries) {
      try {
        await saveAudioProgress(entry.chapterId, entry.positionSeconds, entry.completed, entry.language, entry.userId)
        get().markProgressSynced(entry.userId, entry.chapterId, entry.language, entry.updatedAt)
      } catch {
        // Failed entries remain queued for the next connection or mount.
      }
    }
  },
  clearPlaybackCache: () => set({ playbackCache: {}, session: null }),
}), {
  name: 'awm-audiobook-progress-v1',
  version: 1,
  storage: createJSONStorage(() => window.localStorage),
  partialize: state => ({ progressOutbox: state.progressOutbox }),
}))
