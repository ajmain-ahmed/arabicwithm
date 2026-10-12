'use client'

import { useEffect } from 'react'
import { useAuth } from '@/app/AuthContext'
import { supabase } from '@/app/lib/supabase/client'

interface ProgressEntry {
  chapterSlug: string
  updatedAt: string
  hiddenFromList?: boolean
}

export default function ReadingProgress({ bookSlug, chapterSlug }: { bookSlug: string; chapterSlug: string }) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading || !user) return

    const metadata = user.user_metadata
    const rawProgress = metadata.book_progress
    const progress = rawProgress && typeof rawProgress === 'object' && !Array.isArray(rawProgress)
      ? rawProgress as Record<string, ProgressEntry>
      : {}

    if (progress[bookSlug]?.chapterSlug === chapterSlug && !progress[bookSlug]?.hiddenFromList) return

    void supabase.auth.updateUser({
      data: {
        book_progress: {
          ...progress,
          [bookSlug]: {
            ...progress[bookSlug],
            chapterSlug,
            updatedAt: new Date().toISOString(),
            hiddenFromList: false,
          },
        },
      },
    }).then(({ error }: { error: { message: string } | null }) => {
      if (error) console.error('Unable to save reading progress:', error.message)
    }).catch(() => { console.error('Unable to save reading progress: network request failed') })
  }, [bookSlug, chapterSlug, loading, user])

  return null
}
