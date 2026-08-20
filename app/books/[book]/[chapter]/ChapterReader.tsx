'use client'

import { useSyncExternalStore } from 'react'
import { Box, Button, ButtonGroup, Divider, IconButton, MenuItem, Paper, Select, Typography } from '@mui/material'
import { MenuBook, ViewAgenda } from '@mui/icons-material'
import { HtmlTooltip, WordTooltip } from '@/app/components/vocab-tooltip'
import type { PublicBookBlock, PublicBookToken } from '@/app/actions/books'
import { groupChapterBlocks } from '@/app/lib/bookParagraphs'
import {
  BOOK_TEXT_SCALE_STEP,
  DEFAULT_BOOK_READER_FONT,
  DEFAULT_BOOK_TEXT_SCALE,
  MAX_BOOK_TEXT_SCALE,
  MIN_BOOK_TEXT_SCALE,
  normalizeBookReaderFont,
  normalizeBookTextScale,
  type BookReaderFont,
} from '@/app/lib/bookReaderSettings'

type ReaderView = 'lines' | 'book'
const READER_VIEW_STORAGE_KEY = 'awm-book-reader-view'
const READER_VIEW_CHANGE_EVENT = 'awm-book-reader-view-change'
const TEXT_SCALE_STORAGE_KEY = 'awm-book-reader-text-scale'
const TEXT_SCALE_CHANGE_EVENT = 'awm-book-reader-text-scale-change'
const READER_FONT_STORAGE_KEY = 'awm-book-reader-font'
const READER_FONT_CHANGE_EVENT = 'awm-book-reader-font-change'

const READER_FONT_FAMILIES: Record<BookReaderFont, string> = {
  naskh: 'var(--font-book-naskh), serif',
  sans: 'var(--font-book-sans), sans-serif',
  amiri: 'var(--font-book-amiri), serif',
}

function isReaderView(value: string | null): value is ReaderView {
  return value === 'lines' || value === 'book'
}

function getReaderViewSnapshot(): ReaderView {
  try {
    const savedView = window.localStorage.getItem(READER_VIEW_STORAGE_KEY)
    return isReaderView(savedView) ? savedView : 'lines'
  } catch {
    return 'lines'
  }
}

function subscribeToReaderView(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === READER_VIEW_STORAGE_KEY) onStoreChange()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(READER_VIEW_CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(READER_VIEW_CHANGE_EVENT, onStoreChange)
  }
}

function getTextScaleSnapshot(): number {
  try {
    return normalizeBookTextScale(window.localStorage.getItem(TEXT_SCALE_STORAGE_KEY))
  } catch {
    return DEFAULT_BOOK_TEXT_SCALE
  }
}

function subscribeToTextScale(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === TEXT_SCALE_STORAGE_KEY) onStoreChange()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(TEXT_SCALE_CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(TEXT_SCALE_CHANGE_EVENT, onStoreChange)
  }
}

function getReaderFontSnapshot(): BookReaderFont {
  try {
    return normalizeBookReaderFont(window.localStorage.getItem(READER_FONT_STORAGE_KEY))
  } catch {
    return DEFAULT_BOOK_READER_FONT
  }
}

function subscribeToReaderFont(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === READER_FONT_STORAGE_KEY) onStoreChange()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(READER_FONT_CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(READER_FONT_CHANGE_EVENT, onStoreChange)
  }
}

function DictionaryWord({ token }: { token: PublicBookToken }) {
  return (
    <HtmlTooltip
      title={
        <Box sx={{ p: 2.5 }}>
          <WordTooltip
            entry={{
              arabic: token.arabic,
              headword: token.headword,
              transliteration: token.transliteration ?? '',
              english: token.english ?? '',
              cefr: token.cefr,
              pos: token.pos,
              entry_type: token.entryType,
            }}
          />
        </Box>
      }
      arrow
      placement="bottom"
      enterDelay={120}
      enterTouchDelay={0}
      leaveTouchDelay={5000}
    >
      <Box
        component="span"
        tabIndex={0}
        sx={{
          display: 'inline',
          cursor: 'help',
          borderBottom: '2px dotted #b8860b',
          transition: 'background-color 0.15s ease',
          '&:hover, &:focus': { bgcolor: 'rgba(184,134,11,0.12)', outline: 'none' },
        }}
      >
        {token.arabic}
      </Box>
    </HtmlTooltip>
  )
}

function ArabicTokens({ tokens, punctuation }: { tokens: PublicBookToken[]; punctuation?: string }) {
  return (
    <>
      {tokens.map((token, index) => (
        <span key={`${token.headword ?? token.arabic}-${index}`}>
          {index > 0 ? ' ' : ''}{token.prefix}<DictionaryWord token={token} />{token.suffix}
        </span>
      ))}
      {punctuation && <span aria-hidden="true">{punctuation}</span>}
    </>
  )
}

export default function ChapterReader({
  bookTitle,
  chapterTitle,
  chapterSlug,
  content,
}: {
  bookTitle: string
  chapterTitle: string
  chapterSlug: string
  content: PublicBookBlock[]
}) {
  const view = useSyncExternalStore(subscribeToReaderView, getReaderViewSnapshot, () => 'lines')
  const textScale = useSyncExternalStore(subscribeToTextScale, getTextScaleSnapshot, () => DEFAULT_BOOK_TEXT_SCALE)
  const readerFont = useSyncExternalStore(subscribeToReaderFont, getReaderFontSnapshot, () => DEFAULT_BOOK_READER_FONT)
  const paragraphs = groupChapterBlocks(chapterSlug, content)

  const selectView = (nextView: ReaderView) => {
    try {
      window.localStorage.setItem(READER_VIEW_STORAGE_KEY, nextView)
      window.dispatchEvent(new Event(READER_VIEW_CHANGE_EVENT))
    } catch {
      // Keep the current view when browser storage is unavailable.
    }
  }

  const changeTextScale = (change: number) => {
    const nextScale = normalizeBookTextScale(textScale + change)
    try {
      window.localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(nextScale))
      window.dispatchEvent(new Event(TEXT_SCALE_CHANGE_EVENT))
    } catch {
      // Keep the current size when browser storage is unavailable.
    }
  }

  const selectReaderFont = (nextFont: unknown) => {
    const normalizedFont = normalizeBookReaderFont(nextFont)
    try {
      window.localStorage.setItem(READER_FONT_STORAGE_KEY, normalizedFont)
      window.dispatchEvent(new Event(READER_FONT_CHANGE_EVENT))
    } catch {
      // Keep the current font when browser storage is unavailable.
    }
  }

  return (
    <Paper elevation={0} sx={{ borderRadius: '14px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)', overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2.5, md: 5 }, py: { xs: 3, md: 4 }, bgcolor: '#0e2e1f' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-start' }, gap: 2.5 }}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.75 }}>
              {bookTitle}
            </Typography>
            <Typography component="h1" sx={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 28, md: 38 }, lineHeight: 1.15, fontWeight: 600 }}>
              {chapterTitle}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 1, alignSelf: { xs: 'center', sm: 'flex-start' } }}>
            <ButtonGroup
              aria-label="Reading view"
              sx={{
                bgcolor: 'rgba(255,255,255,0.08)',
                borderRadius: '8px',
                flexShrink: 0,
                '& .MuiButton-root': { whiteSpace: 'nowrap', minWidth: 'auto', px: { xs: 1.35, md: 1.6 }, fontSize: 13 },
              }}
            >
              <Button
                onClick={() => selectView('lines')}
                startIcon={<ViewAgenda sx={{ fontSize: 17 }} />}
                aria-pressed={view === 'lines'}
                sx={{ color: view === 'lines' ? '#0e2e1f' : '#fff', bgcolor: view === 'lines' ? '#d4a843' : 'transparent', borderColor: 'rgba(255,255,255,0.25)!important', textTransform: 'none', fontFamily: 'Jost, sans-serif', '&:hover': { bgcolor: view === 'lines' ? '#d4a843' : 'rgba(255,255,255,0.1)' } }}
              >
                Line by line
              </Button>
              <Button
                onClick={() => selectView('book')}
                startIcon={<MenuBook sx={{ fontSize: 17 }} />}
                aria-pressed={view === 'book'}
                sx={{ color: view === 'book' ? '#0e2e1f' : '#fff', bgcolor: view === 'book' ? '#d4a843' : 'transparent', borderColor: 'rgba(255,255,255,0.25)!important', textTransform: 'none', fontFamily: 'Jost, sans-serif', '&:hover': { bgcolor: view === 'book' ? '#d4a843' : 'rgba(255,255,255,0.1)' } }}
              >
                Book view
              </Button>
            </ButtonGroup>

            <Select
              size="small"
              value={readerFont}
              onChange={(event) => selectReaderFont(event.target.value)}
              inputProps={{ 'aria-label': 'Book font' }}
              sx={{
                height: 38,
                minWidth: 118,
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontFamily: 'Jost, sans-serif',
                fontSize: 13,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.45)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#d4a843' },
                '& .MuiSelect-icon': { color: '#fff' },
              }}
            >
              <MenuItem value="naskh">Naskh</MenuItem>
              <MenuItem value="sans">Modern</MenuItem>
              <MenuItem value="amiri">Classic</MenuItem>
            </Select>

            <Box
              role="group"
              aria-label="Book text size"
              sx={{ display: 'flex', alignItems: 'center', height: 38, border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}
            >
              <IconButton
                size="small"
                aria-label="Decrease book text size"
                disabled={textScale <= MIN_BOOK_TEXT_SCALE}
                onClick={() => changeTextScale(-BOOK_TEXT_SCALE_STEP)}
                sx={{ width: 38, height: 38, borderRadius: 0, color: '#fff', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <Typography component="span" sx={{ fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 700 }}>A−</Typography>
              </IconButton>
              <Typography aria-live="polite" sx={{ minWidth: 44, px: 0.75, color: '#fff', fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 600, textAlign: 'center', borderInline: '1px solid rgba(255,255,255,0.18)' }}>
                {Math.round(textScale * 100)}%
              </Typography>
              <IconButton
                size="small"
                aria-label="Increase book text size"
                disabled={textScale >= MAX_BOOK_TEXT_SCALE}
                onClick={() => changeTextScale(BOOK_TEXT_SCALE_STEP)}
                sx={{ width: 38, height: 38, borderRadius: 0, color: '#fff', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <Typography component="span" sx={{ fontFamily: 'Jost, sans-serif', fontSize: 16, fontWeight: 700 }}>A+</Typography>
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      {view === 'lines' ? (
        <Box sx={{ px: { xs: 2.5, md: 6 }, py: { xs: 3, md: 5 } }}>
          {paragraphs.map((paragraph, paragraphIndex) => (
            <Box key={paragraphIndex} sx={{ '& + &': { mt: { xs: 2.5, md: 3.5 } } }}>
              {paragraph.map((block, blockIndex) => (
                <Box key={blockIndex} sx={{ py: 2.5 }}>
                  <Typography component="div" lang="ar" dir="rtl" sx={{ fontFamily: READER_FONT_FAMILIES[readerFont], fontSize: { xs: 23 * textScale, md: 29 * textScale }, fontWeight: 500, lineHeight: 1.9, color: 'var(--awm-bark)', textAlign: 'right' }}>
                    <ArabicTokens tokens={block.tokens} punctuation={block.punctuation} />
                  </Typography>
                  {block.translation && (
                    <Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 14 * textScale, md: 15 * textScale }, lineHeight: 1.7 }}>
                      {block.translation}
                    </Typography>
                  )}
                  {blockIndex < paragraph.length - 1 && <Divider sx={{ mt: 3, borderColor: 'rgba(44,26,14,0.07)' }} />}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ px: { xs: 2.5, md: 7 }, py: { xs: 4, md: 7 }, background: 'var(--awm-white)' }}>
          <Box lang="ar" dir="rtl" sx={{ maxWidth: 720, mx: 'auto', fontFamily: READER_FONT_FAMILIES[readerFont], fontSize: { xs: 23 * textScale, md: 28 * textScale }, fontWeight: 500, lineHeight: 2.05, color: 'var(--awm-bark)', textAlign: 'justify', textAlignLast: 'right', textJustify: 'inter-word' }}>
            {paragraphs.map((paragraph, paragraphIndex) => (
              <Box component="p" key={paragraphIndex} sx={{ m: 0, '& + &': { mt: { xs: 2.5, md: 3.5 } } }}>
                {paragraph.map((block, blockIndex) => (
                  <span key={blockIndex}>
                    {blockIndex > 0 ? ' ' : ''}<ArabicTokens tokens={block.tokens} punctuation={block.punctuation} />
                  </span>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  )
}
