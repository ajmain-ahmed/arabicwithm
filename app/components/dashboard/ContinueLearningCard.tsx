'use client'

import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { DashboardData } from '@/app/actions/dashboard'

export default function ContinueLearningCard({ data }: { data: DashboardData }) {
  const router = useRouter()
  const cl = data.continueLearning

  if (!cl) {
    return (
      <Box
        sx={{
          background: 'var(--forest)',
          borderRadius: '24px',
          p: { xs: 4, md: 5 },
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: { xs: '1.8rem', md: '2.4rem' }, fontWeight: 700 }}>
          Start Learning
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: { xs: '1rem', md: '1.15rem' }, opacity: 0.8, mt: 1 }}>
          Pick a level and begin your Arabic journey today.
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push('/flashcards')}
          sx={{
            mt: 3,
            background: 'var(--gold)',
            color: '#fff',
            fontWeight: 700,
            fontSize: { xs: '0.95rem', md: '1.05rem' },
            borderRadius: '999px',
            textTransform: 'none',
            px: 4,
            py: 1.2,
            '&:hover': { background: 'var(--gold-lt)' },
          }}
        >
          Explore Levels
        </Button>
      </Box>
    )
  }

  const timeAgo = cl.lastStudiedAt
    ? formatTimeAgo(cl.lastStudiedAt)
    : 'Not studied yet'

  return (
    <Box
      sx={{
        background: 'var(--forest)',
        borderRadius: '24px',
        p: { xs: 4, md: 5 },
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        gap: { xs: 4, md: 5 },
      }}
    >
      {/* Decorative SVG pattern */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Left content */}
      <Box sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.8rem', md: '0.9rem' },
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#52b788',
            mb: { xs: 1, md: 1.5 },
          }}
        >
          Continue Learning
        </Typography>

        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: { xs: '1.8rem', md: '2.4rem', lg: '2.8rem' },
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {cl.level} {cl.theme}
        </Typography>

        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '1rem', md: '1.15rem', lg: '1.25rem' },
            fontWeight: 500,
            opacity: 0.75,
            mt: { xs: 1, md: 1.5 },
          }}
        >
          Word {cl.wordPosition} of {cl.totalWords}
        </Typography>

        {/* Progress bar */}
        <Box
          sx={{
            mt: { xs: 2.5, md: 3 },
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2, md: 3 },
          }}
        >
          <Box
            sx={{
              flex: 1,
              height: { xs: 10, md: 12 },
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${cl.progressPct}%`,
                height: '100%',
                background: '#52b788',
                borderRadius: '999px',
                transition: 'width 0.6s ease',
              }}
            />
          </Box>
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: { xs: '1rem', md: '1.15rem' },
              fontWeight: 700,
              minWidth: 50,
              textAlign: 'right',
            }}
          >
            {cl.progressPct}%
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: { xs: 2.5, md: 3 }, opacity: 0.6 }}>
          <AccessTimeIcon sx={{ fontSize: { xs: 18, md: 20 } }} />
          <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: { xs: '0.9rem', md: '1rem' } }}>
            Last studied {timeAgo}
          </Typography>
        </Box>
      </Box>

      {/* Right: word preview + button */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: { xs: 'flex-start', md: 'flex-end' },
          gap: { xs: 3, md: 4 },
          minWidth: { md: 220 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              fontSize: { xs: '2.5rem', md: '3.2rem' },
              fontWeight: 700,
              direction: 'rtl',
            }}
          >
            {cl.lastWordAr}
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: { xs: '1rem', md: '1.15rem' }, opacity: 0.7, mt: 0.5 }}>
            {cl.lastWordTr}
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: { xs: '0.9rem', md: '1rem' }, opacity: 0.5, mt: 0.25 }}>
            {cl.lastWordEn}
          </Typography>
        </Box>

        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon sx={{ fontSize: { xs: 20, md: 24 } }} />}
          onClick={() => router.push(`/flashcards/${cl.levelSlug}`)}
          sx={{
            background: 'var(--gold)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: { xs: '1rem', md: '1.15rem' },
            textTransform: 'none',
            borderRadius: '16px',
            px: { xs: 3, md: 4 },
            py: { xs: 1.2, md: 1.5 },
            '&:hover': { background: 'var(--gold-lt)' },
          }}
        >
          Continue
        </Button>
      </Box>
    </Box>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
