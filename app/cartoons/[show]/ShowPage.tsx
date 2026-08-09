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
import { ShowMeta, EpisodeMeta, getEpisodeCoverPath } from '../../lib/cartoons'
import { PageBanner } from '@/app/components/page-layout'
import { FilterSidebar, ContentCard } from '@/app/components/content-grid'
import EpisodeEditDialog from '../components/EpisodeEditDialog'
import { deleteEpisode } from '@/app/actions/admin'
import { useIsAdmin } from '@/app/lib/useIsAdmin'
import { errorMessage } from '@/app/lib/errors'

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
} from '@mui/icons-material'

/* ── Palette ── */
const BARK = '#2c1a0e'
const GOLD = '#b8860b'
const WARM_WHITE = '#fffaf0'
const MUTED = '#7a6e65'

interface ShowPageProps {
  show: ShowMeta
  episodes: EpisodeMeta[]
}

export default function ShowPage({ show, episodes }: ShowPageProps) {
  const isAdmin = useIsAdmin()
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
    } catch (e: unknown) {
      alert(errorMessage(e) ?? 'Failed to delete episode')
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

  const bannerFeatures = [
    { icon: <Subtitles sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Interactive Subtitles' },
    { icon: <MenuBook sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Vocabulary Builder' },
    { icon: <School sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Grammar Notes' },
  ]

  const ctaLabel = episodes.length > 0 ? 'Watch a Random Episode' : 'Coming Soon'

  return (
    <Box
      component="main"
      sx={{
        minHeight: { xs: 'calc(100vh - 56px)', md: '100vh' },
        background: WARM_WHITE,
        pb: { xs: 0, md: 8 },
      }}
    >
      {/* Desktop banner */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <PageBanner
          title={show.title}
          titleAr={show.titleAr ?? ''}
          description={show.description ?? 'Learn Arabic naturally through interactive subtitles and vocabulary.'}
          features={bannerFeatures}
          ctaLabel={ctaLabel}
          ctaAction={goToRandomEpisode}
          ctaStartIcon={<PlayArrow sx={{ fontSize: 20 }} />}
          backgroundImage={show.cover}
        />
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
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Content Area ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 3 }, pt: { xs: 1.5, md: 4 } }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNext sx={{ fontSize: 16, color: '#9e8a7a' }} />}
            sx={{
              display: { xs: 'none', md: 'flex' },
              mb: { xs: 1, md: 2 },
              '& .MuiBreadcrumbs-li': { fontFamily: 'Jost, sans-serif' },
            }}
          >
            <Typography
              onClick={() => router.push('/')}
              sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.9rem', md: '1rem' }, color: '#7a6e65', cursor: 'pointer', '&:hover': { color: GOLD } }}
            >
              Home
            </Typography>
            <Typography
              onClick={() => router.push('/cartoons')}
              sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.9rem', md: '1rem' }, color: '#7a6e65', cursor: 'pointer', '&:hover': { color: GOLD } }}
            >
              Cartoons
            </Typography>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.9rem', md: '1rem' }, color: '#2c1a0e', fontWeight: 600 }}>
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
            <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 18, md: 20 }, color: BARK, mb: 1 }}>
              {episodes.length === 0 ? 'No episodes yet' : 'No episodes match your filters'}
            </Typography>
            <Typography sx={{ fontSize: { xs: 13, md: 14 }, color: MUTED, mb: 2 }}>
              {episodes.length === 0 ? 'Check back soon for new episodes.' : 'Try adjusting your level selection.'}
            </Typography>
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

              <EpisodeEditDialog
                open={dialogOpen}
                showId={show.id}
                episode={editingEpisode}
                onClose={() => setDialogOpen(false)}
                onSaved={() => { setDialogOpen(false); router.refresh(); }}
              />

              <Grid container spacing={{ xs: 1, md: 2 }}>
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
                        cover={getEpisodeCoverPath(show.slug, ep.slug)}
                        title={ep.title}
                        level={ep.level}
                        category={ep.tags[0]}
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
