'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import type { DashboardData } from '@/app/actions/dashboard'

export default function TodaysGoals({ data }: { data: DashboardData }) {
  const goals = [
    {
      icon: <CheckCircleOutlinedIcon sx={{ fontSize: { xs: 22, md: 26 } }} />,
      label: 'Reviews',
      current: data.goals.reviews.current,
      target: data.goals.reviews.target,
      color: '#2d6a4f',
    },
    {
      icon: <MenuBookIcon sx={{ fontSize: { xs: 22, md: 26 } }} />,
      label: 'New Words',
      current: data.goals.newWords.current,
      target: data.goals.newWords.target,
      color: '#b8860b',
    },
    {
      icon: <AccessTimeIcon sx={{ fontSize: { xs: 22, md: 26 } }} />,
      label: 'Study Time',
      current: data.goals.studyTime.current,
      target: data.goals.studyTime.target,
      unit: 'min',
      color: '#1565c0',
    },
  ]

  return (
    <Box
      sx={{
        background: '#fff',
        borderRadius: '20px',
        p: { xs: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle cross pattern */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 0v24M0 12h24' stroke='%230e2e1f' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
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
            Today's Goals
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
            Edit
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, md: 3.5 } }}>
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))
            return (
              <Box key={goal.label}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 }, mb: { xs: 1, md: 1.5 } }}>
                  <Box
                    sx={{
                      width: { xs: 44, md: 50 },
                      height: { xs: 44, md: 50 },
                      borderRadius: '50%',
                      background: `${goal.color}12`,
                      color: goal.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {goal.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                      <Typography
                        sx={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: { xs: '1.1rem', md: '1.3rem' },
                          fontWeight: 700,
                          color: 'var(--bark)',
                        }}
                      >
                        {goal.current}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: { xs: '0.95rem', md: '1.05rem' },
                          color: 'var(--muted)',
                        }}
                      >
                        / {goal.target} {goal.unit}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: { xs: '0.85rem', md: '0.95rem' },
                        fontWeight: 600,
                        color: 'var(--muted)',
                      }}
                    >
                      {goal.label}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    height: { xs: 8, md: 10 },
                    background: 'rgba(14,46,31,0.06)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${pct}%`,
                      height: '100%',
                      background: goal.color,
                      borderRadius: '999px',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
