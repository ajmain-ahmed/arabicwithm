'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'

interface ModeToggleCardProps {
  label: string
  description: string
  isActive: boolean
  onClick: () => void
  onHelpClick: () => void
}

function ModeToggleCard({
  label,
  description,
  isActive,
  onClick,
  onHelpClick,
}: ModeToggleCardProps) {
  const activeColor = '#b8860b'
  return (
    <Box
      onClick={onClick}
      sx={{
        background: isActive ? 'rgba(184,134,11,0.08)' : '#fff',
        border: '1.5px solid',
        borderColor: isActive ? activeColor : 'rgba(44,26,14,0.10)',
        borderRadius: '10px',
        p: '10px 12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0.3,
        transition: 'all 0.15s ease',
        height: '100%',
        '&:hover': {
          borderColor: activeColor,
          boxShadow: '0 1px 4px rgba(184,134,11,0.12)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontSize: '0.85rem',
            fontWeight: 700,
            color: isActive ? '#2c1a0e' : '#5a4e47',
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
        <Box
          component="span"
          onClick={(e) => { e.stopPropagation(); onHelpClick() }}
          sx={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '1px solid rgba(44,26,14,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#7a6e65',
            cursor: 'pointer',
            flexShrink: 0,
            ml: 0.5,
            '&:hover': { borderColor: activeColor, color: activeColor },
          }}
        >
          ?
        </Box>
      </Box>
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.65rem',
          color: isActive ? '#7a6e65' : '#9e8a7a',
          lineHeight: 1.3,
        }}
      >
        {description}
      </Typography>
    </Box>
  )
}

export default React.memo(ModeToggleCard)
