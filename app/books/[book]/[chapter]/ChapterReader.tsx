'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Box, Button, ButtonGroup, Divider, Paper, Typography, useMediaQuery } from '@mui/material'
import { ChevronLeft, ChevronRight, MenuBook, Settings, ViewAgenda } from '@mui/icons-material'
import { HtmlTooltip, MobileDefinitionPopover, WordTooltip, type VocabEntry } from '@/app/components/vocab-tooltip'
import type { PublicBookBlock, PublicBookToken } from '@/app/actions/books'
import { groupChapterBlocks } from '@/app/lib/bookParagraphs'
import { useAuth } from '@/app/AuthContext'
import { dispatchWordLookup } from '@/app/lib/activity'
import { paginateParagraphs } from '@/app/lib/readingPagination'
import { useReadingProgressStore } from '@/store/readingProgressStore'
import {
  DEFAULT_BOOK_READER_FONT,
  DEFAULT_BOOK_READER_LANGUAGE,
  DEFAULT_BOOK_TEXT_SCALE,
  normalizeBookReaderFont,
  normalizeBookReaderLanguage,
  normalizeBookTextScale,
  type BookReaderFont,
  type BookReaderLanguage,
} from '@/app/lib/bookReaderSettings'
import BookReaderSettingsDialog from './BookReaderSettingsDialog'
import ChapterAudioPlayer from './ChapterAudioPlayer'
import { BOOK_LANGUAGE_STOP_EVENT } from '@/app/lib/bookReaderSettings'
import type { ChapterAudioSummary } from '@/app/actions/audiobooks'

type ReaderView = 'lines' | 'book'
const READER_VIEW_STORAGE_KEY = 'awm-book-reader-view'
const READER_VIEW_CHANGE_EVENT = 'awm-book-reader-view-change'
const TEXT_SCALE_STORAGE_KEY = 'awm-book-reader-text-scale'
const TEXT_SCALE_CHANGE_EVENT = 'awm-book-reader-text-scale-change'
const READER_FONT_STORAGE_KEY = 'awm-book-reader-font'
const READER_FONT_CHANGE_EVENT = 'awm-book-reader-font-change'
const READER_LANGUAGE_STORAGE_KEY = 'awm-book-reader-language'
const READER_LANGUAGE_CHANGE_EVENT = 'awm-book-reader-language-change'

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

function getReaderLanguageSnapshot(): BookReaderLanguage {
  try {
    return normalizeBookReaderLanguage(window.localStorage.getItem(READER_LANGUAGE_STORAGE_KEY))
  } catch {
    return DEFAULT_BOOK_READER_LANGUAGE
  }
}

function subscribeToReaderLanguage(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === READER_LANGUAGE_STORAGE_KEY) onStoreChange()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(READER_LANGUAGE_CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(READER_LANGUAGE_CHANGE_EVENT, onStoreChange)
  }
}

let wordHelpFallback = true
function getWordHelp() {
  try { return window.localStorage.getItem('awm-book-word-help') !== 'false' } catch { return wordHelpFallback }
}
function subscribeToWordHelp(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('awm-book-word-help-change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('awm-book-word-help-change', callback)
  }
}

function dictionaryEntry(token: PublicBookToken): VocabEntry {
  return {
    arabic: token.arabic,
    headword: token.headword,
    transliteration: token.transliteration ?? '',
    english: token.english ?? '',
    cefr: token.cefr,
    pos: token.pos,
    entry_type: token.entryType,
  }
}

function DictionaryWord({
  token,
  mobile,
  onMobileOpen,
}: {
  token: PublicBookToken
  mobile: boolean
  onMobileOpen: (entry: VocabEntry, anchor: HTMLElement) => void
}) {
  const entry = dictionaryEntry(token)
  const word = (
    <Box
      component="span"
      tabIndex={0}
      role={mobile ? 'button' : undefined}
      aria-haspopup={mobile ? 'dialog' : undefined}
      onPointerDown={mobile ? (event) => event.stopPropagation() : undefined}
      onClick={mobile ? (event) => {
        event.preventDefault()
        event.stopPropagation()
        onMobileOpen(entry, event.currentTarget)
      } : undefined}
      onKeyDown={mobile ? (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        event.stopPropagation()
        onMobileOpen(entry, event.currentTarget)
      } : undefined}
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
  )

  if (mobile) return word
  return (
    <HtmlTooltip
      title={
        <Box sx={{ p: 2.5 }}>
          <WordTooltip entry={entry} />
        </Box>
      }
      arrow
      placement="bottom"
      enterDelay={120}
      enterTouchDelay={0}
      leaveTouchDelay={5000}
      onOpen={dispatchWordLookup}
    >
      {word}
    </HtmlTooltip>
  )
}

function ArabicTokens({
  tokens,
  punctuation,
  wordHelp,
  mobile,
  onMobileOpen,
}: {
  tokens: PublicBookToken[]
  wordHelp: boolean
  punctuation?: string
  mobile: boolean
  onMobileOpen: (entry: VocabEntry, anchor: HTMLElement) => void
}) {
  return (
    <>
      {tokens.map((token, index) => (
        <span key={`${token.headword ?? token.arabic}-${index}`}>
          {index > 0 ? ' ' : ''}{token.prefix}{wordHelp ? <DictionaryWord token={token} mobile={mobile} onMobileOpen={onMobileOpen} /> : token.arabic}{token.suffix}
        </span>
      ))}
      {punctuation && <span aria-hidden="true">{punctuation}</span>}
    </>
  )
}

export default function ChapterReader({
  bookSlug,
  bookTitle,
  chapterTitle,
  chapterSlug,
  content,
  initialLanguage,
  initialPage,
  audio = [],
}: {
  bookSlug: string
  bookTitle: string
  chapterTitle: string
  chapterSlug: string
  content: PublicBookBlock[]
  initialLanguage?: BookReaderLanguage
  initialPage?: number
  audio?: ChapterAudioSummary[]
}) {
  const { user } = useAuth()
  const mobileWordPopup = useMediaQuery('(max-width:899.95px)')
  const [selectedDefinition, setSelectedDefinition] = useState<{ entry: VocabEntry; anchor: HTMLElement } | null>(null)
  const closeDefinition = useCallback(() => setSelectedDefinition(null), [])
  const openDefinition = useCallback((entry: VocabEntry, anchor: HTMLElement) => {
    dispatchWordLookup()
    setSelectedDefinition({ entry, anchor })
  }, [])
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width:899.95px)')
    const handleChange = (event: MediaQueryListEvent) => {
      if (!event.matches) closeDefinition()
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [closeDefinition])
  const wordHelp = useSyncExternalStore(subscribeToWordHelp, getWordHelp, () => true)
  const toggleWordHelp = (enabled: boolean) => {
    wordHelpFallback = enabled
    try { window.localStorage.setItem('awm-book-word-help', String(enabled)) } catch { /* Keep the preference for this session. */ }
    window.dispatchEvent(new Event('awm-book-word-help-change'))
  }
  const [settingsOpen, setSettingsOpen] = useState(false)
  const view = useSyncExternalStore(subscribeToReaderView, getReaderViewSnapshot, () => 'lines')
  const textScale = useSyncExternalStore(subscribeToTextScale, getTextScaleSnapshot, () => DEFAULT_BOOK_TEXT_SCALE)
  const readerFont = useSyncExternalStore(subscribeToReaderFont, getReaderFontSnapshot, () => DEFAULT_BOOK_READER_FONT)
  const language = useSyncExternalStore(subscribeToReaderLanguage, getReaderLanguageSnapshot, () => initialLanguage ?? DEFAULT_BOOK_READER_LANGUAGE)
  const paragraphs = useMemo(() => groupChapterBlocks(chapterSlug, content), [chapterSlug, content])
  const blockIndexByBlock = useMemo(() => new Map(content.map((block, index) => [block, index])), [content])

  /* ── Soft pagination: line-by-line view renders one page at a time ── */
  const pages = useMemo(() => paginateParagraphs(paragraphs), [paragraphs])
  const totalPages = pages.length
  const clampPage = (value: number) => Math.min(Math.max(1, Math.trunc(value) || 1), totalPages)
  const [page, setPage] = useState(() => clampPage(initialPage ?? 1))
  const [lastInitialPage, setLastInitialPage] = useState(initialPage)
  if (initialPage !== lastInitialPage) {
    // Server navigation (resume links): adopt the new initial page during render.
    setLastInitialPage(initialPage)
    setPage(clampPage(initialPage ?? 1))
  }
  const trackProgress = useReadingProgressStore((state) => state.track)
  useEffect(() => {
    if (user) useReadingProgressStore.getState().hydrateFromMetadata(user.user_metadata)
  }, [user])
  useEffect(() => {
    if (view !== 'lines') return
    trackProgress(bookSlug, chapterSlug, page, totalPages)
  }, [view, bookSlug, chapterSlug, page, totalPages, trackProgress])

  const goToPage = useCallback((next: number) => {
    const clamped = Math.min(Math.max(1, Math.trunc(next) || 1), totalPages)
    setPage(clamped)
    try {
      const url = new URL(window.location.href)
      if (clamped >= 2) url.searchParams.set('page', String(clamped))
      else url.searchParams.delete('page')
      window.history.replaceState(null, '', url)
    } catch { /* The address bar is cosmetic; reading position lives in the store. */ }
    document.getElementById('reader-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [totalPages])

  useEffect(() => {
    if (view !== 'lines') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      goToPage(page + (event.key === 'ArrowRight' ? 1 : -1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, page, goToPage])

  useEffect(() => {
    if (!initialLanguage) return
    try {
      window.localStorage.setItem(READER_LANGUAGE_STORAGE_KEY, initialLanguage)
      window.dispatchEvent(new Event(READER_LANGUAGE_CHANGE_EVENT))
    } catch {
      // The reader remains usable with the URL-selected language.
    }
  }, [initialLanguage])

  useEffect(() => {
    const sentenceHash = window.location.hash.match(/^#sentence-(\d+)$/)
    if (!sentenceHash) return
    const blockIndex = Number(sentenceHash[1])
    const pageIndex = pages.findIndex(pageBlocks => pageBlocks.some(paragraph => paragraph.some(block => (blockIndexByBlock.get(block) ?? -1) === blockIndex)))
    if (pageIndex < 0) return

    if (view !== 'lines') {
      try {
        window.localStorage.setItem(READER_VIEW_STORAGE_KEY, 'lines')
        window.dispatchEvent(new Event(READER_VIEW_CHANGE_EVENT))
      } catch {
        // The reader can still be switched manually when storage is unavailable.
      }
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setPage(pageIndex + 1)
      // The target sentence renders on the next commit; scroll after it lands.
      window.setTimeout(() => {
        document.getElementById(sentenceHash[0].slice(1))?.scrollIntoView({ block: 'center' })
      }, 80)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [view, pages, blockIndexByBlock])

  const selectView = (nextView: ReaderView) => {
    try {
      window.localStorage.setItem(READER_VIEW_STORAGE_KEY, nextView)
      window.dispatchEvent(new Event(READER_VIEW_CHANGE_EVENT))
    } catch {
      // Keep the current view when browser storage is unavailable.
    }
  }

  const setReaderTextScale = (value: number) => {
    const nextScale = normalizeBookTextScale(value)
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

  const selectLanguage = (nextLanguage: BookReaderLanguage) => {
    if(nextLanguage!==language) window.dispatchEvent(new Event(BOOK_LANGUAGE_STOP_EVENT))
    try {
      window.localStorage.setItem(READER_LANGUAGE_STORAGE_KEY, nextLanguage)
      window.dispatchEvent(new Event(READER_LANGUAGE_CHANGE_EVENT))
    } catch {
      // Keep the current language when browser storage is unavailable.
    }
  }

  const mobileAudioLayout = mobileWordPopup
  const selectedAudio = audio.find(item => item.language === language)
  const renderReader = ({ button, player }: { button: ReactNode; player: ReactNode }) => (
    <>
      {mobileAudioLayout && button && <Box data-reader-mobile-audio sx={{ mb: 1.5 }}>{button}</Box>}
      <BookReaderSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        wordHelp={wordHelp}
        onWordHelpChange={toggleWordHelp}
        readerFont={readerFont}
        onReaderFontChange={selectReaderFont}
        textScale={textScale}
        onTextScaleChange={setReaderTextScale}
        bookSlug={bookSlug}
        chapterSlug={chapterSlug}
        language={language}
        languageLabel={language === 'ar' ? 'Arabic' : 'English'}
      />
      <Paper elevation={0} sx={{ borderRadius: '14px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)', overflow: 'hidden' }}>
      <Box data-reader-heading sx={{ px: { xs: 2, md: 4 }, py: { xs: 2.25, md: 2.75 }, bgcolor: '#0e2e1f' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <Box sx={{ textAlign: 'center', minWidth: 0 }}>
            <Typography sx={{ color: '#d4a843', fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.45 }}>
              {bookTitle} · {language === 'ar' ? 'Arabic' : 'English'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Typography component="h1" sx={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 24, md: 31 }, lineHeight: 1.15, fontWeight: 600 }}>
              {chapterTitle}
            </Typography>
            {!mobileAudioLayout && button}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <ButtonGroup
              aria-label="Reading view"
              sx={{
                bgcolor: 'transparent',
                borderRadius: '8px',
                width: '100%', maxWidth: 430,
                '& .MuiButton-root': { whiteSpace: 'nowrap', minWidth: 'auto', px: { xs: 0.75, md: 1.6 }, fontSize: { xs: 11, md: 13 }, minHeight: 44, flex: 1, '& .MuiButton-startIcon': { mr: 0.5, ml: 0 } },
              }}
            >
              <Button
                onClick={() => selectView('lines')}
                startIcon={<ViewAgenda sx={{ fontSize: 17 }} />}
                aria-pressed={view === 'lines'}
                sx={{ color: view === 'lines' ? '#0e2e1f' : '#fff', bgcolor: view === 'lines' ? '#d4a843' : 'transparent', borderColor: 'rgba(255,255,255,0.25)!important', textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', '&:hover': { bgcolor: view === 'lines' ? '#d4a843' : 'rgba(255,255,255,0.1)' } }}
              >
                Line by line
              </Button>
              <Button
                onClick={() => selectView('book')}
                startIcon={<MenuBook sx={{ fontSize: 17 }} />}
                aria-pressed={view === 'book'}
                sx={{ color: view === 'book' ? '#0e2e1f' : '#fff', bgcolor: view === 'book' ? '#d4a843' : 'transparent', borderColor: 'rgba(255,255,255,0.25)!important', textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', '&:hover': { bgcolor: view === 'book' ? '#d4a843' : 'rgba(255,255,255,0.1)' } }}
              >
                Book view
              </Button>
            <Button
              onClick={() => setSettingsOpen(true)}
              startIcon={<Settings sx={{ fontSize: 17 }} />}
              aria-expanded={settingsOpen}
              sx={{ color: '#fff', bgcolor: 'transparent', borderColor: 'rgba(255,255,255,0.25)!important', textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Settings
            </Button>
            </ButtonGroup>

          </Box>
        </Box>
      </Box>

      {player}
      {view === 'lines' ? (
        <Box id="reader-content" sx={{ px: { xs: 2.5, md: 6 }, py: { xs: 3, md: 5 }, scrollMarginTop: '80px' }}>
          {(pages[page - 1] ?? []).map((paragraph, paragraphIndex) => (
            <Box key={paragraphIndex} sx={{ '& + &': { mt: { xs: 2.5, md: 3.5 } } }}>
              {paragraph.map((block, blockIndex) => {
                const sentenceIndex = blockIndexByBlock.get(block) ?? blockIndex
                return (
                <Box
                  key={sentenceIndex}
                  id={`sentence-${sentenceIndex}`}
                  sx={{ position: 'relative', py: 2.5, scrollMarginTop: '96px' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {language === 'ar' ? (
                        <>
                          <Typography component="div" lang="ar" dir="rtl" sx={{ fontFamily: READER_FONT_FAMILIES[readerFont], fontSize: { xs: 23 * textScale, md: 29 * textScale }, fontWeight: 500, lineHeight: 1.9, color: 'var(--awm-bark)', textAlign: 'right' }}>
                            <ArabicTokens wordHelp={wordHelp} tokens={block.tokens} punctuation={block.punctuation} mobile={mobileWordPopup} onMobileOpen={openDefinition} />
                          </Typography>
                          {block.translation && <Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 14 * textScale, md: 15 * textScale }, lineHeight: 1.7 }}>{block.translation}</Typography>}
                        </>
                      ) : (
                        <>
                          <Typography sx={{ color: 'var(--awm-bark)', fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 18 * textScale, md: 20 * textScale }, lineHeight: 1.75 }}>{block.translation}</Typography>
                          <Typography component="div" lang="ar" dir="rtl" sx={{ mt: 1, color: 'var(--awm-muted)', fontFamily: READER_FONT_FAMILIES[readerFont], fontSize: { xs: 18 * textScale, md: 21 * textScale }, lineHeight: 1.8, textAlign: 'right' }}><ArabicTokens wordHelp={wordHelp} tokens={block.tokens} punctuation={block.punctuation} mobile={mobileWordPopup} onMobileOpen={openDefinition} /></Typography>
                        </>
                      )}
                    </Box>
                  </Box>
                  {blockIndex < paragraph.length - 1 && <Divider sx={{ mt: 3, borderColor: 'rgba(44,26,14,0.07)' }} />}
                </Box>
                )
              })}
            </Box>
          ))}
          {totalPages > 1 && (
            <Box component="nav" aria-label="Chapter pages" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 1, sm: 2 }, mt: { xs: 3, md: 4 } }}>
              <Button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                startIcon={<ChevronLeft />}
                variant="outlined"
                sx={{ minHeight: 44, px: { xs: 1.5, sm: 2.5 }, textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 600, borderColor: 'rgba(44,26,14,0.15)', color: 'var(--awm-bark)', '&:hover': { borderColor: 'var(--awm-gold)', background: 'color-mix(in srgb, var(--awm-gold) 6%, transparent)' } }}
              >
                Prev
              </Button>
              <Typography aria-live="polite" sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 600, color: 'var(--awm-muted)', minWidth: 84, textAlign: 'center' }}>
                Page {page} of {totalPages}
              </Typography>
              <Button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                endIcon={<ChevronRight />}
                variant="contained"
                sx={{ minHeight: 44, px: { xs: 1.5, sm: 2.5 }, textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, bgcolor: '#b8860b', color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: '#946c08', boxShadow: 'none' }, '&:disabled': { bgcolor: 'rgba(44,26,14,0.12)', color: 'rgba(44,26,14,0.3)' } }}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ px: { xs: 2.5, md: 7 }, py: { xs: 4, md: 7 }, background: 'var(--awm-white)' }}>
          <ButtonGroup size="small" aria-label="Book view language" sx={{ display: 'flex', width: 'fit-content', mx: 'auto', mb: 3, '& .MuiButton-root': { minWidth: 82, textTransform: 'none', fontSize: 12 } }}>
            <Button onClick={() => selectLanguage('en')} aria-pressed={language === 'en'} variant={language === 'en' ? 'contained' : 'outlined'} sx={{ bgcolor: language === 'en' ? '#0e2e1f' : 'transparent', color: language === 'en' ? '#fff' : 'var(--awm-bark)' }}>English</Button>
            <Button onClick={() => selectLanguage('ar')} aria-pressed={language === 'ar'} variant={language === 'ar' ? 'contained' : 'outlined'} sx={{ bgcolor: language === 'ar' ? '#0e2e1f' : 'transparent', color: language === 'ar' ? '#fff' : 'var(--awm-bark)' }}>Arabic</Button>
          </ButtonGroup>
          <Box lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} sx={{ maxWidth: 1120, mx: 'auto', fontFamily: language === 'ar' ? READER_FONT_FAMILIES[readerFont] : 'var(--font-sans), sans-serif', fontSize: { xs: (language === 'ar' ? 23 : 18) * textScale, md: (language === 'ar' ? 28 : 20) * textScale }, fontWeight: language === 'ar' ? 500 : 400, lineHeight: language === 'ar' ? 2.05 : 1.9, color: 'var(--awm-bark)', textAlign: language === 'ar' ? 'justify' : 'left', textAlignLast: language === 'ar' ? 'right' : 'auto', textJustify: 'inter-word' }}>
            {paragraphs.map((paragraph, paragraphIndex) => (
              <Box component="p" key={paragraphIndex} sx={{ m: 0, '& + &': { mt: { xs: 2.5, md: 3.5 } } }}>
                {language === 'ar'
                  ? paragraph.map((block, blockIndex) => <span key={blockIndex}>{blockIndex > 0 ? ' ' : ''}<ArabicTokens wordHelp={wordHelp} tokens={block.tokens} punctuation={block.punctuation} mobile={mobileWordPopup} onMobileOpen={openDefinition} /></span>)
                  : paragraph.map((block) => block.translation).filter(Boolean).join(' ')}
              </Box>
            ))}
          </Box>
        </Box>
      )}
      </Paper>
      <MobileDefinitionPopover
        anchor={mobileWordPopup ? selectedDefinition?.anchor ?? null : null}
        entry={selectedDefinition?.entry ?? null}
        onClose={closeDefinition}
        textScale={textScale}
      />
    </>
  )
  return selectedAudio
    ? <ChapterAudioPlayer key={`${selectedAudio.chapterId}/${selectedAudio.language}`} audio={selectedAudio} chapterTitle={chapterTitle} label={selectedAudio.language === language ? 'Play Audio' : `Play Audio (${selectedAudio.language === 'en' ? 'English' : 'Arabic'})`} render={renderReader} />
    : renderReader({ button: null, player: null })
}
