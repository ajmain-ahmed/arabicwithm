'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import { Newspaper } from 'lucide-react'

interface EmptyStateProps {
  level?: string
}

function EmptyState({ level }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(184,134,11,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Newspaper size={28} color="#b8860b" />
      </Box>
      <Typography
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: '1.3rem',
          fontWeight: 700,
          color: '#2c1a0e',
        }}
      >
        Articles coming soon
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.9rem',
          color: '#7a6e65',
          maxWidth: 360,
          lineHeight: 1.6,
        }}
      >
        {level
          ? `We're working on ${level} level articles. Check back soon for new content!`
          : 'No articles available at this level yet. Check back soon!'}
      </Typography>
    </Box>
  )
}

export default React.memo(EmptyState)
