'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import CreateIcon from '@mui/icons-material/Create'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

const ACTIVITIES = [
  { icon: <CheckCircleIcon sx={{ fontSize: 18, color: '#2d6a4f' }} />, title: 'شَرَر', subtitle: 'Reviewed • Today', badge: 'Well done!', color: '#2d6a4f' },
  { icon: <MenuBookIcon sx={{ fontSize: 18, color: '#6d4c9e' }} />, title: 'مَطَار', subtitle: 'Learned • Today', badge: 'New word!', color: '#6d4c9e' },
  { icon: <CreateIcon sx={{ fontSize: 18, color: '#b8860b' }} />, title: 'Writing Practice', subtitle: 'Completed • Yesterday', badge: 'Great sentence!', color: '#b8860b' },
]

export default function RecentActivity() {
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
          Recent Activity
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
          View All <ChevronRightIcon sx={{ fontSize: 16 }} />
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {ACTIVITIES.map((activity, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              borderRadius: '12px',
              background: 'rgba(14,46,31,0.02)',
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: `${activity.color}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {activity.icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--bark)',
                }}
              >
                {activity.title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  color: 'var(--muted)',
                }}
              >
                {activity.subtitle}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: activity.color,
                flexShrink: 0,
              }}
            >
              {activity.badge}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
