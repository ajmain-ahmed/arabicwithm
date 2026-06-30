'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import ReplayIcon from '@mui/icons-material/Replay'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import CreateIcon from '@mui/icons-material/Create'
import SearchIcon from '@mui/icons-material/Search'

const ACTIONS = [
  {
    key: 'review',
    label: 'Review',
    description: 'Strengthen what you know',
    icon: <ReplayIcon sx={{ fontSize: { xs: 28, md: 32 } }} />,
    bg: '#0e2e1f',
    color: '#fff',
    href: '/flashcards',
  },
  {
    key: 'learn',
    label: 'Learn',
    description: 'Discover new vocabulary',
    icon: <MenuBookIcon sx={{ fontSize: { xs: 28, md: 32 } }} />,
    bg: '#e8f5ee',
    color: '#2d6a4f',
    href: '/flashcards',
  },
  {
    key: 'practice',
    label: 'Practice',
    description: 'Test your knowledge',
    icon: <CreateIcon sx={{ fontSize: { xs: 28, md: 32 } }} />,
    bg: '#f5f0e0',
    color: '#b8860b',
    href: '/flashcards',
  },
  {
    key: 'dictionary',
    label: 'Dictionary',
    description: 'Search any word',
    icon: <SearchIcon sx={{ fontSize: { xs: 28, md: 32 } }} />,
    bg: '#f0ebf5',
    color: '#6d4c9e',
    href: '/flashcards',
  },
]

export default function QuickActions() {
  const router = useRouter()

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
        Quick Actions
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: { xs: 2, md: 3 },
        }}
      >
        {ACTIONS.map((action) => (
          <Box
            key={action.key}
            onClick={() => router.push(action.href)}
            sx={{
              background: '#fff',
              borderRadius: '20px',
              p: { xs: 3, md: 3.5 },
              cursor: 'pointer',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: { xs: 1.5, md: 2 },
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 32px rgba(14,46,31,0.1)',
              },
            }}
          >
            {/* Subtle pattern */}
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 80,
                height: 80,
                opacity: 0.04,
                pointerEvents: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='${encodeURIComponent(action.color)}'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
              }}
            />

            <Box
              sx={{
                width: { xs: 52, md: 60 },
                height: { xs: 52, md: 60 },
                borderRadius: '16px',
                background: action.bg,
                color: action.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {action.icon}
            </Box>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  fontWeight: 700,
                  color: 'var(--bark)',
                }}
              >
                {action.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: { xs: '0.88rem', md: '0.95rem' },
                  fontWeight: 500,
                  color: 'var(--muted)',
                  lineHeight: 1.4,
                  mt: 0.25,
                }}
              >
                {action.description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
