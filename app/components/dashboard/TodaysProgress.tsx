'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import type { DashboardData } from '@/app/actions/dashboard'

function CircularProgress({ value, size = 120 }: { value: number; size?: number }) {
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(14,46,31,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2d6a4f"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.6rem',
            fontWeight: 700,
            color: 'var(--bark)',
            lineHeight: 1,
          }}
        >
          {value}%
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--muted)',
          }}
        >
          Great job!
        </Typography>
      </Box>
    </Box>
  )
}

export default function TodaysProgress({ data }: { data: DashboardData }) {
  const pct = Math.round(
    ((data.goals.reviews.current + data.goals.newWords.current + data.goals.studyTime.current) /
      (data.goals.reviews.target + data.goals.newWords.target + data.goals.studyTime.target)) *
      100
  )

  const items = [
    { icon: <CheckCircleOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Reviews', value: `${data.goals.reviews.current} / ${data.goals.reviews.target}` },
    { icon: <MenuBookIcon sx={{ fontSize: 18 }} />, label: 'New Words', value: `${data.goals.newWords.current} / ${data.goals.newWords.target}` },
    { icon: <AccessTimeIcon sx={{ fontSize: 18 }} />, label: 'Time Studied', value: `${data.goals.studyTime.current} min` },
  ]

  return (
    <Box
      sx={{
        background: '#fff',
        borderRadius: '20px',
        p: { xs: 3, md: 3.5 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, md: 2.5 } }}>
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
          Today's Progress
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
          Edit Goal
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 } }}>
        <CircularProgress value={pct} size={110} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
          {items.map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ color: 'var(--muted)', opacity: 0.7, display: 'flex' }}>{item.icon}</Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--bark)',
                  }}
                >
                  {item.value}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--muted)',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
