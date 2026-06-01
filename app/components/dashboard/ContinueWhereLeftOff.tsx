'use client'

import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { DashboardData } from '@/app/actions/dashboard'

export default function ContinueWhereLeftOff({ data }: { data: DashboardData }) {
  const router = useRouter()
  const cl = data.continueLearning

  if (!cl) return null

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
      {/* Subtle diagonal line pattern */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2' stroke='%230e2e1f' stroke-width='0.5'/%3E%3C/svg%3E")`,
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
          Continue Where You Left Off
        </Typography>

        <Box sx={{ display: 'flex', gap: { xs: 2.5, md: 3 }, alignItems: 'center' }}>
          {/* Image placeholder */}
          <Box
            sx={{
              width: { xs: 90, md: 110 },
              height: { xs: 90, md: 110 },
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #f5ede0 0%, #e8dfd0 100%)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: { xs: '2.2rem', md: '2.8rem' },
                color: 'var(--gold)',
                opacity: 0.5,
                fontWeight: 700,
              }}
            >
              {cl.level}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: { xs: '1.3rem', md: '1.5rem', lg: '1.7rem' },
                fontWeight: 700,
                color: 'var(--bark)',
              }}
            >
              {cl.level} {cl.theme}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-sans)',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                fontWeight: 500,
                color: 'var(--muted)',
                mt: 0.5,
              }}
            >
              Lesson 12 &bull; {cl.theme}
            </Typography>

            {/* Progress */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 }, mt: { xs: 2, md: 2.5 } }}>
              <Box
                sx={{
                  flex: 1,
                  height: { xs: 8, md: 10 },
                  background: 'rgba(14,46,31,0.06)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${cl.progressPct}%`,
                    height: '100%',
                    background: '#2d6a4f',
                    borderRadius: '999px',
                  }}
                />
              </Box>
              <Typography
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: { xs: '0.95rem', md: '1.05rem' },
                  fontWeight: 700,
                  color: 'var(--bark)',
                  minWidth: 42,
                }}
              >
                {cl.progressPct}%
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardIcon sx={{ fontSize: { xs: 18, md: 20 } }} />}
              onClick={() => router.push(`/flashcards/${cl.levelSlug}`)}
              sx={{
                mt: { xs: 2, md: 2.5 },
                borderColor: 'var(--gold)',
                color: 'var(--gold)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: { xs: '0.9rem', md: '1rem' },
                textTransform: 'none',
                borderRadius: '999px',
                px: { xs: 2.5, md: 3 },
                py: { xs: 0.6, md: 0.8 },
                '&:hover': {
                  borderColor: 'var(--gold-lt)',
                  background: 'rgba(184,134,11,0.04)',
                },
              }}
            >
              Resume
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
