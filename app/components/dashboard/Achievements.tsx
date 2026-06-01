'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import type { DashboardData } from '@/app/actions/dashboard'

function HexBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: { xs: 1, md: 1.5 } }}>
      <Box
        sx={{
          width: { xs: 72, md: 88 },
          height: { xs: 72, md: 88 },
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 64 64"
          fill="none"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <path
            d="M32 2 L60 17 L60 47 L32 62 L4 47 L4 17 Z"
            fill={color}
            fillOpacity="0.12"
            stroke={color}
            strokeWidth="2"
          />
        </svg>
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: { xs: '1.3rem', md: '1.5rem' },
            fontWeight: 700,
            color: color,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {value}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: 'var(--font-sans)',
          fontSize: { xs: '0.8rem', md: '0.9rem' },
          fontWeight: 700,
          color: 'var(--muted)',
          textAlign: 'center',
          lineHeight: 1.3,
          maxWidth: 100,
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

export default function Achievements({ data }: { data: DashboardData }) {
  const achievements = [
    {
      value: '100',
      label: 'First 100 Words',
      color: '#2d6a4f',
      unlocked: data.stats.wordsLearned >= 100,
    },
    {
      value: '30',
      label: '30 Day Streak',
      color: '#b8860b',
      unlocked: data.streak.longest >= 30,
    },
    {
      value: '500',
      label: '500 Sentences',
      color: '#6d4c9e',
      unlocked: data.stats.sentencesWritten >= 500,
    },
    {
      value: '1',
      label: 'First Conversation',
      color: '#1565c0',
      unlocked: data.stats.wordsMastered >= 50,
    },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2.5, md: 3 } }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.85rem', md: '0.95rem' },
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--muted)',
          }}
        >
          Achievements
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.8rem', md: '0.9rem' },
            fontWeight: 600,
            color: 'var(--gold)',
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          See all
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: { xs: 2, md: 3 },
          justifyItems: 'center',
        }}
      >
        {achievements.map((ach) => (
          <Box
            key={ach.label}
            sx={{
              opacity: ach.unlocked ? 1 : 0.35,
              transition: 'opacity 0.2s ease',
              filter: ach.unlocked ? 'none' : 'grayscale(0.6)',
            }}
          >
            <HexBadge value={ach.value} label={ach.label} color={ach.color} />
          </Box>
        ))}
      </Box>
    </Box>
  )
}
