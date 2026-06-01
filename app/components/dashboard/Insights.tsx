'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import StarIcon from '@mui/icons-material/Star'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import type { DashboardData } from '@/app/actions/dashboard'

export default function Insights({ data }: { data: DashboardData }) {
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
      {/* Subtle dot pattern */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='%230e2e1f'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.85rem', md: '0.95rem' },
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--muted)',
            mb: { xs: 2.5, md: 3 },
          }}
        >
          Insights For You
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 } }}>
          {data.insights.map((insight, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, md: 2 } }}>
              <Box
                sx={{
                  width: { xs: 36, md: 40 },
                  height: { xs: 36, md: 40 },
                  borderRadius: '50%',
                  background:
                    i === 0
                      ? 'rgba(184,134,11,0.1)'
                      : i === 1
                        ? 'rgba(45,106,79,0.1)'
                        : 'rgba(230,81,0,0.1)',
                  color:
                    i === 0 ? 'var(--gold)' : i === 1 ? '#2d6a4f' : '#e65100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                {i === 0 ? (
                  <LightbulbIcon sx={{ fontSize: { xs: 18, md: 20 } }} />
                ) : i === 1 ? (
                  <StarIcon sx={{ fontSize: { xs: 18, md: 20 } }} />
                ) : (
                  <WhatshotIcon sx={{ fontSize: { xs: 18, md: 20 } }} />
                )}
              </Box>
              <Typography
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: { xs: '0.95rem', md: '1.05rem', lg: '1.1rem' },
                  fontWeight: 500,
                  color: 'var(--bark)',
                  lineHeight: 1.5,
                }}
              >
                {insight}
              </Typography>
            </Box>
          ))}
        </Box>

        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.9rem', md: '1rem' },
            fontWeight: 700,
            color: 'var(--gold)',
            mt: { xs: 2.5, md: 3 },
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          View all insights →
        </Typography>
      </Box>
    </Box>
  )
}
