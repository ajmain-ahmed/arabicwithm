'use client'

import React from 'react'
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip'
import { styled } from '@mui/material/styles'

/* ─────────────────────────────────────────────
   HtmlTooltip — styled MUI Tooltip (desktop)
   ───────────────────────────────────────────── */
const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: 'color-mix(in srgb, var(--awm-elevated-bg, #fff) 92%, transparent)',
    color: theme.palette.text.primary,
    maxWidth: 320,
    fontSize: theme.typography.pxToRem(14),
    border: '1px solid var(--awm-elevated-border, rgba(44,26,14,0.08))',
    borderRadius: '12px',
    padding: 0,
    boxShadow: 'var(--awm-elevated-shadow, 0 12px 40px rgba(44,26,14,0.18))',
    backdropFilter: 'blur(14px) saturate(130%)',
    WebkitBackdropFilter: 'blur(14px) saturate(130%)',
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: 'color-mix(in srgb, var(--awm-elevated-bg, #fff) 92%, transparent)',
    '&::before': {
      border: '1px solid var(--awm-elevated-border, rgba(44,26,14,0.08))',
    },
  },
}))

export default HtmlTooltip
