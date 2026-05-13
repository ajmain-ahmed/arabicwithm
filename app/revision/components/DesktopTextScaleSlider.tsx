'use client'

import { Box, Typography, Slider } from '@mui/material'

export default function DesktopTextScaleSlider({ textScale, onChange }: { textScale: number; onChange: (v: number) => void }) {
    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 0.5, borderRadius: '999px',
            border: '1px solid rgba(122,110,101,0.2)',
            background: 'rgba(122,110,101,0.02)', minWidth: 160,
        }}>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
            <Slider value={textScale} min={1.0} max={1.4} step={0.1} size="small" onChange={(_, v) => onChange(v as number)} sx={{ color: '#b8860b', flex: 1, '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
        </Box>
    )
}
