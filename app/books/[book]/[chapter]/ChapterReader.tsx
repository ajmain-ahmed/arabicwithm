'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Box, Button, ButtonGroup, Divider, IconButton, Paper, Snackbar, Typography } from '@mui/material'
import { Bookmark, BookmarkBorder, MenuBook, Settings, ViewAgenda } from '@mui/icons-material'
import { HtmlTooltip, WordTooltip } from '@/app/components/vocab-tooltip'
import type { PublicBookBlock, PublicBookToken } from '@/app/actions/books'
import { groupChapterBlocks } from '@/app/lib/bookParagraphs'
import { useAuth } from '@/app/AuthContext'
import { dispatchWordLookup } from '@/app/lib/activity'
import { supabase } from '@/app/lib/supabase/client'
import {
  BOOK_SENTENCE_BOOKMARK_EVENT,
  BOOK_SENTENCE_BOOKMARK_STORAGE_KEY,
  latestBookSentenceBookmark,
  parseBookSentenceBookmark,
  type BookSentenceBookmark,
} from '@/app/lib/bookSentenceBookmark'
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
      onOpen={dispatchWordLookup}
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

function ArabicTokens({
  tokens,
  punctuation,
}: {
  tokens: PublicBookToken[]
  punctuation?: string
}) {
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
  bookSlug,
  bookTitle,
  chapterTitle,
  chapterSlug,
  content,
  initialLanguage,
}: {
  bookSlug: string
  bookTitle: string
  chapterTitle: string
  chapterSlug: string
  content: PublicBookBlock[]
  initialLanguage?: BookReaderLanguage
}) {
  const { user } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bookmark, setBookmark] = useState<BookSentenceBookmark | null>(null)
  const [bookmarkNotice, setBookmarkNotice] = useState('')
  const view = useSyncExternalStore(subscribeToReaderView, getReaderViewSnapshot, () => 'lines')
  const textScale = useSyncExternalStore(subscribeToTextScale, getTextScaleSnapshot, () => DEFAULT_BOOK_TEXT_SCALE)
  const readerFont = useSyncExternalStore(subscribeToReaderFont, getReaderFontSnapshot, () => DEFAULT_BOOK_READER_FONT)
  const language = useSyncExternalStore(subscribeToReaderLanguage, getReaderLanguageSnapshot, () => initialLanguage ?? DEFAULT_BOOK_READER_LANGUAGE)
  const paragraphs = groupChapterBlocks(chapterSlug, content)
  const blockIndexByBlock = new Map(content.map((block, index) => [block, index]))

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
    let localBookmark: BookSentenceBookmark | null = null
    try {
      localBookmark = parseBookSentenceBookmark(window.localStorage.getItem(BOOK_SENTENCE_BOOKMARK_STORAGE_KEY))
    } catch {
      // Account metadata can still supply a bookmark when browser storage is unavailable.
    }

    const accountBookmark = parseBookSentenceBookmark(user?.user_metadata?.book_sentence_bookmark)
    const newestBookmark = latestBookSentenceBookmark(localBookmark, accountBookmark)
    const frame = window.requestAnimationFrame(() => setBookmark(newestBookmark))

    if (newestBookmark) {
      try {
        window.localStorage.setItem(BOOK_SENTENCE_BOOKMARK_STORAGE_KEY, JSON.stringify(newestBookmark))
      } catch {
        // The bookmark remains available in memory for this visit.
      }
    }
    return () => window.cancelAnimationFrame(frame)
  }, [user])

  useEffect(() => {
    const sentenceHash = window.location.hash.match(/^#sentence-(\d+)$/)
    if (!sentenceHash) return

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
      document.getElementById(sentenceHash[0].slice(1))?.scrollIntoView({ block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [view, content])

  const toggleBookmark = (block: PublicBookBlock, blockIndex: number) => {
    const removing = bookmark?.bookSlug === bookSlug
      && bookmark.chapterSlug === chapterSlug
      && bookmark.blockIndex === blockIndex

    if (removing) {
      setBookmark(null)
      setBookmarkNotice('Reading position removed')
      try {
        window.localStorage.removeItem(BOOK_SENTENCE_BOOKMARK_STORAGE_KEY)
        window.dispatchEvent(new CustomEvent(BOOK_SENTENCE_BOOKMARK_EVENT, { detail: null }))
      } catch {
        // The in-memory state still updates for this visit.
      }
      if (user) void supabase.auth.updateUser({ data: { book_sentence_bookmark: null } })
      return
    }

    const arabic = `${block.tokens.map((token) => `${token.prefix ?? ''}${token.arabic}${token.suffix ?? ''}`).join(' ')}${block.punctuation ?? ''}`
    const nextBookmark: BookSentenceBookmark = {
      bookSlug,
      bookTitle,
      chapterSlug,
      chapterTitle,
      blockIndex,
      arabic,
      translation: block.translation,
      savedAt: new Date().toISOString(),
    }

    setBookmark(nextBookmark)
    setBookmarkNotice('Saved as your reading position')
    try {
      window.localStorage.setItem(BOOK_SENTENCE_BOOKMARK_STORAGE_KEY, JSON.stringify(nextBookmark))
      window.dispatchEvent(new CustomEvent(BOOK_SENTENCE_BOOKMARK_EVENT, { detail: nextBookmark }))
    } catch {
      // The bookmark remains available in memory for this visit.
    }

    if (user) {
      void supabase.auth.updateUser({ data: { book_sentence_bookmark: nextBookmark } })
    }
  }

  const isBookmarkedSentence = (blockIndex: number) => bookmark?.bookSlug === bookSlug
    && bookmark.chapterSlug === chapterSlug
    && bookmark.blockIndex === blockIndex

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
    try {
      window.localStorage.setItem(READER_LANGUAGE_STORAGE_KEY, nextLanguage)
      window.dispatchEvent(new Event(READER_LANGUAGE_CHANGE_EVENT))
    } catch {
      // Keep the current language when browser storage is unavailable.
    }
  }

  return (
    <>
      <BookReaderSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
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
      <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2.25, md: 2.75 }, bgcolor: '#0e2e1f' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}>
          <Box sx={{ textAlign: { xs: 'left', sm: 'left' }, minWidth: 0 }}>
            <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.45 }}>
              {bookTitle} · {language === 'ar' ? 'Arabic' : 'English'}
            </Typography>
            <Typography component="h1" sx={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 24, md: 31 }, lineHeight: 1.15, fontWeight: 600 }}>
              {chapterTitle}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'center' }, alignItems: 'center', gap: 1 }}>
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

            <Button
              onClick={() => setSettingsOpen(true)}
              startIcon={<Settings sx={{ fontSize: 17 }} />}
              sx={{ height: 38, color: '#fff', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', textTransform: 'none', fontFamily: 'Jost, sans-serif', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
            >
              Settings
            </Button>

          </Box>
        </Box>
      </Box>

      {view === 'lines' ? (
        <Box sx={{ px: { xs: 2.5, md: 6 }, py: { xs: 3, md: 5 } }}>
          {paragraphs.map((paragraph, paragraphIndex) => (
            <Box key={paragraphIndex} sx={{ '& + &': { mt: { xs: 2.5, md: 3.5 } } }}>
              {paragraph.map((block, blockIndex) => {
                const sentenceIndex = blockIndexByBlock.get(block) ?? blockIndex
                const sentenceBookmarked = isBookmarkedSentence(sentenceIndex)
                return (
                <Box
                  key={sentenceIndex}
                  id={`sentence-${sentenceIndex}`}
                  sx={{
                    position: 'relative',
                    py: 2.5,
                    scrollMarginTop: '96px',
                    '&:hover .sentence-bookmark, &:focus-within .sentence-bookmark': { opacity: 1, pointerEvents: 'auto' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <IconButton
                      className="sentence-bookmark"
                      onClick={() => toggleBookmark(block, sentenceIndex)}
                      aria-label={sentenceBookmarked ? 'Remove reading bookmark' : 'Save this reading position'}
                      title={sentenceBookmarked ? 'Remove reading bookmark' : 'Save this reading position'}
                      sx={{ mt: 0.5, flexShrink: 0, opacity: { xs: 1, md: sentenceBookmarked ? 1 : 0 }, pointerEvents: { xs: 'auto', md: sentenceBookmarked ? 'auto' : 'none' }, transition: 'opacity 150ms ease, transform 150ms ease', transform: sentenceBookmarked ? 'scale(1.08)' : 'scale(1)', color: sentenceBookmarked ? 'var(--awm-gold)' : 'var(--awm-muted-light)', bgcolor: sentenceBookmarked ? 'color-mix(in srgb, var(--awm-gold) 12%, transparent)' : 'transparent', '&:hover': { color: 'var(--awm-gold)', bgcolor: 'color-mix(in srgb, var(--awm-gold) 12%, transparent)' } }}
                    >
                      {sentenceBookmarked ? <Bookmark /> : <BookmarkBorder />}
                    </IconButton>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {language === 'ar' ? (
                        <>
                          <Typography component="div" lang="ar" dir="rtl" sx={{ fontFamily: READER_FONT_FAMILIES[readerFont], fontSize: { xs: 23 * textScale, md: 29 * textScale }, fontWeight: 500, lineHeight: 1.9, color: 'var(--awm-bark)', textAlign: 'right' }}>
                            <ArabicTokens tokens={block.tokens} punctuation={block.punctuation} />
                          </Typography>
                          {block.translation && <Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 14 * textScale, md: 15 * textScale }, lineHeight: 1.7 }}>{block.translation}</Typography>}
                        </>
                      ) : (
                        <>
                          <Typography sx={{ color: 'var(--awm-bark)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 18 * textScale, md: 20 * textScale }, lineHeight: 1.75 }}>{block.translation}</Typography>
                          <Typography component="div" lang="ar" dir="rtl" sx={{ mt: 1, color: 'var(--awm-muted)', fontFamily: READER_FONT_FAMILIES[readerFont], fontSize: { xs: 18 * textScale, md: 21 * textScale }, lineHeight: 1.8, textAlign: 'right' }}><ArabicTokens tokens={block.tokens} punctuation={block.punctuation} /></Typography>
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
        </Box>
      ) : (
        <Box sx={{ px: { xs: 2.5, md: 7 }, py: { xs: 4, md: 7 }, background: 'var(--awm-white)' }}>
          <ButtonGroup size="small" aria-label="Book view language" sx={{ display: 'flex', width: 'fit-content', mx: 'auto', mb: 3, '& .MuiButton-root': { minWidth: 82, textTransform: 'none', fontSize: 12 } }}>
            <Button onClick={() => selectLanguage('en')} aria-pressed={language === 'en'} variant={language === 'en' ? 'contained' : 'outlined'} sx={{ bgcolor: language === 'en' ? '#0e2e1f' : 'transparent', color: language === 'en' ? '#fff' : 'var(--awm-bark)' }}>English</Button>
            <Button onClick={() => selectLanguage('ar')} aria-pressed={language === 'ar'} variant={language === 'ar' ? 'contained' : 'outlined'} sx={{ bgcolor: language === 'ar' ? '#0e2e1f' : 'transparent', color: language === 'ar' ? '#fff' : 'var(--awm-bark)' }}>Arabic</Button>
          </ButtonGroup>
          <Box lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} sx={{ maxWidth: 1120, mx: 'auto', fontFamily: language === 'ar' ? READER_FONT_FAMILIES[readerFont] : 'Jost, sans-serif', fontSize: { xs: (language === 'ar' ? 23 : 18) * textScale, md: (language === 'ar' ? 28 : 20) * textScale }, fontWeight: language === 'ar' ? 500 : 400, lineHeight: language === 'ar' ? 2.05 : 1.9, color: 'var(--awm-bark)', textAlign: language === 'ar' ? 'justify' : 'left', textAlignLast: language === 'ar' ? 'right' : 'auto', textJustify: 'inter-word' }}>
            {paragraphs.map((paragraph, paragraphIndex) => (
              <Box component="p" key={paragraphIndex} sx={{ m: 0, '& + &': { mt: { xs: 2.5, md: 3.5 } } }}>
                {language === 'ar'
                  ? paragraph.map((block, blockIndex) => <span key={blockIndex}>{blockIndex > 0 ? ' ' : ''}<ArabicTokens tokens={block.tokens} punctuation={block.punctuation} /></span>)
                  : paragraph.map((block) => block.translation).filter(Boolean).join(' ')}
              </Box>
            ))}
          </Box>
        </Box>
      )}
      </Paper>
      <Snackbar
        open={Boolean(bookmarkNotice)}
        autoHideDuration={1800}
        onClose={() => setBookmarkNotice('')}
        message={bookmarkNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ content: { sx: { minWidth: 0, bgcolor: '#0e2e1f', color: '#fff', borderRadius: '9999px', fontFamily: 'Jost, sans-serif', fontSize: 12 } } }}
      />
    </>
  )
}
