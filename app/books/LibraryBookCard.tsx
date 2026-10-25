'use client'

import Link from 'next/link'
import { Box, Typography } from '@mui/material'
import { AutoStories } from '@mui/icons-material'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'
import type { LibraryBook } from '@/app/books/BooksLibrary'

export const LIBRARY_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(175px, 1fr))', lg: 'repeat(auto-fill, minmax(200px, 1fr))' },
  gap: { xs: 2, sm: 3 }, overflow: 'visible', py: 1,
} as const

export default function LibraryBookCard({ book, listen = false, compact = false }: { book: LibraryBook; listen?: boolean; compact?: boolean }) {
  // Enter audio-first pages with a fresh document so in-flight shell actions
  // cannot restore the library tree while a private playback URL is resolving.
  // The Read/Listen mode switch itself remains an App Router transition.
  return <Box component={listen ? 'a' : Link} href={`/${listen ? 'listen' : 'books'}/${encodeURIComponent(book.slug)}`} sx={{ display: 'block', color: 'inherit', textDecoration: 'none', minWidth: 0, borderRadius: '10px', position: 'relative', transition: 'transform .2s ease, box-shadow .2s ease', '&:focus-visible': { boxShadow: '0 0 24px 5px color-mix(in srgb, var(--awm-forest) 20%, transparent)', outline: '2px solid var(--awm-forest)', outlineOffset: 4 }, '@media (hover: hover) and (pointer: fine)': { '&:hover': { boxShadow: '0 0 24px 5px color-mix(in srgb, var(--awm-forest) 20%, transparent)', transform: 'translateY(-2px) scale(1.025)', zIndex: 1 } }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { animation: 'none', transform: 'none' } } }}>
    {book.cover ? <Box component="img" src={book.cover} alt={`${book.title} cover`} sx={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', display: 'block', borderRadius: '10px', ...thumbnailCropCss(book.coverCrop) }} />
      : <Box sx={{ aspectRatio: '2 / 3', display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: 'var(--awm-forest)', color: 'var(--awm-white)' }}><AutoStories sx={{ fontSize: 44 }} /></Box>}
    <Typography sx={{ textAlign: compact ? 'center' : undefined, mt: .65, px: .25, fontFamily: 'var(--font-sans)', fontSize: { xs: 13, sm: 14 }, lineHeight: 1.35, fontWeight: 500, color: 'var(--awm-bark)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.title}</Typography>
  </Box>
}
