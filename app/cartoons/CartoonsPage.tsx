'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Container,
  Drawer,
  IconButton,
  Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { useRouter } from 'next/navigation'
import { ShowMeta } from '../lib/cartoons'

/* ── MUI Icons ── */
import {
  PlayArrow,
  ChevronRight,
  Subtitles,
  MenuBook,
  School,
  Tv,
  TouchApp,
  AutoStories,
  Lock,
  StarBorder,
  NotificationsNone,
  Tune,
  Close,
} from '@mui/icons-material'

/* ── Palette ── */
const BARK = '#2c1a0e'
const GOLD = '#b8860b'
const GOLD_LT = '#d4a843'
const CREAM = '#f5ede0'
const WARM_WHITE = '#fffaf0'
const MUTED = '#7a6e65'
const LABEL = '#9e8a7a'

/* ── How It Works background ── */
const HOW_IT_WORKS_BG = "url('/pattern.svg')"

const DIFFICULTY_COLORS: Record<string, string> = {
  'A1-A2': '#6b8f5e',
  'A2-B1': '#5a7d8c',
  'B1-B2': '#c4904a',
  'B2-C1': '#8a6a8a',
}

const CATEGORIES = ['All Shows', 'Everyday Arabic', 'Historical', 'Islamic Heritage', 'Action']
const LEVELS = ['A1-A2', 'A2-B1', 'B1-B2', 'B2-C1']

const COMING_SOON = [
  { title: 'Arabic Peppa Pig', category: 'Everyday Arabic', level: 'A1-A2', date: 'Coming November 2025' },
  { title: 'Avatar: The Last Airbender', category: 'Action', level: 'A2-B1', date: 'Coming December 2025' },
  { title: 'Stories of the Prophets', category: 'Islamic Heritage', level: 'B1-B2', date: 'Coming January 2026' },
  { title: 'Adventure Time', category: 'Everyday Arabic', level: 'A1-A2', date: 'Coming February 2026' },
]

/* ═══════════════════════════════════════════════
   Filter Sidebar (shared desktop + drawer)
   ═══════════════════════════════════════════════ */
interface FilterSidebarProps {
  activeCategory: string
  setActiveCategory: (c: string) => void
  activeLevel: string
  setActiveLevel: (l: string) => void
  onMobileClose?: () => void
  hideTitle?: boolean
}

function FilterSidebar({
  activeCategory,
  setActiveCategory,
  activeLevel,
  setActiveLevel,
  onMobileClose,
  hideTitle,
}: FilterSidebarProps) {
  return (
    <Box>
      {!hideTitle && (
        <>
          <Typography
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: 20,
              color: BARK,
              mb: 1.5,
            }}
          >
            Filters
          </Typography>
          <Divider sx={{ borderColor: 'rgba(184,134,11,0.2)', mb: 2.5 }} />
        </>
      )}

      {/* ── Category ── */}
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: GOLD,
          mb: 1.5,
        }}
      >
        Category
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 3 }}>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            onClick={() => {
              setActiveCategory(cat)
              onMobileClose?.()
            }}
            sx={{
              justifyContent: 'flex-start',
              height: 40,
              px: 1.5,
              borderRadius: '6px',
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              textTransform: 'none',
              color: activeCategory === cat ? BARK : MUTED,
              backgroundColor:
                activeCategory === cat ? 'rgba(184,134,11,0.06)' : WARM_WHITE,
              border: `1px solid ${activeCategory === cat ? GOLD : 'rgba(44,26,14,0.1)'}`,
              borderLeft:
                activeCategory === cat
                  ? `3px solid ${GOLD}`
                  : `1px solid rgba(44,26,14,0.1)`,
              '&:hover': { backgroundColor: 'rgba(184,134,11,0.04)' },
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </Button>
        ))}
      </Box>

      {/* ── Level ── */}
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: GOLD,
          mb: 1.5,
        }}
      >
        Level
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 3 }}>
        {LEVELS.map((lvl) => (
          <Button
            key={lvl}
            onClick={() => {
              setActiveLevel(activeLevel === lvl ? '' : lvl)
              onMobileClose?.()
            }}
            sx={{
              height: 36,
              borderRadius: '6px',
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'none',
              color: activeLevel === lvl ? '#fff' : MUTED,
              backgroundColor: activeLevel === lvl ? GOLD : WARM_WHITE,
              border: `1px solid ${activeLevel === lvl ? GOLD : 'rgba(44,26,14,0.1)'}`,
              '&:hover': {
                backgroundColor: activeLevel === lvl ? GOLD : 'rgba(184,134,11,0.04)',
              },
              transition: 'all 0.15s',
            }}
          >
            {lvl}
          </Button>
        ))}
      </Box>

      {/* ── Reset ── */}
      <Button
        fullWidth
        onClick={() => {
          setActiveCategory('All Shows')
          setActiveLevel('')
          onMobileClose?.()
        }}
        sx={{
          height: 40,
          borderRadius: '6px',
          fontFamily: '"Jost", system-ui, sans-serif',
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'none',
          color: BARK,
          border: '1px solid rgba(44,26,14,0.15)',
          backgroundColor: 'transparent',
          '&:hover': { backgroundColor: 'rgba(44,26,14,0.04)' },
        }}
      >
        Reset Filters
      </Button>
    </Box>
  )
}

/* ═══════════════════════════════════════════════
   Show Card
   ═══════════════════════════════════════════════ */
function ShowCard({ show }: { show: ShowMeta }) {
  const [hovered, setHovered] = useState(false)
  const router = useRouter()
  const badgeColor = DIFFICULTY_COLORS[show.level ?? ''] || MUTED

  return (
    <Paper
      elevation={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/cartoons/${show.slug}`)}
      sx={{
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: WARM_WHITE,
        border: '1px solid rgba(44,26,14,0.04)',
        boxShadow: hovered
          ? '0 8px 24px rgba(44,26,14,0.1)'
          : '0 1px 4px rgba(44,26,14,0.06)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      {/* Thumbnail */}
      <Box sx={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
        <Box
          component="img"
          src={show.cover}
          alt={show.title}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: hovered ? 'scale(1.03)' : 'scale(1)',
            transition: 'transform 0.3s',
          }}
        />
        {/* Bottom gradient */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(transparent 60%, rgba(44,26,14,0.5))',
            pointerEvents: 'none',
          }}
        />
        {/* Play button */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hovered ? 'rgba(44,26,14,0.2)' : 'rgba(44,26,14,0.1)',
            transition: 'background-color 0.2s',
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayArrow sx={{ fontSize: 20, color: BARK, ml: 0.3 }} />
          </Box>
        </Box>
        {/* Difficulty badge */}
        {show.level && (
          <Chip
            label={show.level}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: badgeColor,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              height: 24,
              borderRadius: '6px',
              '& .MuiChip-label': { px: 1.2, py: 0 },
            }}
          />
        )}
      </Box>

      {/* Card Body */}
      <Box sx={{ p: 2 }}>
        <Typography
          sx={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: { xs: 18, md: 20 },
            fontWeight: 500,
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            color: BARK,
            mb: 0.5,
          }}
          noWrap
        >
          {show.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: { xs: 15, md: 18 },
            color: GOLD,
            mb: 1.5,
          }}
          noWrap
        >
          {show.titleAr}
        </Typography>
        {/* Tags */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {show.category && (
            <Chip
              label={show.category}
              size="small"
              sx={{
                height: 24,
                borderRadius: '9999px',
                backgroundColor: 'rgba(184,134,11,0.08)',
                color: GOLD,
                fontSize: 11,
                fontWeight: 500,
                border: '1px solid rgba(184,134,11,0.12)',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
          {show.genre && (
            <Chip
              label={show.genre}
              size="small"
              sx={{
                height: 24,
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                color: MUTED,
                fontSize: 11,
                fontWeight: 500,
                border: '1px solid rgba(44,26,14,0.12)',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
        </Box>
        {/* Description */}
        <Typography
          sx={{
            fontSize: { xs: 14, md: 15 },
            lineHeight: 1.45,
            color: MUTED,
            mb: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {show.description}
        </Typography>
        {/* Meta row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            pt: 1.5,
            borderTop: '1px solid rgba(44,26,14,0.06)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MenuBook sx={{ fontSize: 14, color: LABEL }} />
            <Typography sx={{ fontSize: { xs: 13, md: 14 }, color: LABEL }}>
              {show.vocabCount ?? 0} words
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <School sx={{ fontSize: 14, color: LABEL }} />
            <Typography sx={{ fontSize: { xs: 13, md: 14 }, color: LABEL }}>
              {show.episodeCount} {show.episodeCount === 1 ? 'episode' : 'episodes'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  )
}

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */
export default function CartoonsPage({
  shows,
  episodesMap,
}: {
  shows: ShowMeta[]
  episodesMap: Record<string, string[]>
}) {
  const [activeCategory, setActiveCategory] = useState('All Shows')
  const [activeLevel, setActiveLevel] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const router = useRouter()

  const filteredShows = shows.filter((s) => {
    const catMatch = activeCategory === 'All Shows' || s.category === activeCategory
    const levelMatch = !activeLevel || s.level === activeLevel
    return catMatch && levelMatch
  })

  const scrollToShows = () => {
    const el = document.getElementById('shows-section')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const goToRandomEpisode = () => {
    const showSlugs = Object.keys(episodesMap).filter(
      (slug) => episodesMap[slug].length > 0
    )
    if (showSlugs.length === 0) return
    const randomShow = showSlugs[Math.floor(Math.random() * showSlugs.length)]
    const eps = episodesMap[randomShow]
    const randomEp = eps[Math.floor(Math.random() * eps.length)]
    router.push(`/cartoons/${randomShow}/${randomEp}`)
  }

  const activeFilterCount =
    (activeCategory !== 'All Shows' ? 1 : 0) + (activeLevel ? 1 : 0)

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        background: WARM_WHITE,
        pt: { xs: '56px', md: '64px' },
      }}
    >
      {/* ═══════════════════════════════════════════════
          HERO
         ═══════════════════════════════════════════════ */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          minHeight: { xs: '280px', md: '300px' },
          maxHeight: { xs: '50vh', md: 'none' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: { xs: 2, md: 4 },
          pt: { xs: 6, md: 10 },
          pb: { xs: 10, md: 10 },
          overflow: 'hidden',
        }}
      >
        {/* Background image */}
        <Box
          component="img"
          src="/cartoons/cartooons.avif"
          alt=""
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* Dark overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(10,31,21,0.40) 0%, rgba(10,31,21,0.60) 55%, rgba(10,31,21,0.88) 100%)',
          }}
        />
        {/* Vignette */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.8) 100%)',
          }}
        />

        {/* Title */}
        <Typography
          variant="h1"
          sx={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: { xs: '32px', sm: '48px', md: '72px' },
            fontWeight: 700,
            color: '#fff',
            mb: 1,
            position: 'relative',
            zIndex: 1,
          }}
        >
          Arabic Cartoons
        </Typography>

        {/* Arabic subtitle */}
        <Typography
          sx={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: { xs: '18px', sm: '24px', md: '36px' },
            fontWeight: 600,
            color: GOLD_LT,
            mb: 2,
            position: 'relative',
            zIndex: 1,
            direction: 'rtl',
          }}
        >
          الرسوم المتحركة بالعربية
        </Typography>

        {/* Description */}
        <Typography
          sx={{
            fontFamily: '"Jost", system-ui, sans-serif',
            fontSize: { xs: '14px', sm: '16px', md: '20px' },
            fontWeight: 500,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.8)',
            maxWidth: 420,
            mb: { xs: 2, md: 3 },
            position: 'relative',
            zIndex: 1,
          }}
        >
          Learn Arabic naturally through your favourite shows, with interactive
          subtitles and vocabulary.
        </Typography>

        {/* Feature labels — desktop */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            mb: 3,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {[
            { label: 'Interactive Subtitles', icon: <Subtitles sx={{ fontSize: { xs: 14, md: 16 }, mr: 0.5 }} /> },
            { label: 'Vocabulary Builder', icon: <MenuBook sx={{ fontSize: { xs: 14, md: 16 }, mr: 0.5 }} /> },
            { label: 'Grammar Notes', icon: <School sx={{ fontSize: { xs: 14, md: 16 }, mr: 0.5 }} /> },
          ].map((f) => (
            <Box key={f.label} sx={{ display: 'flex', alignItems: 'center' }}>
              {f.icon}
              <Typography sx={{ fontSize: { xs: 13, md: 16 }, color: 'rgba(255,255,255,0.9)' }}>
                {f.label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Mobile feature line */}
        <Typography
          sx={{
            display: { xs: 'block', lg: 'none' },
            fontSize: 12,
            fontStyle: 'italic',
            color: GOLD_LT,
            mb: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          With interactive subtitles, vocabulary &amp; grammar
        </Typography>

        {/* CTA */}
        <Button
          variant="contained"
          endIcon={<ChevronRight />}
          onClick={goToRandomEpisode}
          sx={{
            backgroundColor: GOLD,
            color: BARK,
            fontFamily: '"Jost", system-ui, sans-serif',
            fontSize: { xs: 16, md: 19 },
            fontWeight: 500,
            textTransform: 'none',
            borderRadius: '9999px',
            px: 4,
            py: 1.2,
            minHeight: 48,
            boxShadow: '0 4px 16px rgba(184,134,11,0.3)',
            '&:hover': { backgroundColor: GOLD_LT, transform: 'scale(1.02)' },
            transition: 'all 0.2s',
            position: 'relative',
            zIndex: 1,
          }}
        >
          Take Me Anywhere
        </Button>
      </Box>

      {/* ═══════════════════════════════════════════════
          CONTENT
         ═══════════════════════════════════════════════ */}
      <Container
        maxWidth="xl"
        sx={{
          position: 'relative',
          zIndex: 2,
          px: { xs: 2, md: 3 },
        }}
      >
        {/* ── Section Header ── */}
        <Box id="shows-section" sx={{ textAlign: 'center', mb: 3, pt: 4 }}>
          <Typography
            sx={{
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: { xs: 13, md: 14 },
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: GOLD,
              mb: 0.5,
            }}
          >
            Browse Collection
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: { xs: 24, md: 32 },
              color: BARK,
              mb: 1,
            }}
          >
            {activeCategory}
          </Typography>
          <Box
            sx={{
              width: 48,
              height: 2,
              borderRadius: '2px',
              backgroundColor: GOLD,
              mx: 'auto',
            }}
          />
        </Box>

        {/* ── Mobile Filter Button ── */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Button
            startIcon={<Tune />}
            onClick={() => setFilterDrawerOpen(true)}
            sx={{
              height: 40,
              px: 2,
              borderRadius: '6px',
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              textTransform: 'none',
              color: BARK,
              border: '1px solid rgba(44,26,14,0.15)',
              backgroundColor: WARM_WHITE,
              '&:hover': { backgroundColor: 'rgba(44,26,14,0.04)' },
            }}
          >
            Filters
            {activeFilterCount > 0 && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: GOLD,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeFilterCount}
              </Box>
            )}
          </Button>
          <Typography sx={{ fontSize: 13, color: MUTED }}>
            {filteredShows.length} {filteredShows.length === 1 ? 'show' : 'shows'}
          </Typography>
        </Box>

        {/* ── Desktop: Sidebar + Grid Layout ── */}
        <Box sx={{ display: 'flex', gap: { md: 4, lg: 5 }, mb: 6 }}>
          {/* Sidebar — desktop only */}
          <Box
            sx={{
              width: 240,
              flexShrink: 0,
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Box sx={{ position: 'sticky', top: 100, alignSelf: 'flex-start' }}>
              <FilterSidebar
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                activeLevel={activeLevel}
                setActiveLevel={setActiveLevel}
              />
            </Box>
          </Box>

          {/* Show Grid */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Desktop result count */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', mb: 2 }}>
              <Typography sx={{ fontSize: 13, color: MUTED }}>
                {filteredShows.length} {filteredShows.length === 1 ? 'show' : 'shows'}
              </Typography>
            </Box>

            {filteredShows.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 20, color: BARK, mb: 1 }}>
                  No shows match your filters
                </Typography>
                <Typography sx={{ fontSize: 14, color: MUTED, mb: 2 }}>
                  Try adjusting your category or level selection.
                </Typography>
                <Button
                  onClick={() => { setActiveCategory('All Shows'); setActiveLevel('') }}
                  sx={{
                    borderRadius: '9999px',
                    px: 3,
                    py: 1,
                    fontFamily: '"Jost", system-ui, sans-serif',
                    textTransform: 'none',
                    color: BARK,
                    border: '1px solid rgba(44,26,14,0.15)',
                  }}
                >
                  Reset Filters
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filteredShows.map((show) => (
                  <Grid size={{ xs: 12, sm: 6, xl: 3 }} key={show.slug}>
                    <ShowCard show={show} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Box>

        {/* ═══════════════════════════════════════════════
            HOW IT WORKS
           ═══════════════════════════════════════════════ */}
        <Box
          sx={{
            backgroundColor: '#1f1d21',
            backgroundImage: HOW_IT_WORKS_BG,
            borderRadius: '16px',
            px: { xs: 3, md: 6 },
            py: { xs: 5, md: 6 },
            mb: 6,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: { xs: 12, md: 13 },
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#ffffff',
              mb: 0.5,
            }}
          >
            How It Works
          </Typography>
          <Typography
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: { xs: 22, md: 28 },
              color: WARM_WHITE,
              mb: 4,
            }}
          >
            Three Steps to Learning
          </Typography>

          <Grid container spacing={3}>
            {[
              {
                icon: <Tv sx={{ fontSize: 22, color: GOLD }} />,
                title: 'Watch with Subtitles',
                desc: 'Dual Arabic & English subtitles while you watch',
              },
              {
                icon: <TouchApp sx={{ fontSize: 22, color: GOLD }} />,
                title: 'Click Any Word',
                desc: 'Instant definitions, transliteration & audio',
              },
              {
                icon: <AutoStories sx={{ fontSize: 22, color: GOLD }} />,
                title: 'Review & Learn',
                desc: 'Save words to your personal vocabulary deck',
              },
            ].map((step) => (
              <Grid size={{ xs: 12, md: 4 }} key={step.title}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      backgroundColor: WARM_WHITE,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      boxShadow: '0 2px 8px rgba(44,26,14,0.06)',
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: '"Jost", system-ui, sans-serif',
                      fontSize: { xs: 15, md: 17 },
                      fontWeight: 600,
                      color: WARM_WHITE,
                      mb: 0.5,
                    }}
                  >
                    {step.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: 13, md: 15 },
                      fontWeight: 500,
                      color: 'rgba(245,237,224,0.7)',
                      lineHeight: 1.5,
                      maxWidth: 280,
                      mx: 'auto',
                    }}
                  >
                    {step.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ═══════════════════════════════════════════════
            PLACEMENT TEST CTA
           ═══════════════════════════════════════════════ */}
        <Box
          sx={{
            position: 'relative',
            py: 5,
            px: 3,
            textAlign: 'center',
            borderRadius: { xs: 0, md: '16px' },
            mx: { xs: -2, md: 0 },
            mb: 6,
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src="/cards/awm6_converted.avif"
            alt=""
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(44,26,14,0.78)',
            }}
          />
          <Typography
            sx={{
              position: 'relative',
              zIndex: 1,
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: 22,
              color: '#fff',
              mb: 1.5,
            }}
          >
            Not Sure Where to Start?
          </Typography>
          <Typography
            sx={{
              position: 'relative',
              zIndex: 1,
              fontSize: 14,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 400,
              mx: 'auto',
              mb: 3,
              lineHeight: 1.5,
            }}
          >
            Take a quick placement test to find shows matched to your Arabic
            level.
          </Typography>
          <Button
            variant="contained"
            endIcon={<ChevronRight />}
            sx={{
              position: 'relative',
              zIndex: 1,
              backgroundColor: GOLD,
              color: BARK,
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '9999px',
              px: 4,
              py: 1.2,
              minHeight: 48,
              '&:hover': { backgroundColor: GOLD_LT },
            }}
          >
            Take Placement Test
          </Button>
        </Box>

        {/* ═══════════════════════════════════════════════
            COMING SOON
           ═══════════════════════════════════════════════ */}
        <Box sx={{ pb: 8 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              mb: 3,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Jost", system-ui, sans-serif',
                  fontSize: { xs: 13, md: 14 },
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: GOLD,
                  mb: 0.5,
                }}
              >
                Coming Soon
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: { xs: 24, md: 32 },
                  color: BARK,
                }}
              >
                More Shows on the Way
              </Typography>
            </Box>
            <Button
              startIcon={<NotificationsNone sx={{ fontSize: 16 }} />}
              sx={{
                fontFamily: '"Jost", system-ui, sans-serif',
                fontSize: { xs: 13, md: 14 },
                fontWeight: 500,
                textTransform: 'none',
                color: GOLD,
                '&:hover': { backgroundColor: 'rgba(184,134,11,0.06)' },
                display: { xs: 'none', sm: 'flex' },
              }}
            >
              Notify Me
            </Button>
          </Box>

          <Grid container spacing={2}>
            {COMING_SOON.map((show) => (
              <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={show.title}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderRadius: '10px',
                    backgroundColor: WARM_WHITE,
                    border: '1px solid rgba(44,26,14,0.12)',
                    opacity: 0.7,
                    position: 'relative',
                  }}
                >
                  {/* Lock icon */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(44,26,14,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Lock sx={{ fontSize: 14, color: LABEL }} />
                  </Box>
                  {/* Star icon */}
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(184,134,11,0.1)',
                      color: GOLD,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <StarBorder sx={{ fontSize: 18 }} />
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: '"EB Garamond", Georgia, serif',
                      fontSize: { xs: 15, md: 17 },
                      fontWeight: 500,
                      color: BARK,
                      mb: 1,
                    }}
                  >
                    {show.title}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <Chip
                      label={show.category}
                      size="small"
                      sx={{
                        height: 20,
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(44,26,14,0.04)',
                        color: MUTED,
                        fontSize: 10,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: DIFFICULTY_COLORS[show.level] || MUTED,
                      }}
                    >
                      {show.level}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontStyle: 'italic',
                      color: 'rgba(44,26,14,0.5)',
                    }}
                  >
                    {show.date}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* ═══════════════════════════════════════════════
          MOBILE FILTER DRAWER
         ═══════════════════════════════════════════════ */}
      <Drawer
        anchor="left"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 300,
              backgroundColor: WARM_WHITE,
              p: 3,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: 20,
              color: BARK,
            }}
          >
            Filters
          </Typography>
          <IconButton onClick={() => setFilterDrawerOpen(false)} size="small">
            <Close sx={{ fontSize: 20, color: MUTED }} />
          </IconButton>
        </Box>
        <FilterSidebar
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          activeLevel={activeLevel}
          setActiveLevel={setActiveLevel}
          onMobileClose={() => setFilterDrawerOpen(false)}
          hideTitle
        />
      </Drawer>
    </Box>
  )
}