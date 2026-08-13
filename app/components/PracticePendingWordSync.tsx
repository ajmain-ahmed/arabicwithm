'use client'

import { useEffect, useRef } from 'react'
import { savePracticeWord } from '@/app/actions/practice'
import { useAuth } from '@/app/AuthContext'
import { PENDING_PRACTICE_WORD_KEY, type PracticeWordInput } from '@/app/lib/practice'
import { supabase } from '@/app/lib/supabase/client'

export default function PracticePendingWordSync() {
  const { user, loading } = useAuth()
  const syncing = useRef(false)

  useEffect(() => {
    if (loading || !user || syncing.current) return

    let pending: PracticeWordInput | null = null
    try {
      const raw = window.sessionStorage.getItem(PENDING_PRACTICE_WORD_KEY)
      pending = raw ? JSON.parse(raw) as PracticeWordInput : null
    } catch {
      window.sessionStorage.removeItem(PENDING_PRACTICE_WORD_KEY)
    }
    if (!pending) return

    syncing.current = true
    void savePracticeWord(pending)
      .then(async () => {
        window.sessionStorage.removeItem(PENDING_PRACTICE_WORD_KEY)
        await supabase.auth.refreshSession()
      })
      .finally(() => {
        syncing.current = false
      })
  }, [loading, user])

  return null
}
