'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'

interface DailyReviewCardProps {
  isActive: boolean
  onClick: () => void
}

function DailyReviewCard({
  isActive,
  onClick,
}: DailyReviewCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        background: '#2c1a0e',
        borderRadius: '14px',
        cursor: 'pointer',
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.2s ease',
        outline: isActive ? '3px solid #b8860b' : '3px solid transparent',
        outlineOffset: 2,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(44,26,14,0.25)',
        },
      }}
    >
      <Box
        component="img"
        src="/themes/study.avif"
        alt="Daily Review"
        sx={{
          width: '40%',
          objectFit: 'cover',
          objectPosition: 'center',
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', p: '22px 24px', gap: 1 }}>
        <Typography
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#f5ede0',
            lineHeight: 1.2,
          }}
        >
          Daily Review
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.8rem',
            color: 'rgba(245,237,224,0.55)',
            lineHeight: 1.4,
          }}
        >
          Spaced repetition review
        </Typography>
      </Box>
    </Box>
  )
}

export default React.memo(DailyReviewCard)
