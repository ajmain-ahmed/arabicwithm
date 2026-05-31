'use client'

import React from 'react'
import { Box, Typography, Button, Container } from '@mui/material'
import { useRouter } from 'next/navigation'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import SmartDisplayOutlinedIcon from '@mui/icons-material/SmartDisplayOutlined'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined'
import FormatQuoteOutlinedIcon from '@mui/icons-material/FormatQuoteOutlined'
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined'
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined'
import ArrowForwardSharp from '@mui/icons-material/ArrowForwardSharp'

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
   Column colors (4 unique colors, 2 cards each)
───────────────────────────────────────────── */
const COL_COLORS = [
  { color: '#2d6a4f', bg: '#f5faf7', iconBg: '#e8f5ee' },
  { color: '#b8860b', bg: '#fdfbf5', iconBg: '#f5f0e0' },
  { color: '#6d4c9e', bg: '#f9f7fb', iconBg: '#f0ebf5' },
  { color: '#8b4513', bg: '#fdf8f3', iconBg: '#f5ebe0' },
]

/* ─────────────────────────────────────────────
   8 path cards
───────────────────────────────────────────── */
const PATHS = [
  {
    key: 'vocabulary',
    title: 'Vocabulary',
    description: 'Learn essential words and phrases with themed flashcards.',
    href: '/flashcards',
    icon: <MenuBookOutlinedIcon sx={{ fontSize: 28 }} />,
    btnLabel: 'Explore Vocabulary',
    svg: 'books',
  },
  {
    key: 'cartoons',
    title: 'Cartoons',
    description: 'Immersive Arabic cartoons with subtitles and vocabulary.',
    href: '/cartoons',
    icon: <SmartDisplayOutlinedIcon sx={{ fontSize: 28 }} />,
    btnLabel: 'Watch Cartoons',
    svg: 'screen',
  },
  {
    key: 'stories',
    title: 'Stories',
    description: 'Engaging tales and real-world topics to build context.',
    href: '/literature',
    icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 28 }} />,
    btnLabel: 'Read Stories',
    svg: 'scroll',
  },
  {
    key: 'news',
    title: 'News',
    description: 'Real-world articles graded by CEFR level.',
    href: '/news',
    icon: <NewspaperOutlinedIcon sx={{ fontSize: 28 }} />,
    btnLabel: 'Read News',
    svg: 'lines',
  },
  {
    key: 'poetry',
    title: 'Poetry',
    description: 'Classical Arabic poetry and curated literature.',
    href: '/literature',
    icon: <FormatQuoteOutlinedIcon sx={{ fontSize: 28 }} />,
    btnLabel: 'Explore Poetry',
    svg: 'books',
  },
  {
    key: 'games',
    title: 'Games',
    description: 'Interactive quizzes and sentence builders.',
    href: '/flashcards',
    icon: <ExtensionOutlinedIcon sx={{ fontSize: 28 }} />,
    btnLabel: 'Play Games',
    svg: 'puzzle',
  },
  {
    key: 'ai',
    title: 'AI',
    description: 'Smart spaced-repetition and personalised drills.',
    href: '/revision',
    icon: <PsychologyOutlinedIcon sx={{ fontSize: 28 }} />,
    btnLabel: 'Start Practicing',
    svg: 'brain',
  },
  {
    key: 'podcasts',
    title: 'Podcasts',
    description: 'Audio content for listening practice.',
    href: '/cartoons',
    icon: <HeadphonesOutlinedIcon sx={{ fontSize: 28 }} />,
    btnLabel: 'Listen Now',
    svg: 'waves',
  },
]

/* ─────────────────────────────────────────────
   Full-card SVG backgrounds
───────────────────────────────────────────── */
function CardBgSvg({ type, color }: { type: string; color: string }) {
  const patterns: Record<string, React.ReactNode> = {
    books: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="28" height="60" rx="2" stroke={color} strokeWidth="1.2" opacity="0.3" />
        <rect x="52" y="20" width="28" height="60" rx="2" stroke={color} strokeWidth="1.2" opacity="0.3" />
        <path d="M28 32 L40 32 M28 42 L40 42 M28 52 L38 52" stroke={color} strokeWidth="0.8" opacity="0.2" />
        <path d="M60 32 L72 32 M60 42 L72 42 M60 52 L70 52" stroke={color} strokeWidth="0.8" opacity="0.2" />
        <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.12" />
      </svg>
    ),
    screen: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="28" width="64" height="44" rx="4" stroke={color} strokeWidth="1.2" opacity="0.3" />
        <polygon points="42,42 42,58 58,50" fill={color} opacity="0.12" />
        <path d="M18 38 L82 38" stroke={color} strokeWidth="0.8" opacity="0.2" />
        <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.12" />
      </svg>
    ),
    scroll: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="25" width="70" height="50" rx="3" stroke={color} strokeWidth="1.2" opacity="0.3" />
        <path d="M25 40 L55 40 M25 50 L60 50 M25 60 L50 60" stroke={color} strokeWidth="0.8" opacity="0.2" />
        <circle cx="72" cy="42" r="6" stroke={color} strokeWidth="1" opacity="0.25" />
        <path d="M68 55 L76 55" stroke={color} strokeWidth="0.8" opacity="0.15" />
        <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.12" />
      </svg>
    ),
    lines: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 30 L80 30 M20 42 L80 42 M20 54 L80 54 M20 66 L60 66" stroke={color} strokeWidth="0.8" opacity="0.25" />
        <rect x="15" y="20" width="70" height="60" rx="3" stroke={color} strokeWidth="1.2" opacity="0.2" />
        <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.12" />
      </svg>
    ),
    puzzle: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 30 L45 30 L45 22 L55 22 L55 30 L70 30 L70 45 L78 45 L78 55 L70 55 L70 70 L55 70 L55 78 L45 78 L45 70 L30 70 L30 55 L22 55 L22 45 L30 45 Z" stroke={color} strokeWidth="1.2" opacity="0.3" />
        <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.12" />
      </svg>
    ),
    brain: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="28" stroke={color} strokeWidth="1.2" opacity="0.25" />
        <path d="M50 22 L50 30 M50 70 L50 78 M22 50 L30 50 M70 50 L78 50 M32 32 L38 38 M62 62 L68 68 M32 68 L38 62 M62 38 L68 32" stroke={color} strokeWidth="0.8" opacity="0.2" />
        <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.12" />
      </svg>
    ),
    waves: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 35 Q25 20 40 35 T70 35 T100 35" stroke={color} strokeWidth="1.2" opacity="0.25" />
        <path d="M10 50 Q25 35 40 50 T70 50 T100 50" stroke={color} strokeWidth="1.2" opacity="0.25" />
        <path d="M10 65 Q25 50 40 65 T70 65 T100 65" stroke={color} strokeWidth="1.2" opacity="0.25" />
        <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.12" />
      </svg>
    ),
  }

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        opacity: 0.14,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {patterns[type] ?? patterns.books}
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Single path card
───────────────────────────────────────────── */
function PathCard({ path, colIndex }: { path: typeof PATHS[0]; colIndex: number }) {
  const router = useRouter()
  const theme = COL_COLORS[colIndex % 4]

  return (
    <Box
      sx={{
        position: 'relative',
        background: theme.bg,
        border: `1px solid ${theme.color}15`,
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: { xs: 2, md: 2.5 },
        p: { xs: 2.5, md: 3 },
        height: '100%',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 10px 28px ${theme.color}14`,
        },
      }}
    >
      <CardBgSvg type={path.svg} color={theme.color} />

      {/* Icon circle */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          width: { xs: 56, md: 64 },
          height: { xs: 56, md: 64 },
          borderRadius: '50%',
          background: theme.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 14px ${theme.color}12`,
          color: theme.color,
        }}
      >
        {path.icon}
      </Box>

      {/* Text + button */}
      <Box sx={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '1.05rem', md: '1.15rem' },
            fontWeight: 800,
            color: 'var(--bark)',
            mb: 0.5,
          }}
        >
          {path.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.88rem', md: '0.95rem' },
            fontWeight: 500,
            color: 'var(--muted)',
            lineHeight: 1.5,
            mb: 1.5,
          }}
        >
          {path.description}
        </Typography>
        <Button
          variant="contained"
          size="small"
          endIcon={<ArrowForwardSharp sx={{ fontSize: 14 }} />}
          onClick={() => router.push(path.href)}
          sx={{
            background: theme.color,
            color: '#fff',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: { xs: '0.72rem', md: '0.78rem' },
            textTransform: 'none',
            borderRadius: '9999px',
            px: { xs: 2, md: 2.5 },
            py: { xs: 0.5, md: 0.6 },
            boxShadow: `0 4px 12px ${theme.color}30`,
            transition: 'all 0.2s ease',
            '&:hover': {
              background: theme.color,
              filter: 'brightness(1.1)',
              boxShadow: `0 6px 18px ${theme.color}40`,
              transform: 'translateY(-1px)',
            },
          }}
        >
          {path.btnLabel}
        </Button>
      </Box>
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Main section
───────────────────────────────────────────── */
export default function ChooseYourPath() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: '#fff',
        pt: { xs: 4, md: 5, lg: 6 },
        pb: 0,
      }}
    >
      <SectionBg />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
          {/* Heading */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: { xs: 1.5, md: 2 } }}>
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
              Choose Your Path
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
              maxWidth: 560,
              mx: 'auto',
              mb: { xs: 4, md: 5, lg: 6 },
              lineHeight: 1.6,
            }}
          >
            There's more than one way to learn
          </Typography>

          {/* Cards grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: { xs: 1.5, md: 2, lg: 2.5 },
            }}
          >
            {PATHS.map((path, index) => (
              <PathCard key={path.key} path={path} colIndex={index % 4} />
            ))}
          </Box>
        </Container>

        {/* Gold divider line */}
        <Box
          sx={{
            mt: { xs: 5, md: 6, lg: 7 },
            width: '100%',
            height: '1px',
            background: 'linear-gradient(to right, transparent 0%, #b8860b 20%, #d4a843 50%, #b8860b 80%, transparent 100%)',
          }}
        />
      </Box>
    </Box>
  )
}
