'use client'

import Link from 'next/link'
import { useEffect, type MouseEvent } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { AutoStories, Translate } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import type { PublicChapter } from '@/app/actions/books'
import PdfDownloadButton from '@/app/components/PdfDownloadButton'
import BookReviewButton from './BookReviewButton'
import { bookReaderHref } from '@/app/lib/bookReaderSettings'
import { useReadingProgressStore } from '@/store/readingProgressStore'

interface BookProgressEntry {
  chapterSlug?: string
  page?: number
}

function progressForBook(metadata: Record<string, unknown>, bookSlug: string): BookProgressEntry | null {
  const progress = metadata.book_progress
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return null
  const entry = (progress as Record<string, unknown>)[bookSlug]
  return entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as BookProgressEntry : null
}

export default function BookReadingCta({ bookSlug, bookId, chapters }: { bookSlug: string; bookId: string; chapters: PublicChapter[] }) {
  const { user, loading } = useAuth()
  /* The session store updates as the reader tracks pages; metadata is the
     fallback from the last synced session. */
  const trackedPosition = useReadingProgressStore((state) => state.positions[bookSlug])
  useEffect(() => {
    if (user) useReadingProgressStore.getState().hydrateFromMetadata(user.user_metadata)
  }, [user])

  const savedProgress = user ? progressForBook(user.user_metadata, bookSlug) : null
  const savedChapterSlug = trackedPosition?.chapterSlug ?? savedProgress?.chapterSlug
  const savedPage = trackedPosition?.page ?? savedProgress?.page
  const savedChapter = savedChapterSlug && chapters.some((chapter) => chapter.slug === savedChapterSlug)
    ? savedChapterSlug
    : null
  const destination = savedChapter ?? chapters[0]?.slug
  const currentChapter = savedChapter ? chapters.find((chapter) => chapter.slug === savedChapter) : null

  if (!destination) return null
  const requireSignIn = (event: MouseEvent<HTMLAnchorElement>) => {
    if (loading) {
      event.preventDefault()
      return
    }
    if (user) return
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))
  }

  return (
    <>
      {currentChapter ? (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>Currently reading</Typography>
          <Typography sx={{ mt: 0.4, color: 'var(--awm-bark)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 14, fontWeight: 600 }}>{currentChapter.title} · Chapter {currentChapter.chapterNumber} of {chapters.length}</Typography>
        </Box>
      ) : (
        <Typography sx={{ mb: 2, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 13 }}>Choose a language to begin reading.</Typography>
      )}

      <Box sx={{ display: 'inline-grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, maxWidth: '100%' }}>
        <Button component={Link} disabled={loading} prefetch={Boolean(user) && !loading} onClick={requireSignIn} href={bookReaderHref(bookSlug, destination, 'ar', savedPage)} variant="contained" startIcon={<AutoStories />} sx={{ minHeight: 44, bgcolor: '#b8860b', color: '#fff', borderRadius: '9px', px: 2.25, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#946c08' } }}>Read in Arabic</Button>
        <Button component={Link} disabled={loading} prefetch={Boolean(user) && !loading} onClick={requireSignIn} href={bookReaderHref(bookSlug, destination, 'en', savedPage)} variant="contained" startIcon={<Translate />} sx={{ minHeight: 44, bgcolor: 'var(--awm-cream)', color: 'var(--awm-bark)', borderRadius: '9px', px: 2.25, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: 'var(--awm-cream-light)' }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 55%, transparent)', outlineOffset: 2 } }}>Read in English</Button>
      <Box sx={{ gridColumn: '1 / -1', mt: 0.25, display:'grid', gridTemplateColumns:{xs:'1fr',sm:'repeat(2,minmax(0,1fr))'},gap:1,alignItems:'start' }}>
        <PdfDownloadButton bookSlug={bookSlug} language="ar" label="Download PDF" small fullWidth />
        <BookReviewButton bookId={bookId} />
      </Box>
      </Box>
    </>
  )
}
