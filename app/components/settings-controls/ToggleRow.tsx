'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'

export interface ToggleRowProps {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
  activeColor?: string
}

export default function ToggleRow({
  label, description, enabled, onToggle, activeColor = '#b8860b',
}: ToggleRowProps) {
  return (
    <Box onClick={onToggle} sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      cursor: 'pointer', py: 1.25, px: 1.5, borderRadius: '10px', border: '1px solid',
      borderColor: enabled ? `${activeColor}55` : 'rgba(122,110,101,0.15)',
      background: enabled ? `${activeColor}08` : 'rgba(122,110,101,0.03)',
      transition: 'all 0.15s', userSelect: 'none',
      '&:hover': { borderColor: `${activeColor}88`, background: `${activeColor}0d` },
    }}>
      <Box sx={{ pr: 2 }}>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>{label}</Typography>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: 'var(--awm-muted)', mt: 0.3, lineHeight: 1.4 }}>{description}</Typography>
      </Box>
      <Box sx={{
        width: 38, height: 22, borderRadius: '999px', flexShrink: 0,
        background: enabled ? activeColor : 'rgba(122,110,101,0.22)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <Box sx={{
          position: 'absolute', top: '3px', left: enabled ? '19px' : '3px',
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--awm-white)', boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
          transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </Box>
    </Box>
  )
}
