'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import CefrChip from '@/app/components/CefrChip'
import { formatPos } from '@/app/lib/display'
import { CEFR_LEVELS, CEFR_PALETTE } from '@/app/lib/cefr'
import { readGrammaticalCase } from '@/app/lib/bookTokenGrammar'
import type { VocabEntry } from './index'

export const LEVEL_COLORS: Record<string, string> = Object.fromEntries(
  CEFR_LEVELS.map((level) => [level, CEFR_PALETTE[level].background]),
)

/* ─────────────────────────────────────────────
   WordTooltip — tooltip card content
   ───────────────────────────────────────────── */
export default function WordTooltip({
  entry,
  textScale = 1,
}: {
  entry: VocabEntry
  textScale?: number
}) {
 const {t:awmT}=useWebsiteLocale()

  const grammaticalCase = readGrammaticalCase(entry.grammatical_case)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200, position: 'relative', pt: 0.5 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: `calc(1.6rem * ${textScale})`,
            fontWeight: 700,
            color: 'var(--bark, #2c1a0e)',
            direction: 'rtl',
          }}
        >
          {entry.arabic}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: `calc(0.85rem * ${textScale})`,
            color: 'var(--muted, #7a6e65)',
            mt: 0.5,
          }}
        >
          {entry.transliteration}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
        {entry.cefr && (
          <CefrChip
            level={entry.cefr}
            size="small"
            sx={{
              fontSize: `calc(0.7rem * ${textScale})`,
            }}
          />
        )}
        {entry.pos && (
          <Chip
            label={formatPos(entry.pos)}
            size="small"
            sx={{
              bgcolor: 'color-mix(in srgb, var(--awm-gold) 15%, transparent)',
              color: 'var(--awm-gold)',
              fontFamily: 'var(--font-sans), sans-serif',
              fontWeight: 600,
              fontSize: `calc(0.7rem * ${textScale})`,
              letterSpacing: '0.04em',
            }}
          />
        )}
      </Box>

      {grammaticalCase && (
        <Box aria-label={awmT("Grammatical case")} sx={{ textAlign: 'center', overflowWrap: 'anywhere', minWidth: 0 }}>
          <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--awm-muted)' }}><UiText>{"Case"}</UiText></Typography>
          {grammaticalCase.arabic && <Typography lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-serif)', fontSize: `calc(1.1rem * ${textScale})` }}>{grammaticalCase.arabic}</Typography>}
          {grammaticalCase.english && <Typography lang="en" dir="ltr" sx={{ fontFamily: 'var(--font-sans)', fontSize: `calc(0.8rem * ${textScale})` }}>{grammaticalCase.english}</Typography>}
        </Box>
      )}

      <Typography
        sx={{
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: `calc(0.95rem * ${textScale})`,
          color: 'var(--bark, #2c1a0e)',
          textAlign: 'center',
          minHeight: `calc(0.95rem * ${textScale})`,
        }}
      >
        {entry.english || '—'}
      </Typography>
    </Box>
  )
}
