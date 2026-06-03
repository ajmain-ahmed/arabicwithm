'use client'

import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { ChevronRight } from '@mui/icons-material'

/* ── Palette ── */
const GOLD = '#b8860b'

export interface PlacementTestCTAProps {
  heading: string
  description: string
  ctaLabel: string
  ctaAction?: () => void
  backgroundImage?: string
}

export default function PlacementTestCTA({
  heading,
  description,
  ctaLabel,
  ctaAction,
  backgroundImage = '/cards/awm6_converted.avif',
}: PlacementTestCTAProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        pt: 5,
        pb: { xs: 6, md: 10 },
        px: 3,
        textAlign: 'center',
        borderRadius: { xs: 0, md: '16px' },
        mx: { xs: -2, md: -3 },
        mt: { xs: 3, md: 4 },
        mb: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        component="img"
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(44,26,14,0.78)',
        }}
      />
      <Typography
        sx={{
          position: 'relative',
          zIndex: 1,
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: 22,
          color: '#fff',
          mb: 1.5,
        }}
      >
        {heading}
      </Typography>
      <Typography
        sx={{
          position: 'relative',
          zIndex: 1,
          fontSize: 14,
          color: 'rgba(255,255,255,0.7)',
          maxWidth: 400,
          mx: 'auto',
          mb: 3,
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>
      <Button
        variant="contained"
        endIcon={<ChevronRight />}
        onClick={ctaAction}
        sx={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: GOLD,
          color: '#2c1a0e',
          fontFamily: '"Jost", system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: '9999px',
          px: 4,
          py: 1.2,
          minHeight: 48,
          '&:hover': { backgroundColor: '#d4a843' },
        }}
      >
        {ctaLabel}
      </Button>
    </Box>
  )
}
