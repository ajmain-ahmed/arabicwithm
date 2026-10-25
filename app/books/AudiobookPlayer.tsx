'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material'
import { SkipNextRounded, SkipPreviousRounded } from '@mui/icons-material'
import { type PublicChapter } from '@/app/actions/books'
import { type ChapterAudioSummary } from '@/app/actions/audiobooks'
import ChapterAudioPlayer from '@/app/books/[book]/[chapter]/ChapterAudioPlayer'
import { bookReaderHref } from '@/app/lib/bookReaderSettings'
import type { LibraryBook } from '@/app/books/BooksLibrary'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'

export default function AudiobookPlayer({ book, chapters, audio }: { book: LibraryBook; chapters: PublicChapter[]; audio: ChapterAudioSummary[] }) {
  const [language, setLanguage] = useState<'ar' | 'en'>(audio.some(item => item.language === 'ar') ? 'ar' : 'en')
  const [chapterId, setChapterId] = useState<string | null>(null)
  const available = chapters.filter(chapter => audio.some(item => item.chapterId === chapter.id && item.language === language))
  const chapter = available.find(item => item.id === chapterId) ?? available[0]
  const current = audio.find(item => item.chapterId === chapter?.id && item.language === language)
  const index = available.findIndex(item => item.id === chapter?.id)
  if (!chapter || !current) return <Alert severity="info">No published chapters are available in this language.</Alert>
  return <Box component="section" aria-label="Audiobook player" sx={{ bgcolor: 'var(--awm-white)', borderRadius: '20px', p: { xs: 2, sm: 3, lg: 4 }, textAlign: 'center', minWidth: 0, boxShadow: '0 12px 40px rgba(44,26,14,.08)' }}>
    <Typography sx={{ mb: 2, fontSize: 12, letterSpacing: '.12em', color: 'var(--awm-muted)', textTransform: 'uppercase' }}>Now listening</Typography>
    {book.cover && <Box component="img" src={book.cover} alt={`${book.title} cover`} sx={{ display: 'block', width: { xs: 'min(64vw, 240px)', md: 240 }, aspectRatio: '2 / 3', objectFit: 'cover', mx: 'auto', borderRadius: '12px', boxShadow: '0 12px 30px #0002', ...thumbnailCropCss(book.coverCrop) }} />}
    <Typography component="h1" sx={{ mt: 2, fontFamily: 'var(--font-heading)', fontSize: { xs: 25, md: 32 }, color: 'var(--awm-bark)' }}>{book.title}</Typography>
    <Typography sx={{ mb: 2, color: 'var(--awm-muted)' }}>Chapter {chapter.chapterNumber} · {chapter.title}</Typography>
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
      <FormControl size="small" sx={{ minWidth: 140 }}><InputLabel id="audio-language-label">Audio language</InputLabel><Select labelId="audio-language-label" label="Audio language" value={language} onChange={event => setLanguage(event.target.value as 'ar' | 'en')}>
        {(['ar', 'en'] as const).filter(value => audio.some(item => item.language === value)).map(value => <MenuItem key={value} value={value}>{value === 'ar' ? 'Arabic' : 'English'}</MenuItem>)}
      </Select></FormControl>
      <FormControl size="small" sx={{ minWidth: 160, maxWidth: '100%' }}><InputLabel id="audio-chapter-label">Chapter</InputLabel><Select labelId="audio-chapter-label" label="Chapter" value={chapter.id} onChange={event => setChapterId(event.target.value)}>
        {available.map(item => <MenuItem key={item.id} value={item.id}>{item.chapterNumber}. {item.title}</MenuItem>)}
      </Select></FormControl>
    </Box>
    <ChapterAudioPlayer audio={current} chapterTitle={`${book.title} · ${chapter.title}`} dedicated render={({ button, player }) => <>
      {player}
      <Box sx={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr) 48px', alignItems: 'center', gap: 1, my: 2 }}>
        <Button aria-label="Previous chapter" disabled={index <= 0} onClick={() => setChapterId(available[index - 1].id)} sx={{ minWidth: 48, minHeight: 48, color: 'var(--awm-bark)' }}><SkipPreviousRounded /></Button>
        {button}
        <Button aria-label="Next chapter" disabled={index >= available.length - 1} onClick={() => setChapterId(available[index + 1].id)} sx={{ minWidth: 48, minHeight: 48, color: 'var(--awm-bark)' }}><SkipNextRounded /></Button>
      </Box>
    </>} />
    <Button component={Link} href={bookReaderHref(book.slug, chapter.slug, language)} variant="outlined" sx={{ minHeight: 44, color: 'var(--awm-bark)', borderColor: 'var(--awm-gold)', borderRadius: '999px', px: 3 }}>Read This Chapter</Button>
  </Box>
}
