'use client'

import { useSyncExternalStore } from 'react'
import { Box, Button, ButtonGroup, Divider, Paper, Typography } from '@mui/material'
import { MenuBook, ViewAgenda } from '@mui/icons-material'
import { HtmlTooltip, WordTooltip } from '@/app/components/vocab-tooltip'
import type { PublicBookBlock, PublicBookToken } from '@/app/actions/books'

type ReaderView = 'lines' | 'book'
const READER_VIEW_STORAGE_KEY = 'awm-book-reader-view'
const READER_VIEW_CHANGE_EVENT = 'awm-book-reader-view-change'

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
  content,
}: {
  bookTitle: string
  chapterTitle: string
  content: PublicBookBlock[]
}) {
  const view = useSyncExternalStore(subscribeToReaderView, getReaderViewSnapshot, () => 'lines')

  const selectView = (nextView: ReaderView) => {
    try {
      window.localStorage.setItem(READER_VIEW_STORAGE_KEY, nextView)
      window.dispatchEvent(new Event(READER_VIEW_CHANGE_EVENT))
    } catch {
      // Keep the current view when browser storage is unavailable.
    }
  }

  return (
    <Paper elevation={0} sx={{ borderRadius: '14px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: '#fff', overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2.5, md: 5 }, py: { xs: 3, md: 4 }, bgcolor: '#0e2e1f' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-start' }, gap: 2 }}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.75 }}>
              {bookTitle}
            </Typography>
            <Typography component="h1" sx={{ color: '#fff', fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 32, md: 44 }, fontWeight: 700 }}>
              {chapterTitle}
            </Typography>
          </Box>

          <ButtonGroup aria-label="Reading view" sx={{ alignSelf: { xs: 'center', sm: 'flex-start' }, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}>
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
        </Box>
      </Box>

      {view === 'lines' ? (
        <Box sx={{ px: { xs: 2.5, md: 6 }, py: { xs: 3, md: 5 } }}>
          {content.map((block, index) => (
            <Box key={index} sx={{ py: 2.5 }}>
              <Typography component="div" lang="ar" dir="rtl" sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 27, md: 34 }, fontWeight: 700, lineHeight: 1.9, color: '#2c1a0e', textAlign: 'right' }}>
                <ArabicTokens tokens={block.tokens} punctuation={block.punctuation} />
              </Typography>
              {block.translation && (
                <Typography sx={{ mt: 1, color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontSize: { xs: 15, md: 16 }, lineHeight: 1.7 }}>
                  {block.translation}
                </Typography>
              )}
              {index < content.length - 1 && <Divider sx={{ mt: 3, borderColor: 'rgba(44,26,14,0.07)' }} />}
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ px: { xs: 2.5, md: 7 }, py: { xs: 4, md: 7 }, background: '#fffdf8' }}>
          <Typography component="div" lang="ar" dir="rtl" sx={{ maxWidth: 720, mx: 'auto', fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 27, md: 33 }, fontWeight: 600, lineHeight: 2.05, color: '#2c1a0e', textAlign: 'right' }}>
            {content.map((block, blockIndex) => (
              <span key={blockIndex}>
                {blockIndex > 0 ? ' ' : ''}<ArabicTokens tokens={block.tokens} punctuation={block.punctuation} />
              </span>
            ))}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}
