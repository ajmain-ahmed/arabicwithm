'use client'

import Link from 'next/link'
import type { MouseEvent } from 'react'
import { Box, Typography } from '@mui/material'
import { AutoStories, ConstructionRounded, HeadphonesOutlined } from '@mui/icons-material'
import type { AudioLanguage } from '@/app/lib/audioUpload'
import { useAuth } from '@/app/AuthContext'
import type { LibraryBook } from '@/app/books/BooksLibrary'
import { coverImageSrcSet } from '@/app/lib/imageVariantPaths'

export const LIBRARY_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(175px, 1fr))', lg: 'repeat(auto-fill, minmax(200px, 1fr))' },
  gap: { xs: 1.25, sm: 3 }, overflow: 'visible', py: 1,
  '@media (max-width: 299px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
} as const

function AudioBadge({ languages, alignRight = false }: { languages: AudioLanguage[]; alignRight?: boolean }) {
  if (!languages.length) return null
  const names = languages.map(language => language === 'ar' ? 'Arabic' : 'English').join(' and ')
  return <Box role="img" aria-label={`Audiobook available in ${names}`} sx={{ position: 'absolute', left: alignRight ? undefined : 8, right: alignRight ? 8 : undefined, top: 8, zIndex: 1, display: 'flex', alignItems: 'center', width: 28, height: 28, p: 0, justifyContent: 'center', borderRadius: '999px', bgcolor: 'rgba(14,46,31,0.9)', color: '#fff', border: '1px solid rgba(212,168,67,0.65)', boxShadow: '0 2px 8px rgba(0,0,0,0.18)', backdropFilter: 'blur(6px)', fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1 }}>
    <HeadphonesOutlined sx={{ fontSize: 16 }} />
  </Box>
}

function ProductionBadge() {
  return <Box role="img" aria-label="In production — coming soon" title="In production — coming soon" sx={{ position: 'absolute', left: 8, top: 8, zIndex: 1, display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: '999px', bgcolor: 'rgba(44,26,14,0.9)', color: 'var(--awm-gold-light)', border: '1px solid rgba(212,168,67,0.65)', boxShadow: '0 2px 8px rgba(0,0,0,0.18)', backdropFilter: 'blur(6px)' }}>
    <ConstructionRounded sx={{ fontSize: 16 }} />
  </Box>
}

export default function LibraryBookCard({ book, listen = false, compact = false, audioLanguages = [] }: { book: LibraryBook; listen?: boolean; compact?: boolean; audioLanguages?: AudioLanguage[] }) {
  // Enter audio-first pages with a fresh document so in-flight shell actions
  // cannot restore the library tree while a private playback URL is resolving.
  // The Read/Listen mode switch itself remains an App Router transition.
  const { user, loading } = useAuth()
  /* Guests tapping a Listen card get the auth dialog instead of a wall page. */
  const requireSignIn = (event: MouseEvent) => {
    if (!listen || user) return
    event.preventDefault()
    if (!loading) window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))
  }
  const badges = <>
    {book.isCompleted === false && <ProductionBadge />}
    <AudioBadge languages={audioLanguages} alignRight={book.isCompleted === false} />
  </>
  return <Box component={listen ? 'a' : Link} href={`/${listen ? 'listen' : 'books'}/${encodeURIComponent(book.slug)}`} prefetch={listen ? undefined : false} onClick={requireSignIn} sx={{ display: 'block', color: 'inherit', textDecoration: 'none', minWidth: 0, borderRadius: '10px', position: 'relative', '&:focus-visible': { boxShadow: '0 0 24px 5px color-mix(in srgb, var(--awm-forest) 20%, transparent)', outline: '2px solid var(--awm-forest)', outlineOffset: 4 } }}>
    {book.cover ? (
      /* The aspect-ratio box sizes the slot; the image lazy-loads on
         approach via native lazy loading. Covers are already WebP; serve the
         cached cover endpoint directly rather than metered transformations. */
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '2 / 3', borderRadius: '10px', overflow: 'hidden' }}>
        <Box
          component="img"
          src={book.cover}
          srcSet={coverImageSrcSet(book.cover)}
          alt={`${book.title} cover`}
          loading="lazy"
          decoding="async"
          sizes={compact ? '(max-width: 600px) 33vw, 200px' : '(max-width: 600px) 50vw, (max-width: 1200px) 200px, 240px'}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {badges}
      </Box>
    )
      : <Box sx={{ position: 'relative', aspectRatio: '2 / 3', display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: 'var(--awm-forest)', color: 'var(--awm-white)' }}><AutoStories sx={{ fontSize: 44 }} />{badges}</Box>}
    <Typography sx={{ textAlign: !listen || compact ? 'center' : undefined, mt: .65, px: .25, fontFamily: 'var(--font-sans)', fontSize: { xs: 13, sm: 14 }, lineHeight: 1.35, fontWeight: 500, color: 'var(--awm-bark)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.title}</Typography>
  </Box>
}
