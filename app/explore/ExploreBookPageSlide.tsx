'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import LocalisedContent from '@/app/components/LocalisedContent'
import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowForward, MenuBook } from '@mui/icons-material'
import { Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material'
import { HtmlTooltip, WordTooltip, type VocabEntry } from '@/app/components/vocab-tooltip'
import type { ExploreBookPage } from '@/app/actions/books'
import { dispatchWordLookup } from '@/app/lib/activity'

export type OpenDefinition = (entry: VocabEntry, anchor: HTMLElement, context: string, itemIndex: number) => void

function ExploreDefinitionWord({ entry, context, itemIndex, onOpen, onPeek }: {
  entry: VocabEntry
  context: string
  itemIndex: number
  onOpen: OpenDefinition
  onPeek: (itemIndex: number | null) => void
}) {
 const {t:awmT}=useWebsiteLocale()

  const theme = useTheme()
  const isTouchLayout = useMediaQuery(theme.breakpoints.down('lg'))
  const [hoverOpen, setHoverOpen] = useState(false)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    clearLeaveTimer()
    leaveTimerRef.current = setTimeout(() => {
      setHoverOpen(false)
      onPeek(null)
    }, 60)
  }, [clearLeaveTimer, onPeek])

  const handleHoverOpen = useCallback(() => {
    clearLeaveTimer()
    setHoverOpen(true)
    onPeek(itemIndex)
    dispatchWordLookup()
  }, [clearLeaveTimer, itemIndex, onPeek])

  useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer])

  const wordStyles = {
    display: 'inline-block',
    mx: '0.1em',
    cursor: 'pointer',
    borderBottom: '2px dotted var(--awm-gold)',
    transition: 'background-color .12s ease',
    '&:hover, &:focus-visible': { bgcolor: 'color-mix(in srgb, var(--awm-gold) 14%, transparent)', outline: 'none' },
  } as const

  if (isTouchLayout) {
    const open = (target: HTMLElement) => onOpen(entry, target, context, itemIndex)
    return (
      <Box
        component="span"
        className="vocab-word"
        role="button"
        tabIndex={0}
        aria-label={awmT('Show definition for {word}',{word:entry.arabic})}
        onClick={(event) => {
          event.stopPropagation()
          open(event.currentTarget)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          open(event.currentTarget)
        }}
        sx={wordStyles}
      >
        {entry.arabic}
      </Box>
    )
  }

  return (
    <HtmlTooltip
      open={hoverOpen}
      title={hoverOpen ? (
        <Box onMouseEnter={clearLeaveTimer} onMouseLeave={scheduleClose} sx={{ p: 2.5 }}>
          <WordTooltip entry={entry} />
        </Box>
      ) : <></>}
      placement="bottom"
      arrow
      describeChild
      disableHoverListener
      disableFocusListener
      disableTouchListener
      slotProps={{
        popper: {
          modifiers: [
            { name: 'preventOverflow', enabled: true, options: { padding: 16, boundary: 'viewport' } },
            { name: 'flip', enabled: true, options: { padding: 16 } },
          ],
        },
      }}
    >
      <Box component="span" className="vocab-word" onMouseEnter={handleHoverOpen} onMouseLeave={scheduleClose} sx={wordStyles}>
        {entry.arabic}
      </Box>
    </HtmlTooltip>
  )
}

export function ExploreBookPageSlide({ page, itemIndex, onDefinitionOpen, onDefinitionPeek }: {
  page: ExploreBookPage
  itemIndex: number
  onDefinitionOpen: OpenDefinition
  onDefinitionPeek: (itemIndex: number | null) => void
}) {
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', px: { xs: 1.5, sm: 3, md: 6 }, pt: { xs: 1.5, md: 3 }, pb: { xs: 'calc(12px + env(safe-area-inset-bottom))', md: 3 } }}>
      <Box sx={{ width: 'min(920px, 100%)', maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--awm-gold) 24%, transparent)', borderRadius: { xs: '16px', md: '22px' }, bgcolor: 'var(--awm-white)', boxShadow: '0 22px 60px rgba(44,26,14,0.12)' }}>
        <Box sx={{ px: { xs: 2.25, md: 4 }, py: { xs: 1.75, md: 2.5 }, bgcolor: '#0e2e1f', color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MenuBook sx={{ color: '#d4a843', fontSize: 20 }} />
            <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', color: '#d4a843', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              <UiText>{"Random reading · Page"}</UiText>{' '}{page.pageNumber}
            </Typography>
          </Box>
          <Typography component="h2" sx={{ mt: 0.6, fontFamily: 'var(--font-heading)', fontSize: { xs: 23, md: 30 }, fontWeight: 600, lineHeight: 1.15 }}>
            <LocalisedContent original={page.bookTitle} arabic={page.bookTitleAr}/>
          </Typography>
          <Typography sx={{ mt: 0.4, fontFamily: 'var(--font-sans), sans-serif', fontSize: 12.5, opacity: 0.76 }}>
            <UiText>{"Chapter"}</UiText>{' '}{page.chapterNumber}: {page.chapterTitle}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2.25, md: 4 }, py: { xs: 1.5, md: 2.5 } }}>
          {page.blocks.map((block, blockIndex) => (
            <Box key={blockIndex} sx={{ py: { xs: 1, md: 1.35 }, borderBottom: blockIndex < page.blocks.length - 1 ? '1px solid color-mix(in srgb, var(--awm-bark) 8%, transparent)' : 0 }}>
              <Typography component="div" lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-book-naskh), var(--font-serif), serif', fontSize: { xs: 22, md: 28 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.85, textAlign: 'right' }}>
                {block.words.map((word, wordIndex) => (
                  <ExploreDefinitionWord
                    key={`${word.plain}-${wordIndex}`}
                    entry={word}
                    context={`book:${page.id}:block:${blockIndex}`}
                    itemIndex={itemIndex}
                    onOpen={onDefinitionOpen}
                    onPeek={onDefinitionPeek}
                  />
                ))}
                {block.punctuation}
              </Typography>
              {block.translation && (
                <Typography sx={{ mt: 0.35, fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 13, md: 14.5 }, color: 'var(--awm-muted)', lineHeight: 1.6 }}>
                  {block.translation}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        <Box sx={{ px: { xs: 2.25, md: 4 }, py: { xs: 1.5, md: 2 }, borderTop: '1px solid color-mix(in srgb, var(--awm-bark) 8%, transparent)' }}>
          <Button
            component={Link}
            href={`/books/${encodeURIComponent(page.bookSlug)}/${encodeURIComponent(page.chapterSlug)}`}
            fullWidth
            variant="contained"
            endIcon={<ArrowForward />}
            sx={{ bgcolor: '#0e2e1f', color: '#fff', borderRadius: '10px', py: 1.1, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#174832' } }}
          >
            <UiText>{"Continue to chapter"}</UiText></Button>
        </Box>
      </Box>
    </Box>
  )
}
