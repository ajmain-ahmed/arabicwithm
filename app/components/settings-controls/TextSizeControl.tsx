'use client'

import { Box, IconButton, Typography } from '@mui/material'
import { Add, Remove } from '@mui/icons-material'

export const TEXT_SCALES = [.8, .9, 1, 1.15, 1.3] as const
const labels = ['Small', 'Compact', 'Medium', 'Large', 'Extra large']
export function safeTextSize(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < TEXT_SCALES.length ? value : 2
}
export default function TextSizeControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Box sx={{ my: 1 }}><Typography sx={{ fontSize: 14 }}>{label}</Typography><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
    <IconButton aria-label={`Decrease ${label}`} disabled={value === 0} onClick={() => onChange(value - 1)}><Remove /></IconButton>
    <Typography aria-live="polite" sx={{ fontSize: 14 }}>{labels[value]}</Typography>
    <IconButton aria-label={`Increase ${label}`} disabled={value === TEXT_SCALES.length - 1} onClick={() => onChange(value + 1)}><Add /></IconButton>
  </Box></Box>
}
