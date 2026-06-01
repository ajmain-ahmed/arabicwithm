'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import StarIcon from '@mui/icons-material/Star'
import CreateIcon from '@mui/icons-material/Create'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import type { DashboardData } from '@/app/actions/dashboard'

export default function ProgressStats({ data }: { data: DashboardData }) {
  const stats = [
    {
      icon: <MenuBookIcon sx={{ fontSize: { xs: 26, md: 30 } }} />,
      value: data.stats.wordsLearned.toLocaleString(),
      label: 'Words Learned',
      change: '+18 this week',
      color: '#2d6a4f',
      bg: '#e8f5ee',
    },
    {
      icon: <StarIcon sx={{ fontSize: { xs: 26, md: 30 } }} />,
      value: data.stats.wordsMastered.toLocaleString(),
      label: 'Words Mastered',
      change: `${data.stats.wordsLearned > 0 ? Math.round((data.stats.wordsMastered / data.stats.wordsLearned) * 100) : 0}% of learned`,
      color: '#b8860b',
      bg: '#f5f0e0',
    },
    {
      icon: <CreateIcon sx={{ fontSize: { xs: 26, md: 30 } }} />,
      value: data.stats.sentencesWritten.toLocaleString(),
      label: 'Sentences Written',
      change: '+126 this week',
      color: '#6d4c9e',
      bg: '#f0ebf5',
    },
    {
      icon: <AccessTimeIcon sx={{ fontSize: { xs: 26, md: 30 } }} />,
      value: data.stats.hoursStudied.toLocaleString(),
      label: 'Hours Studied',
      change: '+7 this week',
      color: '#1565c0',
      bg: '#e3f2fd',
    },
    {
      icon: <WhatshotIcon sx={{ fontSize: { xs: 26, md: 30 } }} />,
      value: data.streak.current.toString(),
      label: 'Day Streak',
      change: `Best: ${data.streak.longest} days`,
      color: '#e65100',
      bg: '#fff3e0',
    },
  ]

  return (
    <Box>
      <Typography
        sx={{
          fontFamily: 'var(--font-sans)',
          fontSize: { xs: '0.85rem', md: '0.95rem' },
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--muted)',
          mb: { xs: 2, md: 2.5 },
        }}
      >
        Your Progress
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
          gap: { xs: 2, md: 3 },
        }}
      >
        {stats.map((stat) => (
          <Box
            key={stat.label}
            sx={{
              background: '#fff',
              borderRadius: '20px',
              p: { xs: 3, md: 3.5 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: { xs: 1.5, md: 2 },
              transition: 'box-shadow 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': { boxShadow: '0 8px 28px rgba(14,46,31,0.07)' },
            }}
          >
            {/* Subtle dot pattern */}
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 60,
                height: 60,
                opacity: 0.05,
                pointerEvents: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='${encodeURIComponent(stat.color)}'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
              }}
            />

            <Box
              sx={{
                width: { xs: 48, md: 52 },
                height: { xs: 48, md: 52 },
                borderRadius: '14px',
                background: stat.bg,
                color: stat.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {stat.icon}
            </Box>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography
                sx={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: { xs: '1.8rem', md: '2.2rem' },
                  fontWeight: 700,
                  color: 'var(--bark)',
                  lineHeight: 1.1,
                }}
              >
                {stat.value}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: { xs: '0.85rem', md: '0.95rem' },
                  fontWeight: 700,
                  color: 'var(--muted)',
                  mt: 0.5,
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: { xs: '0.78rem', md: '0.85rem' },
                  fontWeight: 500,
                  color: 'var(--muted)',
                  opacity: 0.7,
                  mt: 0.5,
                }}
              >
                {stat.change}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
