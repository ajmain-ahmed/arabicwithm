'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'

const LEVEL_COLORS: Record<string, string> = {
  A0: '#1565c0',
  A1: '#2e7d32',
  A2: '#c13a00',
  B1: '#6a1b9a',
  B2: '#b8860b',
  C1: '#c62828',
  C2: '#00695c',
}

interface LevelBadgeProps {
  level: string
  size?: 'sm' | 'md'
}

function LevelBadge({ level, size = 'sm' }: LevelBadgeProps) {
  const normalized = level.replace(/\s*\(.+\)/, '').trim().toUpperCase()
  const color = LEVEL_COLORS[normalized] ?? '#7a6e65'

  const isSmall = size === 'sm'

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: isSmall ? 1 : 1.5,
        py: isSmall ? 0.3 : 0.5,
        borderRadius: '999px',
        background: `${color}15`,
        border: `1px solid ${color}30`,
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: isSmall ? '0.65rem' : '0.75rem',
          fontWeight: 700,
          color,
          lineHeight: 1,
          letterSpacing: '0.02em',
        }}
      >
        {normalized}
      </Typography>
    </Box>
  )
}

export default React.memo(LevelBadge)
