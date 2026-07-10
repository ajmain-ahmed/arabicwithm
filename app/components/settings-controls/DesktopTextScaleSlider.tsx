'use client'

import React from 'react'
import { Box, Slider, Typography } from '@mui/material'

export interface DesktopTextScaleSliderProps {
  textScale: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export default function DesktopTextScaleSlider({
  textScale, onChange, min = 1.0, max = 1.4,
}: DesktopTextScaleSliderProps) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      px: 1.5, borderRadius: '999px',
      border: '1px solid rgba(122,110,101,0.2)',
      background: 'rgba(122,110,101,0.02)',
      height: 36, flex: 1, minWidth: 100,
    }}>
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
      <Slider
        value={textScale} min={min} max={max} step={0.1} size="small"
        onChange={(_, v) => onChange(v as number)}
        sx={{ color: '#b8860b', flex: 1, '& .MuiSlider-thumb': { width: 14, height: 14 } }}
      />
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
    </Box>
  )
}
