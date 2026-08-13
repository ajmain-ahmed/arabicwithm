'use client'

import Link from 'next/link'
import { Button } from '@mui/material'
import { AutoStories } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'

interface BookProgressEntry {
  chapterSlug?: string
}

function savedChapterForBook(metadata: Record<string, unknown>, bookSlug: string): string | null {
  const progress = metadata.book_progress
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return null

  const entry = (progress as Record<string, unknown>)[bookSlug]
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null

  const chapterSlug = (entry as BookProgressEntry).chapterSlug
  return typeof chapterSlug === 'string' ? chapterSlug : null
}

export default function BookReadingCta({
  bookSlug,
  chapterSlugs,
}: {
  bookSlug: string
  chapterSlugs: string[]
}) {
  const { user, loading } = useAuth()
  const savedChapter = user ? savedChapterForBook(user.user_metadata, bookSlug) : null
  const continueChapter = savedChapter && chapterSlugs.includes(savedChapter) ? savedChapter : null
  const destination = continueChapter ?? chapterSlugs[0]

  if (!destination) return null

  return (
    <Button
      component={Link}
      href={`/books/${encodeURIComponent(bookSlug)}/${encodeURIComponent(destination)}`}
      variant="contained"
      startIcon={<AutoStories />}
      sx={{
        mt: { xs: 3, md: 0 },
        alignSelf: { xs: 'stretch', md: 'flex-end' },
        minWidth: 160,
        bgcolor: '#b8860b',
        color: '#fff',
        borderRadius: '8px',
        px: 3,
        py: 1.2,
        fontFamily: 'Jost, sans-serif',
        fontWeight: 700,
        textTransform: 'none',
        '&:hover': { bgcolor: '#946c08' },
      }}
    >
      {!loading && continueChapter ? 'Continue Reading' : 'Start Reading'}
    </Button>
  )
}
