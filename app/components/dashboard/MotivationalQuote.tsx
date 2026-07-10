'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'

export default function MotivationalQuote() {
  return (
    <Box
      sx={{
        background: '#fff',
        borderRadius: '20px',
        p: { xs: 4, md: 5 },
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle pattern */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0z' fill='none' stroke='%230e2e1f' stroke-width='0.3'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Opening quote mark */}
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: { xs: '3.5rem', md: '5rem' },
            color: 'var(--gold)',
            opacity: 0.15,
            lineHeight: 0.6,
            mb: { xs: 1, md: 1.5 },
          }}
        >
          &ldquo;
        </Typography>

        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: { xs: '1.3rem', md: '1.6rem', lg: '1.8rem' },
            fontWeight: 600,
            fontStyle: 'italic',
            color: 'var(--bark)',
            lineHeight: 1.6,
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          You&apos;re showing up for your goals.
          <br />
          Consistency today, fluency tomorrow.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mt: { xs: 2.5, md: 3 } }}>
          <Box sx={{ width: 50, height: 1, background: 'rgba(184,134,11,0.3)' }} />
          <StarIcon sx={{ fontSize: { xs: 16, md: 18 }, color: 'var(--gold)' }} />
          <Box sx={{ width: 50, height: 1, background: 'rgba(184,134,11,0.3)' }} />
        </Box>

        {/* Closing quote mark */}
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: { xs: '3.5rem', md: '5rem' },
            color: 'var(--gold)',
            opacity: 0.15,
            lineHeight: 0.6,
            mt: { xs: 1, md: 1.5 },
          }}
        >
          &rdquo;
        </Typography>
      </Box>
    </Box>
  )
}
