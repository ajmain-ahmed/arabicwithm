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
import { PageBanner, HowItWorksSection, PlacementTestCTA } from '@/app/components/page-layout'

/* ── MUI Icons ── */
import {
  PlayArrow,
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
        pb: { xs: 4, md: 8 },
      }}
    >
      <PageBanner
        title="Arabic Cartoons"
        titleAr="الرسوم المتحركة بالعربية"
        description="Learn Arabic naturally through your favourite shows, with interactive subtitles and vocabulary."
        features={[
          { icon: <Subtitles sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Interactive Subtitles' },
          { icon: <MenuBook sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Vocabulary Builder' },
          { icon: <School sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Grammar Notes' },
        ]}
        ctaLabel="Take Me Anywhere"
        ctaAction={goToRandomEpisode}
        ctaStartIcon={<PlayArrow sx={{ fontSize: 20 }} />}
        backgroundImage="/cartoons/cartooons.avif"
      />

      {/* ═══════════════════════════════════════════════
          CONTENT
         ═══════════════════════════════════════════════ */}
      <Container
        maxWidth="xl"
        sx={{
          position: 'relative',
          zIndex: 2,
          px: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 4, md: 6 },
        }}
      >
        {/* ── Section Header ── */}
        <Box id="shows-section" sx={{ textAlign: 'center', pt: 4 }}>
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
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', alignItems: 'center' }}>
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
        <Box sx={{ display: 'flex', gap: { md: 4, lg: 5 } }}>
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

        <HowItWorksSection
          steps={[
            {
              icon: <Tv sx={{ fontSize: 22, color: '#b8860b' }} />,
              title: 'Watch with Subtitles',
              desc: 'Dual Arabic & English subtitles while you watch',
            },
            {
              icon: <TouchApp sx={{ fontSize: 22, color: '#b8860b' }} />,
              title: 'Click Any Word',
              desc: 'Instant definitions, transliteration & audio',
            },
            {
              icon: <AutoStories sx={{ fontSize: 22, color: '#b8860b' }} />,
              title: 'Review & Learn',
              desc: 'Save words to your personal vocabulary deck',
            },
          ]}
        />

        <PlacementTestCTA
          heading="Not Sure Where to Start?"
          description="Take a quick placement test to find shows matched to your Arabic level."
          ctaLabel="Take Placement Test"
        />

        {/* ═══════════════════════════════════════════════
            COMING SOON
           ═══════════════════════════════════════════════ */}
        <Box>
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