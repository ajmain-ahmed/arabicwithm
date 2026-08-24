'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Box, Button, Snackbar, Typography } from '@mui/material'
import { AutoStories, RemoveCircleOutlined, Translate } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { supabase } from '@/app/lib/supabase/client'
import type { PublicChapter } from '@/app/actions/books'
import {
  BOOK_SENTENCE_BOOKMARK_EVENT,
  BOOK_SENTENCE_BOOKMARK_STORAGE_KEY,
  parseBookSentenceBookmark,
} from '@/app/lib/bookSentenceBookmark'
import PdfDownloadButton from '@/app/components/PdfDownloadButton'

interface BookProgressEntry {
  chapterSlug?: string
  updatedAt?: string
}

function progressForBook(metadata: Record<string, unknown>, bookSlug: string): BookProgressEntry | null {
  const progress = metadata.book_progress
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return null
  const entry = (progress as Record<string, unknown>)[bookSlug]
  return entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as BookProgressEntry : null
}

export default function BookReadingCta({ bookSlug, chapters }: { bookSlug: string; chapters: PublicChapter[] }) {
  const { user, loading } = useAuth()
  const [removed, setRemoved] = useState(false)
  const [notice, setNotice] = useState('')
  const savedProgress = user ? progressForBook(user.user_metadata, bookSlug) : null
  const savedChapter = !removed && savedProgress?.chapterSlug && chapters.some((chapter) => chapter.slug === savedProgress.chapterSlug)
    ? savedProgress.chapterSlug
    : null
  const destination = savedChapter ?? chapters[0]?.slug
  const currentChapter = savedChapter ? chapters.find((chapter) => chapter.slug === savedChapter) : null

  if (!destination) return null

  const removeFromList = async () => {
    if (!user) return
    setRemoved(true)
    setNotice('Removed from Currently Reading')

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
      // Account metadata is still updated below.
    }
    const accountBookmark = parseBookSentenceBookmark(user.user_metadata.book_sentence_bookmark)
    clearsBookmark ||= accountBookmark?.bookSlug === bookSlug

    const { error } = await supabase.auth.updateUser({
      data: {
        book_progress: nextProgress,
        ...(clearsBookmark ? { book_sentence_bookmark: null } : {}),
      },
    })
    if (error) {
      setRemoved(false)
      setNotice('Unable to remove this book')
    }
  }

  return (
    <>
      {currentChapter ? (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>Currently reading</Typography>
          <Typography sx={{ mt: 0.4, color: 'var(--awm-bark)', fontFamily: 'Jost, sans-serif', fontSize: 14, fontWeight: 600 }}>{currentChapter.title} · Chapter {currentChapter.chapterNumber} of {chapters.length}</Typography>
        </Box>
      ) : (
        <Typography sx={{ mb: 2, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 13 }}>Choose a language to begin reading.</Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button component={Link} href={`/books/${encodeURIComponent(bookSlug)}/${encodeURIComponent(destination)}?lang=ar`} variant="contained" startIcon={<AutoStories />} sx={{ minHeight: 44, bgcolor: '#b8860b', color: '#fff', borderRadius: '9px', px: 2.25, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#946c08' } }}>Read in Arabic</Button>
        <Button component={Link} href={`/books/${encodeURIComponent(bookSlug)}/${encodeURIComponent(destination)}?lang=en`} variant="outlined" startIcon={<Translate />} sx={{ minHeight: 44, color: '#0e2e1f', borderColor: 'rgba(14,46,31,.35)', borderRadius: '9px', px: 2.25, textTransform: 'none', fontWeight: 700 }}>Read in English</Button>
      </Box>

      <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <PdfDownloadButton bookSlug={bookSlug} language="ar" label="Download Book · Arabic" small />
        <PdfDownloadButton bookSlug={bookSlug} language="en" label="Download Book · English" small />
        {!loading && user && currentChapter && (
          <Button onClick={() => void removeFromList()} startIcon={<RemoveCircleOutlined />} size="small" sx={{ color: '#9a4038', textTransform: 'none' }}>Remove from List</Button>
        )}
      </Box>

      <Snackbar open={Boolean(notice)} autoHideDuration={1800} onClose={() => setNotice('')} message={notice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </>
  )
}
