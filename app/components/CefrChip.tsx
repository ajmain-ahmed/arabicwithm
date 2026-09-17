'use client'

import { Chip, type ChipProps } from '@mui/material'
import { formatCefr } from '@/app/lib/display'
import { getCefrPalette } from '@/app/lib/cefr'

export interface CefrChipProps extends Omit<ChipProps, 'label'> {
  level: string
}

export default function CefrChip({ level, sx, ...props }: CefrChipProps) {
  const palette = getCefrPalette(level)
  const sharedSx = {
    bgcolor: palette.background,
    color: palette.foreground,
    borderColor: palette.background,
    fontFamily: 'Jost, sans-serif',
    fontWeight: 700,
    letterSpacing: '0.035em',
  } as const

  return (
    <Chip
      {...props}
      label={formatCefr(level)}
      sx={[sharedSx, ...(sx ? (Array.isArray(sx) ? sx : [sx]) : [])]}
    />
  )
}
