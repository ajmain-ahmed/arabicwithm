'use client'

import { useState } from 'react'
import { Button, Snackbar } from '@mui/material'
import { RemoveCircleOutlined } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { supabase } from '@/app/lib/supabase/client'
import { hideReadingListEntry, parseReadingList } from '@/app/lib/readingList'

interface BookProgressEntry {
  chapterSlug?: string
  hiddenFromList?: boolean
}

function hasSavedProgress(metadata: Record<string, unknown>, bookSlug: string): boolean {
  const progress = metadata.book_progress
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return false
  const entry = (progress as Record<string, unknown>)[bookSlug]
  return Boolean(entry && typeof entry === 'object' && !Array.isArray(entry) && (entry as BookProgressEntry).chapterSlug && !(entry as BookProgressEntry).hiddenFromList)
}

export default function BookListRemovalButton({ bookSlug, onRemoved }: { bookSlug: string; onRemoved?: () => void }) {
  const { user, loading } = useAuth()
  const [removed, setRemoved] = useState(false)
  const [notice, setNotice] = useState('')
  const [removing, setRemoving] = useState(false)

  if (loading || !user || removed || !hasSavedProgress(user.user_metadata, bookSlug)) return null

  const removeFromList = async () => {
    setRemoving(true)
    try {
      const { data: current, error: lookupError } = await supabase.auth.getUser()
      if (lookupError || !current.user || current.user.id !== user.id) throw new Error('Sign in again')
      const progress = parseReadingList(current.user.user_metadata.book_progress)
      const { error } = await supabase.auth.updateUser({ data: { book_progress: hideReadingListEntry(progress, bookSlug) } })
      if (error) throw error
      setRemoved(true); onRemoved?.(); setNotice('Removed from Currently Reading. Your reading history is saved.')
    } catch { setNotice('Unable to remove this book. Please try again.') }
    finally { setRemoving(false) }
  }

  return (
    <>
      <Button
        onClick={() => void removeFromList()}
        disabled={removing}
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
