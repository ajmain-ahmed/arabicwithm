'use client'

import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { formatCefr, formatPos } from '@/app/lib/display'
import type { VocabEntry } from './index'

export const LEVEL_COLORS: Record<string, string> = {
  A0: '#5c8a6f',
  A1: '#2d6a4f',
  A2: '#40916c',
  B1: '#b5861a',
  B2: '#9c6b00',
  C1: '#6d4c9e',
  C2: '#4a2f7a',
}

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
          <Chip
            label={formatCefr(entry.cefr)}
            size="small"
            sx={{
              bgcolor: LEVEL_COLORS[formatCefr(entry.cefr)] ?? 'rgba(44,26,14,0.08)',
              color: '#fff',
              fontFamily: 'Jost, sans-serif',
              fontWeight: 700,
              fontSize: `calc(0.7rem * ${textScale})`,
              letterSpacing: '0.04em',
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
