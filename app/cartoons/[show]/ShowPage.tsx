'use client'

import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Drawer,
  IconButton,
  Breadcrumbs,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { ShowMeta, EpisodeMeta } from '../../lib/cartoons'
import { PageBanner } from '@/app/components/page-layout'
import { FilterSidebar, ComingSoonSection, ContentCard } from '@/app/components/content-grid'
import EpisodeEditDialog from '../components/EpisodeEditDialog'
import { deleteEpisode } from '@/app/actions/admin'

/* ── MUI Icons ── */
import {
  PlayArrow,
  Subtitles,
  MenuBook,
  School,
  Close,
  Tune,
  NavigateNext,
  Edit,
  Delete,
  Add,
} from '@mui/icons-material'

/* ── Palette ── */
const BARK = '#2c1a0e'
const GOLD = '#b8860b'
const WARM_WHITE = '#fffaf0'
const MUTED = '#7a6e65'

const COMING_SOON = [
  { title: 'Arabic Peppa Pig', category: 'Everyday Arabic', level: 'A1-A2', date: 'Coming November 2025' },
  { title: 'Avatar: The Last Airbender', category: 'Action', level: 'A2-B1', date: 'Coming December 2025' },
  { title: 'Stories of the Prophets', category: 'Islamic Heritage', level: 'B1-B2', date: 'Coming January 2026' },
  { title: 'Adventure Time', category: 'Everyday Arabic', level: 'A1-A2', date: 'Coming February 2026' },
]

interface ShowPageProps {
  show: ShowMeta
  episodes: EpisodeMeta[]
  isAdmin?: boolean
}

export default function ShowPage({ show, episodes, isAdmin }: ShowPageProps) {
  const router = useRouter()
  const [activeLevel, setActiveLevel] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEpisode, setEditingEpisode] = useState<EpisodeMeta | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteEpisode = async (id: string) => {
    if (!isAdmin) return
    if (!confirm('Are you sure you want to delete this episode? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteEpisode(id)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

  const filteredEpisodes = useMemo(() => {
    if (!activeLevel) return episodes
    return episodes.filter((e) => e.level === activeLevel)
  }, [episodes, activeLevel])

  const goToRandomEpisode = () => {
    const pool = filteredEpisodes.length > 0 ? filteredEpisodes : episodes
    if (pool.length === 0) return
    const randomEp = pool[Math.floor(Math.random() * pool.length)]
    router.push(`/cartoons/${show.slug}/${randomEp.slug}`)
  }

  const activeFilterCount = activeLevel ? 1 : 0

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        background: WARM_WHITE,
        pb: { xs: 0, md: 8 },
      }}
    >
      <PageBanner
        title={show.title}
        titleAr={show.titleAr ?? ''}
        description={show.description ?? 'Learn Arabic naturally through interactive subtitles and vocabulary.'}
        features={[
          { icon: <Subtitles sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Interactive Subtitles' },
          { icon: <MenuBook sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Vocabulary Builder' },
          { icon: <School sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Grammar Notes' },
        ]}
        ctaLabel={episodes.length > 0 ? 'Watch a Random Episode' : 'Coming Soon'}
        ctaAction={goToRandomEpisode}
        ctaStartIcon={<PlayArrow sx={{ fontSize: 20 }} />}
        backgroundImage={show.cover}
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
        {/* ── Content Area ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, pt: 4 }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNext sx={{ fontSize: 16, color: '#9e8a7a' }} />}
            sx={{
              mb: 2,
              '& .MuiBreadcrumbs-li': { fontFamily: 'Jost, sans-serif' },
            }}
          >
            <Typography
              onClick={() => router.push('/')}
              sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: '#7a6e65', cursor: 'pointer', '&:hover': { color: GOLD } }}
            >
              Home
            </Typography>
            <Typography
              onClick={() => router.push('/cartoons')}
              sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: '#7a6e65', cursor: 'pointer', '&:hover': { color: GOLD } }}
            >
              Cartoons
            </Typography>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: '#2c1a0e', fontWeight: 600 }}>
              {show.title}
            </Typography>
          </Breadcrumbs>

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
            {filteredEpisodes.length} {filteredEpisodes.length === 1 ? 'episode' : 'episodes'}
          </Typography>
        </Box>

        {filteredEpisodes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 20, color: BARK, mb: 1 }}>
              {episodes.length === 0 ? 'No episodes yet' : 'No episodes match your filters'}
            </Typography>
            <Typography sx={{ fontSize: 14, color: MUTED, mb: 2 }}>
              {episodes.length === 0 ? 'Use the button below to add the first episode.' : 'Try adjusting your level selection.'}
            </Typography>
            {isAdmin && (
              <Button
                startIcon={<Add />}
                onClick={() => { setEditingEpisode(undefined); setDialogOpen(true); }}
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
                Add episode
              </Button>
            )}
          </Box>
        ) : (
          /* ── Desktop: Sidebar + Grid Layout ── */
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
                  categories={[]}
                  levels={LEVELS}
                  activeCategory=""
                  setActiveCategory={() => {}}
                  activeLevel={activeLevel}
                  setActiveLevel={setActiveLevel}
                />
              </Box>
            </Box>

            {/* Episode Grid */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Desktop result count */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', mb: 2 }}>
                <Typography sx={{ fontSize: 13, color: MUTED }}>
                  {filteredEpisodes.length} {filteredEpisodes.length === 1 ? 'episode' : 'episodes'}
                </Typography>
              </Box>

              {isAdmin && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    startIcon={<Add />}
                    onClick={() => { setEditingEpisode(undefined); setDialogOpen(true); }}
                    sx={{
                      textTransform: 'none',
                      fontFamily: '"Jost", system-ui, sans-serif',
                      color: BARK,
                      border: '1px solid rgba(44,26,14,0.15)',
                      borderRadius: '9999px',
                      px: 2.5,
                      py: 0.75,
                    }}
                  >
                    Add episode
                  </Button>
                </Box>
              )}

              <EpisodeEditDialog
                open={dialogOpen}
                showId={show.id}
                episode={editingEpisode}
                onClose={() => setDialogOpen(false)}
                onSaved={() => { setDialogOpen(false); router.refresh(); }}
              />

              <Grid container spacing={2}>
                {filteredEpisodes.map((ep) => (
                  <Grid size={{ xs: 12, sm: 6, xl: 3 }} key={ep.slug}>
                    <Box sx={{ position: 'relative' }}>
                      {isAdmin && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 2,
                            display: 'flex',
                            gap: 0.5,
                          }}
                        >
                          <IconButton
                            size="small"
                            disabled={deletingId === ep.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingEpisode(ep)
                              setDialogOpen(true)
                            }}
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.9)',
                              color: GOLD,
                              '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                            }}
                          >
                            <Edit sx={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={deletingId === ep.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEpisode(ep.id)
                            }}
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.9)',
                              color: '#c0392b',
                              '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                            }}
                          >
                            <Delete sx={{ fontSize: '1.1rem' }} />
                          </IconButton>
                        </Box>
                      )}
                      <ContentCard
                        slug={ep.slug}
                        hrefPrefix={`/cartoons/${show.slug}`}
                        cover={`/cartoons/${show.slug}/${ep.slug}.avif`}
                        title={ep.title}
                        level={ep.level}
                        category={ep.tags[0]}
                        genre={ep.tags[1]}
                        description={ep.description}
                        overlayIcon={<PlayArrow sx={{ fontSize: 20, color: BARK, ml: 0.3 }} />}
                        metaItems={[]}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        )}

        </Box>

        <ComingSoonSection
          label="Coming Soon"
          heading="More Shows on the Way"
          items={COMING_SOON}
        />
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
          categories={[]}
          levels={LEVELS}
          activeCategory=""
          setActiveCategory={() => {}}
          activeLevel={activeLevel}
          setActiveLevel={setActiveLevel}
          onMobileClose={() => setFilterDrawerOpen(false)}
          hideTitle
        />
      </Drawer>
    </Box>
  )
}
