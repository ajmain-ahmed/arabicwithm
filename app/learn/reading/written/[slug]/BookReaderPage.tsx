'use client'

import React, { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Container,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material'
import { BookFull } from '@/app/lib/books'
import { ArabicText } from '@/app/components/vocab-tooltip'

/* ── Palette ── */
const BARK = '#2c1a0e'
const GOLD = '#b8860b'
const WARM_WHITE = '#fffaf0'
const MUTED = '#7a6e65'

/* ── (no decorative icons) ── */

/* ── Book page margins ── */
const PAGE_MARGIN = { xs: 4, md: 6 }

/* ═══════════════════════════════════════════════
   Book Reader Page
   ═══════════════════════════════════════════════ */
export default function BookReaderPage({ book }: { book: BookFull }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [pageIndex, setPageIndex] = useState(0)

  const totalPages = 1 + book.pages.length // cover + pages
  const isCover = pageIndex === 0
  const currentPage = !isCover ? book.pages[pageIndex - 1] : null

  const goPrev = useCallback(() => {
    setPageIndex((p) => Math.max(0, p - 1))
  }, [])

  const goNext = useCallback(() => {
    setPageIndex((p) => Math.min(totalPages - 1, p + 1))
  }, [totalPages])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    },
    [goPrev, goNext]
  )

  const wordMap = book.wordMap
  const diacritizedMap = book.diacritizedMap

  const hasChapterHeader = Boolean(currentPage?.chapterTitleAr)

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        background: WARM_WHITE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
        py: { xs: 2, md: 4 },
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {!isMobile ? (
        /* ── Desktop: arrows outside container ── */
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { md: 2, lg: 3 } }}>
          <IconButton
            onClick={goPrev}
            disabled={pageIndex === 0}
            sx={{
              width: 44,
              height: 44,
              backgroundColor: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(44,26,14,0.08)',
              boxShadow: '0 2px 8px rgba(44,26,14,0.06)',
              color: pageIndex === 0 ? 'rgba(44,26,14,0.2)' : BARK,
              '&:hover': {
                backgroundColor: pageIndex === 0 ? 'rgba(255,255,255,0.95)' : '#fff',
                borderColor: pageIndex === 0 ? 'rgba(44,26,14,0.08)' : GOLD,
              },
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft sx={{ fontSize: 26 }} />
          </IconButton>

          <Container
            maxWidth={isCover ? false : 'md'}
            disableGutters
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: isCover ? 'center' : 'flex-start',
              height: '80vh',
              maxHeight: '80vh',
              width: isCover ? 'auto' : '100%',
              maxWidth: isCover ? '55vh' : undefined,
              background: '#fff',
              borderRadius: 0,
              boxShadow: '0 4px 24px rgba(44,26,14,0.08)',
              overflow: 'hidden',
              p: 0,
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                overflowY: isCover ? 'hidden' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isCover ? 'stretch' : 'flex-start',
                justifyContent: isCover ? 'center' : 'flex-start',
              }}
            >
              {isCover ? (
                book.meta.cover ? (
                  <Box
                    component="img"
                    src={book.meta.cover}
                    alt={book.meta.title}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : null
              ) : currentPage ? (
                <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', px: PAGE_MARGIN, py: PAGE_MARGIN }}>
                  {/* Chapter header */}
                  {hasChapterHeader && (
                    <Box sx={{ textAlign: 'center', pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 10 } }}>
                      <Typography
                        sx={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: { xs: 14, md: 16 },
                          color: MUTED,
                          textTransform: 'uppercase',
                          letterSpacing: '0.25em',
                          mb: 2,
                        }}
                      >
                        Chapter {currentPage.chapterNumber}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"EB Garamond", Georgia, serif',
                          fontSize: { xs: 32, md: 42 },
                          color: BARK,
                          fontWeight: 500,
                          direction: 'rtl',
                          lineHeight: 1.25,
                        }}
                      >
                        {currentPage.chapterTitleAr}
                      </Typography>
                      {currentPage.chapterTitleEn && (
                        <Typography
                          sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: { xs: 13, md: 15 },
                            color: MUTED,
                            mt: 1.5,
                            letterSpacing: '0.05em',
                          }}
                        >
                          {currentPage.chapterTitleEn}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {currentPage.sentences.map((sentence) => (
                      <Typography
                        key={sentence.sentenceId}
                        component="p"
                        sx={{
                          fontFamily: '"EB Garamond", Georgia, serif',
                          fontSize: { xs: '1.25rem', md: '1.45rem' },
                          color: BARK,
                          direction: 'rtl',
                          textAlign: 'right',
                          lineHeight: 1.8,
                          margin: 0,
                        }}
                      >
                        <ArabicText
                          text={sentence.arabic}
                          wordMap={wordMap}
                          diacritizedMap={diacritizedMap}
                        />
                      </Typography>
                    ))}
                  </Box>
                </Box>
              ) : null}
            </Box>
          </Container>

          <IconButton
            onClick={goNext}
            disabled={pageIndex >= totalPages - 1}
            sx={{
              width: 44,
              height: 44,
              backgroundColor: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(44,26,14,0.08)',
              boxShadow: '0 2px 8px rgba(44,26,14,0.06)',
              color: pageIndex >= totalPages - 1 ? 'rgba(44,26,14,0.2)' : BARK,
              '&:hover': {
                backgroundColor: pageIndex >= totalPages - 1 ? 'rgba(255,255,255,0.95)' : '#fff',
                borderColor: pageIndex >= totalPages - 1 ? 'rgba(44,26,14,0.08)' : GOLD,
              },
              transition: 'all 0.2s',
            }}
          >
            <ChevronRight sx={{ fontSize: 26 }} />
          </IconButton>
        </Box>
      ) : (
        /* ── Mobile: container with floating arrows inside ── */
        <Container
          maxWidth={isCover ? false : 'md'}
          disableGutters
          sx={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: isCover ? 'center' : 'flex-start',
            height: '80vh',
            maxHeight: '80vh',
            width: isCover ? 'auto' : '100%',
            maxWidth: isCover ? '55vh' : undefined,
            background: '#fff',
            borderRadius: 0,
            boxShadow: '0 4px 24px rgba(44,26,14,0.08)',
            overflow: 'hidden',
            p: 0,
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              overflowY: isCover ? 'hidden' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: isCover ? 'stretch' : 'flex-start',
              justifyContent: isCover ? 'center' : 'flex-start',
            }}
          >
            {isCover ? (
              book.meta.cover ? (
                <Box
                  component="img"
                  src={book.meta.cover}
                  alt={book.meta.title}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : null
            ) : currentPage ? (
              <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', px: PAGE_MARGIN, py: PAGE_MARGIN }}>
                {/* Chapter header */}
                {hasChapterHeader && (
                  <Box sx={{ textAlign: 'center', pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 10 } }}>
                    <Typography
                      sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: { xs: 14, md: 16 },
                        color: MUTED,
                        textTransform: 'uppercase',
                        letterSpacing: '0.25em',
                        mb: 2,
                      }}
                    >
                      Chapter {currentPage.chapterNumber}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"EB Garamond", Georgia, serif',
                        fontSize: { xs: 32, md: 42 },
                        color: BARK,
                        fontWeight: 500,
                        direction: 'rtl',
                        lineHeight: 1.25,
                      }}
                    >
                      {currentPage.chapterTitleAr}
                    </Typography>
                    {currentPage.chapterTitleEn && (
                      <Typography
                        sx={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: { xs: 13, md: 15 },
                          color: MUTED,
                          mt: 1.5,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {currentPage.chapterTitleEn}
                      </Typography>
                    )}
                  </Box>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {currentPage.sentences.map((sentence) => (
                    <Typography
                      key={sentence.sentenceId}
                      component="p"
                      sx={{
                        fontFamily: '"EB Garamond", Georgia, serif',
                        fontSize: { xs: '1.25rem', md: '1.45rem' },
                        color: BARK,
                        direction: 'rtl',
                        textAlign: 'right',
                        lineHeight: 1.8,
                        margin: 0,
                      }}
                    >
                      <ArabicText
                        text={sentence.arabic}
                        wordMap={wordMap}
                        diacritizedMap={diacritizedMap}
                      />
                    </Typography>
                  ))}
                </Box>
              </Box>
            ) : null}
          </Box>

          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              px: 2,
              pointerEvents: 'none',
            }}
          >
            <IconButton
              onClick={goPrev}
              disabled={pageIndex === 0}
              sx={{
                pointerEvents: 'auto',
                width: 40,
                height: 40,
                backgroundColor: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(44,26,14,0.1)',
                boxShadow: '0 2px 8px rgba(44,26,14,0.1)',
                color: pageIndex === 0 ? 'rgba(44,26,14,0.2)' : BARK,
              }}
            >
              <ChevronLeft sx={{ fontSize: 22 }} />
            </IconButton>
            <IconButton
              onClick={goNext}
              disabled={pageIndex >= totalPages - 1}
              sx={{
                pointerEvents: 'auto',
                width: 40,
                height: 40,
                backgroundColor: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(44,26,14,0.1)',
                boxShadow: '0 2px 8px rgba(44,26,14,0.1)',
                color: pageIndex >= totalPages - 1 ? 'rgba(44,26,14,0.2)' : BARK,
              }}
            >
              <ChevronRight sx={{ fontSize: 22 }} />
            </IconButton>
          </Box>
        </Container>
      )}
    </Box>
  )
}
