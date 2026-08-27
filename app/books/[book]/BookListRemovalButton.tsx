'use client'

import { useState } from 'react'
import { Button, Snackbar } from '@mui/material'
import { RemoveCircleOutlined } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { supabase } from '@/app/lib/supabase/client'
import {
  BOOK_SENTENCE_BOOKMARK_EVENT,
  BOOK_SENTENCE_BOOKMARK_STORAGE_KEY,
  parseBookSentenceBookmark,
} from '@/app/lib/bookSentenceBookmark'

interface BookProgressEntry {
  chapterSlug?: string
}

function hasSavedProgress(metadata: Record<string, unknown>, bookSlug: string): boolean {
  const progress = metadata.book_progress
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return false
  const entry = (progress as Record<string, unknown>)[bookSlug]
  return Boolean(entry && typeof entry === 'object' && !Array.isArray(entry) && (entry as BookProgressEntry).chapterSlug)
}

export default function BookListRemovalButton({ bookSlug }: { bookSlug: string }) {
  const { user, loading } = useAuth()
  const [removed, setRemoved] = useState(false)
  const [notice, setNotice] = useState('')

  if (loading || !user || removed || !hasSavedProgress(user.user_metadata, bookSlug)) return null

  const removeFromList = async () => {
    const rawProgress = user.user_metadata.book_progress
    const nextProgress = rawProgress && typeof rawProgress === 'object' && !Array.isArray(rawProgress)
      ? { ...(rawProgress as Record<string, unknown>) }
      : {}
    delete nextProgress[bookSlug]

    let clearsBookmark = false
    try {
      const localBookmark = parseBookSentenceBookmark(window.localStorage.getItem(BOOK_SENTENCE_BOOKMARK_STORAGE_KEY))
      if (localBookmark?.bookSlug === bookSlug) {
        clearsBookmark = true
        window.localStorage.removeItem(BOOK_SENTENCE_BOOKMARK_STORAGE_KEY)
        window.dispatchEvent(new CustomEvent(BOOK_SENTENCE_BOOKMARK_EVENT, { detail: null }))
      }
    } catch {
      // The account bookmark is still cleared below when needed.
    }
    clearsBookmark ||= parseBookSentenceBookmark(user.user_metadata.book_sentence_bookmark)?.bookSlug === bookSlug

    const { error } = await supabase.auth.updateUser({
      data: {
        book_progress: nextProgress,
        ...(clearsBookmark ? { book_sentence_bookmark: null } : {}),
      },
    })
    if (error) {
      setNotice('Unable to remove this book')
      return
    }
    setRemoved(true)
    setNotice('Removed from Currently Reading')
  }

  return (
    <>
      <Button
        onClick={() => void removeFromList()}
        startIcon={<RemoveCircleOutlined />}
        size="small"
        variant="text"
        sx={{ mt: 1.25, width: '100%', color: 'var(--awm-error)', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
      >
        Remove from List
      </Button>
      <Snackbar open={Boolean(notice)} autoHideDuration={1800} onClose={() => setNotice('')} message={notice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </>
  )
}
