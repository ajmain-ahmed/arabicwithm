'use client'

import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import CefrChip from '@/app/components/CefrChip'
import { formatPos } from '@/app/lib/display'
import { CEFR_LEVELS, CEFR_PALETTE } from '@/app/lib/cefr'
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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200, position: 'relative', pt: 0.5 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"EB Garamond", Georgia, serif',
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
            fontFamily: 'Jost, sans-serif',
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
              bgcolor: 'rgba(184,134,11,0.15)',
              color: '#b8860b',
              fontFamily: 'Jost, sans-serif',
              fontWeight: 600,
              fontSize: `calc(0.7rem * ${textScale})`,
              letterSpacing: '0.04em',
            }}
          />
        )}
      </Box>

      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
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
