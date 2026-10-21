'use client'

import Link from 'next/link'
import { Box, Typography } from '@mui/material'
import { AutoStories } from '@mui/icons-material'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'
import type { LibraryBook } from '@/app/books/BooksLibrary'

export const LIBRARY_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(160px, 1fr))', lg: 'repeat(auto-fill, minmax(180px, 1fr))' },
  gap: { xs: 2, sm: 3 },
} as const

export default function LibraryBookCard({ book, listen = false }: { book: LibraryBook; listen?: boolean }) {
  // Enter audio-first pages with a fresh document so in-flight shell actions
  // cannot restore the library tree while a private playback URL is resolving.
  // The Read/Listen mode switch itself remains an App Router transition.
  return <Box component={listen ? 'a' : Link} href={`/${listen ? 'listen' : 'books'}/${encodeURIComponent(book.slug)}`} sx={{ display: 'block', color: 'inherit', textDecoration: 'none', minWidth: 0, borderRadius: '10px', transition: 'box-shadow .2s ease', '&:focus-visible': { outline: '2px solid var(--awm-forest)', outlineOffset: 4 }, '@media (hover: hover) and (pointer: fine)': { '&:hover': { boxShadow: '0 0 24px 5px color-mix(in srgb, var(--awm-forest) 20%, transparent)', animation: 'awm-book-breathe 2s ease-in-out infinite' } }, '@keyframes awm-book-breathe': { '0%, 100%': { boxShadow: '0 0 24px 5px color-mix(in srgb, var(--awm-forest) 20%, transparent)' }, '50%': { boxShadow: '0 0 18px 3px color-mix(in srgb, var(--awm-forest) 14%, transparent)' } }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { animation: 'none' } } }}>
    {book.cover ? <Box component="img" src={book.cover} alt={`${book.title} cover`} sx={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', display: 'block', borderRadius: '10px', ...thumbnailCropCss(book.coverCrop) }} />
      : <Box sx={{ aspectRatio: '2 / 3', display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: 'var(--awm-forest)', color: 'var(--awm-white)' }}><AutoStories sx={{ fontSize: 44 }} /></Box>}
    <Typography sx={{ mt: .65, px: .25, fontFamily: 'var(--font-sans)', fontSize: { xs: 13, sm: 14 }, lineHeight: 1.35, fontWeight: 500, color: 'var(--awm-bark)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.title}</Typography>
  </Box>
}
