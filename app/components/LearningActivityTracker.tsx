'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { fetchLearningActivity, recordActiveLearning } from '@/app/actions/activity'
import { useAuth } from '@/app/AuthContext'
import {
  LEARNING_ACTIVITY_EVENT,
  WORD_LOOKUP_EVENT,
  activityKindForPath,
  localDateKey,
  shouldCountActiveTime,
} from '@/app/lib/activity'
import { usePlayerStore } from '@/store/playerStore'

const TICK_INTERVAL_MS = 15_000
const SYNC_AFTER_SECONDS = 60

interface PendingActivity {
  activeSeconds: number
  readingSeconds: number
  videoSeconds: number
  wordLookups: number
}

const EMPTY_PENDING: PendingActivity = {
  activeSeconds: 0,
  readingSeconds: 0,
  videoSeconds: 0,
  wordLookups: 0,
}

export default function LearningActivityTracker() {
  const { user, loading } = useAuth()
  const pathname = usePathname() ?? ''
  const videoPlaying = usePlayerStore((state) => state.isPlaying)
  const userIdRef = useRef(user?.id)
  const pathnameRef = useRef(pathname)
  const videoPlayingRef = useRef(videoPlaying)
  const pendingRef = useRef<PendingActivity>({ ...EMPTY_PENDING })
  const syncingRef = useRef(false)
  const lastTickRef = useRef(0)
  const lastInteractionRef = useRef(0)

  useEffect(() => { userIdRef.current = user?.id }, [user?.id])
  useEffect(() => { pathnameRef.current = pathname }, [pathname])
  useEffect(() => { videoPlayingRef.current = videoPlaying }, [videoPlaying])

  const publish = useCallback((userId: string, activity: Awaited<ReturnType<typeof fetchLearningActivity>>) => {
    window.dispatchEvent(new CustomEvent(LEARNING_ACTIVITY_EVENT, { detail: { userId, activity } }))
  }, [])

  const syncActivity = useCallback(async (force = false) => {
    const userId = userIdRef.current
    const pending = pendingRef.current
    if (!userId || syncingRef.current) return
    if (!force && pending.activeSeconds < SYNC_AFTER_SECONDS && pending.wordLookups < 5) return
    if (pending.activeSeconds === 0 && pending.wordLookups === 0) return

    const activeSeconds = Math.min(120, Math.floor(pending.activeSeconds))
    const videoSeconds = Math.min(activeSeconds, Math.floor(pending.videoSeconds))
    const readingSeconds = Math.min(activeSeconds - videoSeconds, Math.floor(pending.readingSeconds))
    const wordLookups = Math.min(100, Math.floor(pending.wordLookups))
    const snapshot = { activeSeconds, readingSeconds, videoSeconds, wordLookups }
    pendingRef.current = {
      activeSeconds: pending.activeSeconds - activeSeconds,
      readingSeconds: pending.readingSeconds - readingSeconds,
      videoSeconds: pending.videoSeconds - videoSeconds,
      wordLookups: pending.wordLookups - wordLookups,
    }
    syncingRef.current = true

    try {
      const activity = await recordActiveLearning({
        date: localDateKey(new Date()),
        ...snapshot,
      })
      if (userIdRef.current === userId) publish(userId, activity)
    } catch (error) {
      if (userIdRef.current === userId) {
        pendingRef.current.activeSeconds += snapshot.activeSeconds
        pendingRef.current.readingSeconds += snapshot.readingSeconds
        pendingRef.current.videoSeconds += snapshot.videoSeconds
        pendingRef.current.wordLookups += snapshot.wordLookups
      }
      console.error('Unable to save learning activity:', error)
    } finally {
      syncingRef.current = false
    }
  }, [publish])

  useEffect(() => {
    if (loading || !user?.id) return
    let cancelled = false
    void fetchLearningActivity()
      .then((activity) => {
        if (!cancelled && userIdRef.current === user.id) publish(user.id, activity)
      })
      .catch((error: unknown) => console.error('Unable to load learning activity:', error))
    return () => { cancelled = true }
  }, [loading, publish, user?.id])

  useEffect(() => {
    if (loading || !user?.id) return

    pendingRef.current = { ...EMPTY_PENDING }
    lastTickRef.current = Date.now()
    lastInteractionRef.current = Date.now()

    const noteInteraction = () => { lastInteractionRef.current = Date.now() }
    const noteWordLookup = () => {
      noteInteraction()
      pendingRef.current.wordLookups += 1
      void syncActivity()
    }
    const captureElapsed = (now: number, visible = document.visibilityState === 'visible') => {
      const elapsedSeconds = Math.min(30, Math.max(0, (now - lastTickRef.current) / 1000))
      lastTickRef.current = now
      const kind = activityKindForPath(pathnameRef.current, videoPlayingRef.current)
      if (!shouldCountActiveTime({
        visible,
        kind,
        now,
        lastInteractionAt: lastInteractionRef.current,
      })) return

      pendingRef.current.activeSeconds += elapsedSeconds
      if (kind === 'reading') pendingRef.current.readingSeconds += elapsedSeconds
      if (kind === 'video') pendingRef.current.videoSeconds += elapsedSeconds
    }
    const handleVisibilityChange = () => {
      const now = Date.now()
      if (document.visibilityState === 'hidden') {
        captureElapsed(now, true)
        void syncActivity(true)
      } else {
        lastTickRef.current = now
        noteInteraction()
      }
    }
    const tick = () => {
      const now = Date.now()
      captureElapsed(now)
      void syncActivity()
    }

    const interactionEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart']
    interactionEvents.forEach((event) => window.addEventListener(event, noteInteraction, { passive: true }))
    window.addEventListener(WORD_LOOKUP_EVENT, noteWordLookup)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    const interval = window.setInterval(tick, TICK_INTERVAL_MS)

    return () => {
      captureElapsed(Date.now())
      window.clearInterval(interval)
      interactionEvents.forEach((event) => window.removeEventListener(event, noteInteraction))
      window.removeEventListener(WORD_LOOKUP_EVENT, noteWordLookup)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void syncActivity(true)
    }
  }, [loading, syncActivity, user?.id])

  return null
}
