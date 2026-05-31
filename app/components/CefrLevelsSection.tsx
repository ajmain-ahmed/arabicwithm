'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined'
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined'
import { LevelMeta } from '../lib/study'

/* ─────────────────────────────────────────────
   Shared horizontal margins (cards + stats bar)
───────────────────────────────────────────── */
const SHARED_MX = { xs: 2, sm: 4, md: 6, lg: 8, xl: 12 }

/* ─────────────────────────────────────────────
   Level styling constants
───────────────────────────────────────────── */
const LEVEL_COLORS: Record<string, string> = {
  A0: '#2d6a4f',
  A1: '#40916c',
  A2: '#52b788',
  B1: '#b5861a',
  B2: '#9c6b00',
  C1: '#6d4c9e',
  C2: '#4a2f7a',
}

const LEVEL_BG_GRADIENT: Record<string, string> = {
  A0: 'linear-gradient(135deg, #f5faf7 0%, #e8f5ee 100%)',
  A1: 'linear-gradient(135deg, #f5faf8 0%, #e8f5ef 100%)',
  A2: 'linear-gradient(135deg, #f5faf8 0%, #e8f5ef 100%)',
  B1: 'linear-gradient(135deg, #fdfbf5 0%, #f5f0e0 100%)',
  B2: 'linear-gradient(135deg, #fdfbf5 0%, #f5f0e0 100%)',
  C1: 'linear-gradient(135deg, #f9f7fb 0%, #f0ebf5 100%)',
  C2: 'linear-gradient(135deg, #f9f7fb 0%, #f0ebf5 100%)',
}

const LEVEL_IMAGE: Record<string, string> = {
  A0: '/homepage/level-cards/a0-lantern.avif',
  A1: '/homepage/level-cards/a1-mosque.avif',
  A2: '/homepage/level-cards/a2-architecture.avif',
  B1: '/homepage/level-cards/b1-books.avif',
  B2: '/homepage/level-cards/b2-compass.avif',
  C1: '/homepage/level-cards/c1-inkwell.avif',
  C2: '/homepage/level-cards/c2-book.avif',
}

const LEVEL_DESCRIPTION: Record<string, string> = {
  A0: 'Start your journey with essential words.',
  A1: 'Build basic phrases and everyday expressions.',
  A2: 'Communicate in familiar situations with confidence.',
  B1: 'Understand and share ideas on familiar topics.',
  B2: 'Discuss abstract topics with clarity and detail.',
  C1: 'Express complex ideas fluently and effectively.',
  C2: 'Master the language with nuance and depth.',
}

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
const LEVEL_PATTERN: Record<string, string> = {
  A0: 'grid',
  A1: 'dots',
  A2: 'diagonal',
  B1: 'cross',
  B2: 'bamboo',
  C1: 'diamond',
  C2: 'zigzag',
}

function CardPattern({ color, levelCode }: { color: string; levelCode: string }) {
  const id = LEVEL_PATTERN[levelCode] ?? 'grid'
  const patternId = `${id}-${levelCode}`

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        opacity: 0.12,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`grid-${levelCode}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={color} strokeWidth="0.8" />
          </pattern>
          <pattern id={`dots-${levelCode}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill={color} />
          </pattern>
          <pattern id={`diagonal-${levelCode}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke={color} strokeWidth="0.6" />
          </pattern>
          <pattern id={`cross-${levelCode}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M12 0v24M0 12h24" stroke={color} strokeWidth="0.5" />
          </pattern>
          <pattern id={`bamboo-${levelCode}`} width="8" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 0 Q4 8 0 16 M8 0 Q4 8 8 16" stroke={color} strokeWidth="0.5" fill="none" />
          </pattern>
          <pattern id={`diamond-${levelCode}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M10 0 L20 10 L10 20 L0 10 Z" stroke={color} strokeWidth="0.5" fill="none" />
          </pattern>
          <pattern id={`zigzag-${levelCode}`} width="20" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6 L5 0 L10 6 L15 0 L20 6" stroke={color} strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </Box>
  )
}

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
   Single level card
───────────────────────────────────────────── */
function LevelCard({ level }: { level: LevelMeta }) {
  const router = useRouter()
  const color = LEVEL_COLORS[level.code] ?? '#2c1a0e'
  const bg = LEVEL_BG_GRADIENT[level.code] ?? '#fff'
  const image = LEVEL_IMAGE[level.code]
  const description = LEVEL_DESCRIPTION[level.code]

  return (
    <Box
      onClick={() => router.push(`/flashcards/${level.slug}`)}
      sx={{
        position: 'relative',
        background: bg,
        border: `1px solid ${color}18`,
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.28s ease, box-shadow 0.28s ease',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: `0 14px 36px ${color}18`,
        },
      }}
    >
      <CardPattern color={color} levelCode={level.code} />

      {/* Top area: text left, image right */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
          p: { xs: 1.5, lg: 2 },
          gap: 1,
        }}
      >
        {/* Text content */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              fontSize: { xs: '1.6rem', lg: '1.9rem' },
              fontWeight: 700,
              lineHeight: 1.1,
              color: color,
              mb: 0.5,
            }}
          >
            {level.code}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: { xs: '0.78rem', lg: '0.88rem' },
              fontWeight: 700,
              color: 'var(--bark)',
              lineHeight: 1.3,
              mb: 0.5,
            }}
          >
            {level.slug}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: { xs: '0.68rem', lg: '0.75rem' },
              color: 'var(--muted)',
              lineHeight: 1.45,
            }}
          >
            {description}
          </Typography>
        </Box>

        {/* Illustration */}
        {image && (
          <Box
            component="img"
            src={image}
            alt={level.label}
            sx={{
              width: { xs: 60, sm: 75, lg: 95, xl: 100 },
              height: { xs: 60, sm: 75, lg: 95, xl: 100 },
              objectFit: 'contain',
              objectPosition: 'center right',
              flexShrink: 0,
              alignSelf: 'center',
            }}
          />
        )}
      </Box>

      {/* Bottom stats bar */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, lg: 1.5 },
          px: { xs: 1.5, lg: 2 },
          py: 1,
          borderTop: `1px solid ${color}12`,
          background: 'rgba(255,255,255,0.35)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AutoStoriesOutlinedIcon sx={{ fontSize: { xs: 13, lg: 15 }, color, opacity: 0.5 }} />
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: { xs: '0.7rem', lg: '0.78rem' },
              fontWeight: 600,
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {level.wordCount.toLocaleString()} words
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <GridViewOutlinedIcon sx={{ fontSize: { xs: 13, lg: 15 }, color, opacity: 0.5 }} />
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: { xs: '0.7rem', lg: '0.78rem' },
              fontWeight: 600,
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {level.themeCount} themes
          </Typography>
        </Box>
      </Box>
    </Box>
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
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(7, 1fr)',
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
                <LevelCard level={level} />
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
