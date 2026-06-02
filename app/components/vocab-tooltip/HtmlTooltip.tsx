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
    backgroundColor: '#fff',
    color: 'var(--bark, #2c1a0e)',
    maxWidth: 320,
    fontSize: theme.typography.pxToRem(14),
    border: '1px solid rgba(44,26,14,0.08)',
    borderRadius: '12px',
    padding: 0,
    boxShadow: '0 12px 40px rgba(44,26,14,0.18)',
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: '#fff',
    '&::before': {
      border: '1px solid rgba(44,26,14,0.08)',
    },
  },
}))

export default HtmlTooltip
