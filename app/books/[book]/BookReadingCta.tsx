'use client'

import Link from 'next/link'
import { useEffect, type MouseEvent } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { AutoStories, PlayArrow, Translate } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import type { PublicChapter } from '@/app/actions/books'
import PdfDownloadButton from '@/app/components/PdfDownloadButton'
import BookReviewButton from './BookReviewButton'
import BookMyListToggle from './BookMyListToggle'
import { bookReaderHref } from '@/app/lib/bookReaderSettings'
import { useReadingProgressStore } from '@/store/readingProgressStore'

const languageButtonSx = {
  minHeight: 52, fontSize: 15, bgcolor: '#b8860b', color: '#fff',
  borderRadius: '9px', px: 2.25, textTransform: 'none', fontWeight: 700,
  '&:hover': { bgcolor: '#946c08' },
  '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 55%, transparent)', outlineOffset: 2 },
} as const

interface BookProgressEntry {
  chapterSlug?: string
  page?: number
  blockIndex?: number
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
  const savedBlock=trackedPosition?.blockIndex??savedProgress?.blockIndex
  const savedPage = trackedPosition?.page ?? savedProgress?.page
  const savedChapter = savedChapterSlug && chapters.some((chapter) => chapter.slug === savedChapterSlug)
    ? savedChapterSlug
    : null
  const resumeParams=new URLSearchParams()
  if(savedPage&&savedPage>=2)resumeParams.set('page',String(savedPage))
  if(typeof savedBlock==='number'&&Number.isInteger(savedBlock)&&savedBlock>=0)resumeParams.set('block',String(savedBlock))
  const resumeQuery=resumeParams.toString()
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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, width: '100%' }}>
        {user && savedChapter && (
          <Button
            component={Link}
            disabled={loading}
            prefetch={!loading}
            onClick={requireSignIn}
            href={`/books/${encodeURIComponent(bookSlug)}/${encodeURIComponent(savedChapter)}${resumeQuery?`?${resumeQuery}`:''}`}
            variant="contained"
            startIcon={<PlayArrow />}
            sx={{
              gridColumn: '1 / -1',
              minHeight: 48,
              bgcolor: '#0e2e1f',
              color: '#fff',
              borderRadius: '9px',
              px: 2.25,
              textTransform: 'none',
              fontWeight: 800,
              '&:hover': { bgcolor: '#174832' },
            }}
          >
            Continue
          </Button>
        )}
        <Button component={Link} disabled={loading} prefetch={Boolean(user) && !loading} onClick={requireSignIn} href={bookReaderHref(bookSlug, destination, 'ar', savedPage,savedBlock)} variant="contained" startIcon={<AutoStories />} sx={languageButtonSx}>Arabic</Button>
        <Button component={Link} disabled={loading} prefetch={Boolean(user) && !loading} onClick={requireSignIn} href={bookReaderHref(bookSlug, destination, 'en', savedPage,savedBlock)} variant="contained" startIcon={<Translate />} sx={languageButtonSx}>English</Button>
      </Box>
      {/* Secondary actions share a row so the wide desktop box breathes. */}
      <Box role="group" aria-label="Book actions" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mt: 1.25, width: '100%', alignItems: 'start',
        '& .book-detail-action': { width:'100%',minWidth:0,height:48,minHeight:48,px:1,py:1,borderRadius:'9px',border:'1px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)',bgcolor:'transparent',color:'var(--awm-bark)',boxShadow:'none',fontFamily:'var(--font-sans), sans-serif',fontSize:13,fontWeight:600,textTransform:'none',whiteSpace:'nowrap','& .MuiButton-startIcon':{mr:.5,ml:0},'& .MuiSvgIcon-root':{fontSize:18},'&:hover':{bgcolor:'color-mix(in srgb, var(--awm-gold) 8%, transparent)',boxShadow:'none'},'&:active':{bgcolor:'color-mix(in srgb, var(--awm-gold) 16%, transparent)'},'&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:2} },
        '& .book-detail-action[aria-pressed="true"]':{bgcolor:'var(--awm-forest)',color:'var(--awm-white)','&:hover':{bgcolor:'var(--awm-forest)'}},
      }}>
        <BookMyListToggle bookSlug={bookSlug} />
        <PdfDownloadButton bookSlug={bookSlug} language="ar" label="PDF" className="book-detail-action" small fullWidth />
        <BookReviewButton bookId={bookId} />
      </Box>
    </>
  )
}
