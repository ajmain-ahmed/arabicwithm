'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import Grid from '@mui/material/Grid'

/* ── Palette ── */
const GOLD = '#b8860b'
const WARM_WHITE = '#fffaf0'

/* ── How It Works background ── */
const HOW_IT_WORKS_BG = "url('/pattern.svg')"

export interface HowItWorksStep {
  icon: React.ReactNode
  title: string
  desc: string
}

export interface HowItWorksSectionProps {
  steps: HowItWorksStep[]
  label?: string
  heading?: string
}

export default function HowItWorksSection({
  steps,
  label = 'How It Works',
  heading = 'Three Steps to Learning',
}: HowItWorksSectionProps) {
  return (
    <Box
      sx={{
        backgroundColor: '#1f1d21',
        backgroundImage: HOW_IT_WORKS_BG,
        borderRadius: { xs: '0px', md: '16px' },
        px: { xs: 3, md: 6 },
        py: { xs: 5, md: 6 },
        mx: { xs: -2, md: -3 },
        mb: 6,
        textAlign: 'center',
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Jost", system-ui, sans-serif',
          fontSize: { xs: 12, md: 13 },
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#ffffff',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: { xs: 22, md: 28 },
          color: WARM_WHITE,
          mb: 4,
        }}
      >
        {heading}
      </Typography>

      <Grid container spacing={3}>
        {steps.map((step) => (
          <Grid size={{ xs: 12, md: 4 }} key={step.title}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: WARM_WHITE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  boxShadow: '0 2px 8px rgba(44,26,14,0.06)',
                }}
              >
                {step.icon}
              </Box>
              <Typography
                sx={{
                  fontFamily: '"Jost", system-ui, sans-serif',
                  fontSize: { xs: 15, md: 17 },
                  fontWeight: 600,
                  color: WARM_WHITE,
                  mb: 0.5,
                }}
              >
                {step.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 14, md: 15 },
                  fontWeight: { xs: 600, md: 500 },
                  color: { xs: 'rgba(245,237,224,0.9)', md: 'rgba(245,237,224,0.7)' },
                  lineHeight: 1.5,
                  maxWidth: 280,
                  mx: 'auto',
                }}
              >
                {step.desc}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
