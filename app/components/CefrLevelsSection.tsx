'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined'
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined'
import { LevelMeta } from '../lib/study'
import LevelCard from './LevelCard'

/* ─────────────────────────────────────────────
   Shared horizontal margins (cards + stats bar)
───────────────────────────────────────────── */
const SHARED_MX = { xs: 2, sm: 4, md: 6, lg: 8, xl: 12 }

/* ─────────────────────────────────────────────
   Shared section background — diagonal stripes
───────────────────────────────────────────── */
function SectionBg() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        opacity: 0.08,
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23b8860b' stroke-width='1.2'%3E%3Cpath d='M-1 1l2-2M0 8L8 0M7 9l2-2'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    />
  )
}

/* ─────────────────────────────────────────────
   Simple geometric pattern backgrounds
   (inspired by heropatterns.com)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Decorative flourish SVG
───────────────────────────────────────────── */
function Flourish() {
  return (
    <Box
      component="svg"
      width="24"
      height="12"
      viewBox="0 0 24 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      sx={{ flexShrink: 0, opacity: 0.45 }}
    >
      <path d="M1 6C4 2 8 2 12 6C16 10 20 10 23 6" stroke="#b8860b" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="6" r="1.5" fill="#b8860b" />
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Single level card wrapper (homepage navigation)
───────────────────────────────────────────── */
function HomeLevelCard({ level }: { level: LevelMeta }) {
  const router = useRouter()
  return (
    <LevelCard
      code={level.code}
      title={level.slug}
      wordCount={level.wordCount}
      themeCount={level.themeCount}
      onClick={() => router.push(`/flashcards/${level.slug}`)}
    />
  )
}

/* ─────────────────────────────────────────────
   Stats bar
───────────────────────────────────────────── */
function StatsBar() {
  const stats = [
    { icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 28, color: '#b8860b' }} />, value: '6,638+', label: 'Total Words' },
    { icon: <GridViewOutlinedIcon sx={{ fontSize: 28, color: '#b8860b' }} />, value: '70+', label: 'Themes' },
    { icon: <CreateOutlinedIcon sx={{ fontSize: 28, color: '#b8860b' }} />, value: '150+', label: 'Stories' },
    { icon: <HeadphonesOutlinedIcon sx={{ fontSize: 28, color: '#b8860b' }} />, value: '160+', label: 'Episodes' },
  ]

  return (
    <Box
      sx={{
        background: '#0e2e1f',
        borderRadius: '12px',
        py: { xs: 2.5, md: 3 },
        px: { xs: 2, md: 4 },
        mx: SHARED_MX,
        mt: { xs: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Repeating tiled pattern */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(/homepage/svgs/stats-pattern-left.svg)`,
          backgroundSize: '80px 80px',
          backgroundRepeat: 'repeat',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: { xs: 2, md: 2 },
          textAlign: 'center',
        }}
      >
        {stats.map((stat, index) => (
          <Box
            key={stat.label}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
              position: 'relative',
              ...(index < stats.length - 1 && {
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  right: 0,
                  top: '10%',
                  height: '80%',
                  width: '1px',
                  background: 'rgba(184,134,11,0.25)',
                  display: { xs: 'none', md: 'block' },
                },
              }),
            }}
          >
            {stat.icon}
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: { xs: '1.5rem', md: '1.9rem', lg: '2.2rem' },
                fontWeight: 800,
                color: '#f5ede0',
                lineHeight: 1.1,
              }}
            >
              {stat.value}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-sans)',
                fontSize: { xs: '0.8rem', md: '0.95rem' },
                fontWeight: 700,
                color: 'rgba(245,237,224,0.75)',
                letterSpacing: '0.03em',
              }}
            >
              {stat.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Main section
───────────────────────────────────────────── */
export default function CefrLevelsSection({ levels }: { levels: LevelMeta[] }) {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: '#fff',
        pt: { xs: 5, md: 6, lg: 7 },
        pb: { xs: 4, md: 5, lg: 6 },
      }}
    >
      <SectionBg />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Heading */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            mb: { xs: 1.5, md: 2 },
            px: 2,
          }}
        >
          <Flourish />
          <Typography
            component="h2"
            sx={{
              fontFamily: 'var(--font-serif)',
              fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.2rem', lg: '2.6rem' },
              fontWeight: 700,
              color: 'var(--bark)',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            Fast Track Arabic Course
          </Typography>
          <Box sx={{ transform: 'scaleX(-1)' }}>
            <Flourish />
          </Box>
        </Box>

        {/* Subtitle */}
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.9rem', md: '1.05rem' },
            color: 'var(--muted)',
            textAlign: 'center',
            maxWidth: 580,
            mx: 'auto',
            mb: { xs: 3, md: 4, lg: 5 },
            px: 2,
            lineHeight: 1.6,
          }}
        >
          Master the words people actually use, organised by theme and CEFR level, from your first sentence to fluent conversation.
        </Typography>

        {/* Cards grid — same width as stats bar */}
        <Box sx={{ mx: SHARED_MX }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
                lg: 'repeat(7, minmax(0, 1fr))',
              },
              gap: { xs: 1.5, sm: 2, md: 2.5, lg: 2.5, xl: 3 },
            }}
          >
            {levels.map((level) => (
              <Box
                key={level.code}
                sx={{
                  ...(level.code === 'C2' && { gridColumn: { xs: 'span 2', sm: 'auto' } }),
                }}
              >
                <HomeLevelCard level={level} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Stats bar */}
        <StatsBar />
      </Box>
    </Box>
  )
}
