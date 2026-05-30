'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  Drawer,
  Tooltip,
  tooltipClasses,
  TooltipProps,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'
import { useMediaQuery } from '@mui/material'
import { Close, Add, Check } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { useRevisionStore } from '@/store/revisionStore'
import { useVocabStore } from '@/store/vocabStore'
import type { WordBreakdown } from '@/app/lib/news'

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#fff',
    color: '#2c1a0e',
    maxWidth: 300,
    fontSize: theme.typography.pxToRem(14),
    border: '1px solid rgba(44,26,14,0.08)',
    borderRadius: '12px',
    padding: 0,
    boxShadow: '0 12px 40px rgba(44,26,14,0.18)',
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: '#fff',
    '&::before': {
      border: '1px solid rgba(44,26,14,0.08)',
    },
  },
}))

interface InlineMdVocabProps {
  text: string
  wordBreakdown: WordBreakdown[]
}

export default function InlineMdVocab({ text, wordBreakdown }: InlineMdVocabProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Build lookup: stripped Arabic word → WordBreakdown entry
  const lookup = useMemo(() => {
    const map = new Map<string, WordBreakdown>()
    for (const w of wordBreakdown) {
      map.set(w.arabic, w)
      // Also store plain form for matching
      if (w.plain && w.plain !== w.arabic) {
        map.set(w.plain, w)
      }
    }
    return map
  }, [wordBreakdown])

  // Split text on Arabic words
  const parts = text.split(/([\u0600-\u06FF]+)/)

  return (
    <span>
      {parts.map((part, idx) => {
        const isArabic = /[\u0600-\u06FF]+/.test(part)
        if (!isArabic) {
          return <span key={idx}>{part}</span>
        }

        const entry = lookup.get(part)
        if (!entry) {
          return <span key={idx}>{part}</span>
        }

        return (
          <VocabWord
            key={idx}
            word={part}
            entry={entry}
            isMobile={isMobile}
          />
        )
      })}
    </span>
  )
}

/* ── Single Vocab Word ── */

function VocabWord({
  word,
  entry,
  isMobile,
}: {
  word: string
  entry: WordBreakdown
  isMobile: boolean
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const { user } = useAuth()
  const canAdd = !!entry.dbWordId && !!user

  const toggleRevisionBuffered = useRevisionStore((s) => s.toggleRevisionBuffered)
  const updateUserProgressWord = useVocabStore((s) => s.updateUserProgressWord)

  const handleAdd = useCallback(() => {
    if (!entry.dbWordId || !user) return
    toggleRevisionBuffered(entry.dbWordId)
    updateUserProgressWord(entry.dbWordId, 'revision')
    setAdded(true)
  }, [entry.dbWordId, user, toggleRevisionBuffered, updateUserProgressWord])

  const content = (
    <VocabTooltipContent
      entry={entry}
      canAdd={canAdd}
      added={added}
      onAdd={handleAdd}
      onClose={() => setDrawerOpen(false)}
      isMobile={isMobile}
    />
  )

  const wordSpan = (
    <Box
      component="span"
      onClick={() => isMobile && setDrawerOpen(true)}
      sx={{
        borderBottom: '2px dotted #b8860b',
        cursor: isMobile ? 'pointer' : 'help',
        transition: 'background 0.15s ease',
        borderRadius: '2px',
        '&:hover': {
          background: 'rgba(184,134,11,0.1)',
        },
      }}
    >
      {word}
    </Box>
  )

  if (isMobile) {
    return (
      <>
        {wordSpan}
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '16px 16px 0 0',
                px: 3,
                py: 3,
                maxHeight: '70vh',
              },
            },
          }}
        >
          {content}
        </Drawer>
      </>
    )
  }

  return (
    <HtmlTooltip
      title={content}
      arrow
      placement="top"
      enterDelay={200}
      leaveDelay={100}
    >
      {wordSpan}
    </HtmlTooltip>
  )
}

/* ── Tooltip / Drawer Content ── */

function VocabTooltipContent({
  entry,
  canAdd,
  added,
  onAdd,
  onClose,
  isMobile,
}: {
  entry: WordBreakdown
  canAdd: boolean
  added: boolean
  onAdd: () => void
  onClose: () => void
  isMobile: boolean
}) {
  return (
    <Box sx={{ p: isMobile ? 0 : 2, minWidth: isMobile ? 'auto' : 260 }}>
      {isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Close sx={{ color: '#9e8a7a', cursor: 'pointer' }} onClick={onClose} />
        </Box>
      )}

      {/* Arabic word */}
      <Typography
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: '1.4rem',
          fontWeight: 700,
          color: '#2c1a0e',
          direction: 'rtl',
          mb: 0.5,
        }}
      >
        {entry.arabic}
      </Typography>

      {/* Plain */}
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.85rem',
          color: '#7a6e65',
          direction: 'rtl',
          mb: 1.5,
        }}
      >
        {entry.plain}
      </Typography>

      {/* Details grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
        {entry.root && <DetailItem label="Root" value={entry.root} />}
        {entry.pos && <DetailItem label="Part of Speech" value={entry.pos} />}
        <DetailItem label="English" value={entry.english} />
        {entry.dbLink && (
          <DetailItem label="Dictionary Form" value={entry.dbLink} isGold />
        )}
      </Box>

      {/* Add to Revision */}
      {canAdd && (
        <Box
          component="button"
          onClick={onAdd}
          disabled={added}
          sx={{
            width: '100%',
            py: 1,
            borderRadius: '10px',
            border: 'none',
            background: added ? 'rgba(46,125,50,0.1)' : '#2c1a0e',
            color: added ? '#2e7d32' : '#f5ede0',
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: added ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.8,
            transition: 'all 0.2s ease',
            '&:hover:not(:disabled)': {
              background: '#1a0f08',
            },
          }}
        >
          {added ? <Check sx={{ fontSize: 16 }} /> : <Add sx={{ fontSize: 16 }} />}
          {added ? 'Added to Revision' : 'Add to Revision'}
        </Box>
      )}
      {!canAdd && entry.dbLink && (
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.75rem',
            color: '#9e8a7a',
            textAlign: 'center',
          }}
        >
          Sign in to save words for revision
        </Typography>
      )}
    </Box>
  )
}

function DetailItem({
  label,
  value,
  isGold,
}: {
  label: string
  value: string
  isGold?: boolean
}) {
  return (
    <Box>
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.6rem',
          fontWeight: 600,
          color: '#9e8a7a',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 0.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: isGold ? "'EB Garamond', serif" : 'Jost, sans-serif',
          fontSize: '0.85rem',
          color: isGold ? '#b8860b' : '#2c1a0e',
          fontWeight: isGold ? 700 : 500,
          direction: label === 'Root' || label === 'Dictionary Form' ? 'rtl' : 'ltr',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}
