'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'

interface CustomQuizCardProps {
  onClick: () => void
}

function CustomQuizCard({ onClick }: CustomQuizCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        background: '#fff',
        border: '1.5px solid rgba(44,26,14,0.10)',
        borderRadius: '14px',
        cursor: 'pointer',
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#b8860b',
          boxShadow: '0 4px 16px rgba(184,134,11,0.12)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        component="img"
        src="/themes/transport.avif"
        alt="Custom Quiz"
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
            color: '#2c1a0e',
            lineHeight: 1.2,
          }}
        >
          Custom Quiz
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.8rem',
            color: '#7a6e65',
            lineHeight: 1.4,
          }}
        >
          Choose your own practice
        </Typography>
      </Box>
    </Box>
  )
}

export default React.memo(CustomQuizCard)
