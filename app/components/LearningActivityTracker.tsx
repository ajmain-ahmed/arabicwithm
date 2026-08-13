'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/app/AuthContext'
import {
  LEARNING_ACTIVITY_EVENT,
  LEARNING_ACTIVITY_METADATA_KEY,
  addActivity,
  parseLearningActivity,
} from '@/app/lib/activity'
import { supabase } from '@/app/lib/supabase/client'

const TICK_INTERVAL_MS = 15_000
const SYNC_AFTER_SECONDS = 60

export default function LearningActivityTracker() {
  const { user, loading } = useAuth()
  const userRef = useRef(user)
  const pendingSecondsRef = useRef(0)
  const syncingRef = useRef(false)
  const lastTickRef = useRef(0)

  useEffect(() => {
    userRef.current = user
  }, [user])

  const syncActivity = useCallback(async (force = false) => {
    const currentUser = userRef.current
    if (!currentUser || syncingRef.current) return

    const seconds = Math.floor(pendingSecondsRef.current)
    const current = parseLearningActivity(currentUser.user_metadata)
    const next = addActivity(current, seconds)
    const dateAlreadyRecorded = next.activeDates.length === current.activeDates.length
    if (!force && seconds < SYNC_AFTER_SECONDS) return
    if (seconds === 0 && dateAlreadyRecorded) return

    syncingRef.current = true
    pendingSecondsRef.current = Math.max(0, pendingSecondsRef.current - seconds)
    const { data, error } = await supabase.auth.updateUser({
      data: { [LEARNING_ACTIVITY_METADATA_KEY]: next },
    })
    syncingRef.current = false

    if (error) {
      pendingSecondsRef.current += seconds
      console.error('Unable to save learning activity:', error.message)
      return
    }

    if (data.user?.id !== currentUser.id) return
    userRef.current = data.user
    window.dispatchEvent(new CustomEvent(LEARNING_ACTIVITY_EVENT, {
      detail: { userId: currentUser.id, activity: next },
    }))
  }, [])

  useEffect(() => {
    if (loading || !user?.id) return

    pendingSecondsRef.current = 0
    lastTickRef.current = Date.now()
    const handleVisibilityChange = () => {
      lastTickRef.current = Date.now()
      if (document.visibilityState === 'hidden') void syncActivity(true)
    }

    const interval = window.setInterval(() => {
      const now = Date.now()
      const elapsedSeconds = Math.min(30, Math.max(0, (now - lastTickRef.current) / 1000))
      lastTickRef.current = now
      if (document.visibilityState === 'visible') {
        pendingSecondsRef.current += elapsedSeconds
      }
      void syncActivity()
    }, TICK_INTERVAL_MS)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    void syncActivity(true)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void syncActivity(true)
    }
  }, [loading, syncActivity, user?.id])

  return null
}
