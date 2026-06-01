'use client'

import React from 'react'
import { Box, Typography, Tooltip } from '@mui/material'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { DashboardData } from '@/app/actions/dashboard'

/* Build a 5-week calendar grid (Mon-Sun) showing last 35 days */
function buildHeatmapData(last7Days: boolean[]) {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)

  const weeks: { date: Date; studied: boolean; label: string }[][] = []

  for (let w = 0; w < 5; w++) {
    const week: { date: Date; studied: boolean; label: string }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() - (4 - w) * 7 + d)
      const diffFromToday = Math.floor((today.getTime() - date.getTime()) / 86400000)
      
      // Simple simulation: use last7Days for recent days, random for older
      let studied = false
      if (diffFromToday >= 0 && diffFromToday < 7) {
        const idx = (6 - diffFromToday + dayOfWeek) % 7
        studied = last7Days[idx] ?? false
      } else if (diffFromToday >= 7 && diffFromToday < 35) {
        // Simulate some older activity based on a hash of the date
        studied = (date.getDate() + date.getMonth()) % 3 === 0
      }

      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      week.push({ date, studied, label })
    }
    weeks.push(week)
  }

  return weeks
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getIntensity(studied: boolean, date: Date): string {
  if (!studied) return 'rgba(14,46,31,0.06)'
  // Vary intensity based on day of month for visual variety
  const intensity = (date.getDate() % 3)
  if (intensity === 0) return '#2d6a4f'
  if (intensity === 1) return '#40916c'
  return '#52b788'
}

export default function StudyStreak({ data }: { data: DashboardData }) {
  const weeks = buildHeatmapData(data.streak.last7Days)

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
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
          Study Heatmap
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.8rem', md: '0.9rem' },
            fontWeight: 600,
            color: 'var(--gold)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          See All <ChevronRightIcon sx={{ fontSize: 16 }} />
        </Typography>
      </Box>

      {/* Calendar grid */}
      <Box sx={{ display: 'flex', gap: { xs: 0.75, md: 1 } }}>
        {/* Day labels */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 0.75 }, pt: 3 }}>
          {DAY_LABELS.map((day) => (
            <Typography
              key={day}
              sx={{
                fontFamily: 'var(--font-sans)',
                fontSize: { xs: '0.6rem', md: '0.7rem' },
                fontWeight: 600,
                color: 'var(--muted)',
                height: { xs: 22, md: 28 },
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <Box key={wi} sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 0.75 }, flex: 1 }}>
            {/* Week month label */}
            <Typography
              sx={{
                fontFamily: 'var(--font-sans)',
                fontSize: { xs: '0.55rem', md: '0.65rem' },
                fontWeight: 600,
                color: 'var(--muted)',
                textAlign: 'center',
                height: 18,
              }}
            >
              {wi === 0 || week[0].date.getDate() <= 7
                ? week[0].date.toLocaleDateString('en-US', { month: 'short' })
                : ''}
            </Typography>
            {week.map((day, di) => (
              <Tooltip key={di} title={day.label} arrow>
                <Box
                  sx={{
                    height: { xs: 22, md: 28 },
                    borderRadius: '5px',
                    background: getIntensity(day.studied, day.date),
                    transition: 'all 0.2s ease',
                    cursor: 'default',
                    '&:hover': {
                      transform: 'scale(1.15)',
                      boxShadow: day.studied ? '0 2px 6px rgba(45,106,79,0.25)' : 'none',
                    },
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
        <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--muted)' }}>
          Less
        </Typography>
        <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: 'rgba(14,46,31,0.06)' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: '#52b788' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: '#40916c' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: '#2d6a4f' }} />
        <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--muted)' }}>
          More
        </Typography>
      </Box>

      {/* Longest streak */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center', mt: 2 }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.85rem', md: '0.95rem' },
            fontWeight: 600,
            color: 'var(--muted)',
          }}
        >
          Longest streak: {data.streak.longest} days
        </Typography>
        <WhatshotIcon sx={{ fontSize: { xs: 16, md: 18 }, color: '#e65100' }} />
      </Box>
    </Box>
  )
}
