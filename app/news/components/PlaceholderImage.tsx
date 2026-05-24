'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'

interface PlaceholderImageProps {
  label?: string
  aspectRatio?: string
  sx?: Record<string, unknown>
}

export default function PlaceholderImage({ label, aspectRatio = '16/10', sx = {} }: PlaceholderImageProps) {
  const initial = label ? label.charAt(0).toUpperCase() : '?'

  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio,
        background: 'linear-gradient(135deg, #2c1a0e 0%, #4a3525 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        gap: 1,
        ...sx,
      }}
    >
      {/* Subtle pattern */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            #f5ede0 10px,
            #f5ede0 11px
          )`,
        }}
      />

      {/* Initial circle */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(184,134,11,0.15)',
          border: '1px solid rgba(184,134,11,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#d4a843',
          }}
        >
          {initial}
        </Typography>
      </Box>

      {label && (
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'rgba(245,237,224,0.7)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            zIndex: 1,
            textAlign: 'center',
            px: 1,
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  )
}
