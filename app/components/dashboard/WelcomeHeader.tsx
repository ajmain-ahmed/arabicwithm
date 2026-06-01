'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import WavingHandIcon from '@mui/icons-material/WavingHand'
import type { DashboardData } from '@/app/actions/dashboard'

export default function WelcomeHeader({ data }: { data: DashboardData }) {
  return (
    <Box>
      <Typography
        sx={{
          fontFamily: 'var(--font-serif)',
          fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3rem', lg: '3.4rem' },
          fontWeight: 700,
          color: 'var(--bark)',
          lineHeight: 1.15,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <span>السَّلَامُ عَلَيْكُمْ {data.user.name || 'مُحَمَّد'}</span>
        <WavingHandIcon sx={{ fontSize: { xs: '1.3rem', md: '1.8rem' }, color: '#b8860b' }} />
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-sans)',
          fontSize: { xs: '0.95rem', md: '1.05rem', lg: '1.15rem' },
          fontWeight: 500,
          color: 'var(--muted)',
          mt: { xs: 0.75, md: 1 },
          lineHeight: 1.5,
        }}
      >
        Great to see you again! Ready to level up your Arabic?
      </Typography>
    </Box>
  )
}
