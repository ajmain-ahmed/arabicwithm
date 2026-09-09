'use client'

import Link from 'next/link'
import { Box, Button, Typography } from '@mui/material'
import { AutoStories, Translate } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import type { PublicChapter } from '@/app/actions/books'
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
  const { user } = useAuth()
  const savedProgress = user ? progressForBook(user.user_metadata, bookSlug) : null
  const savedChapter = savedProgress?.chapterSlug && chapters.some((chapter) => chapter.slug === savedProgress.chapterSlug)
    ? savedProgress.chapterSlug
    : null
  const destination = savedChapter ?? chapters[0]?.slug
  const currentChapter = savedChapter ? chapters.find((chapter) => chapter.slug === savedChapter) : null

  if (!destination) return null

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
        <Button component={Link} href={`/books/${encodeURIComponent(bookSlug)}/${encodeURIComponent(destination)}?lang=en`} variant="contained" startIcon={<Translate />} sx={{ minHeight: 44, bgcolor: 'var(--awm-cream)', color: 'var(--awm-bark)', borderRadius: '9px', px: 2.25, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: 'var(--awm-cream-light)' }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 55%, transparent)', outlineOffset: 2 } }}>Read in English</Button>
      </Box>

      <Box sx={{ mt: 1.25, display: 'grid', gridTemplateColumns: '1fr', gap: 1, maxWidth: 390 }}>
        <PdfDownloadButton bookSlug={bookSlug} language="ar" label="Arabic PDF" small fullWidth />
      </Box>
    </>
  )
}
