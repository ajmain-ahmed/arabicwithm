'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'

export interface PillToggleProps {
  enabled: boolean
  onToggle: () => void
  label: string
  activeColor?: string
}

export default function PillToggle({
  enabled, onToggle, label, activeColor = '#b8860b',
}: PillToggleProps) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
        cursor: 'pointer', userSelect: 'none',
        padding: '5px 10px', borderRadius: '999px',
        border: '1px solid',
        borderColor: enabled ? activeColor : 'rgba(122,110,101,0.25)',
        background: enabled ? `${activeColor}14` : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
        height: 36,
        width: '100%',
        '&:hover': { borderColor: activeColor, background: `${activeColor}0d` },
      }}
    >
      <Box sx={{
        width: 24, height: 14, borderRadius: '999px',
        background: enabled ? activeColor : 'rgba(122,110,101,0.2)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <Box sx={{
          position: 'absolute', top: '2px',
          left: enabled ? '12px' : '2px',
          width: 10, height: 10, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </Box>
      <Typography sx={{
        fontFamily: 'Jost, sans-serif',
        fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.95rem' },
        fontWeight: 500, color: enabled ? activeColor : '#7a6e65',
        whiteSpace: 'nowrap', lineHeight: 1, transition: 'color 0.15s',
      }}>
        {label}
      </Typography>
    </Box>
  )
}
