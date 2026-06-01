'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import type { DashboardData } from '@/app/actions/dashboard'

export default function StatsCard({ data }: { data: DashboardData }) {
  return (
    <Box
      sx={{
        background: '#0e2e1f',
        borderRadius: '20px',
        p: { xs: 3, md: 3.5 },
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle pattern */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Top row: Streak + Level */}
        <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, mb: 2.5 }}>
          {/* Streak */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <WhatshotIcon sx={{ fontSize: 28, color: '#ff9800' }} />
              <Typography
                sx={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '2rem',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {data.streak.current}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8rem',
                fontWeight: 600,
                opacity: 0.7,
              }}
            >
              Day Streak
            </Typography>
          </Box>

          {/* Level */}
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8rem',
                fontWeight: 700,
                opacity: 0.7,
                mb: 0.25,
              }}
            >
              Level {data.level.level}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.3rem',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {data.level.xp.toLocaleString()} XP
            </Typography>
            <Box
              sx={{
                mt: 0.75,
                width: '100%',
                height: 5,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${data.level.xpProgressPct}%`,
                  height: '100%',
                  background: '#4caf50',
                  borderRadius: '999px',
                }}
              />
            </Box>
            <Typography
              sx={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.7rem',
                opacity: 0.5,
                mt: 0.5,
                color: '#4caf50',
              }}
            >
              {data.level.xpToNext - data.level.xp} XP until Level {data.level.level + 1}
            </Typography>
          </Box>
        </Box>

        {/* Motivational message */}
        <Box
          sx={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '12px',
            p: 1.5,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.88rem',
              fontWeight: 700,
              mb: 0.25,
            }}
          >
            Amazing! You're on fire!
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              fontWeight: 500,
              opacity: 0.6,
            }}
          >
            Keep going to protect your streak.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
