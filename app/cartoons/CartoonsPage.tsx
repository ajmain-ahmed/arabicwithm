'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Container,
  Drawer,
  IconButton,
  Breadcrumbs,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { useRouter } from 'next/navigation'
import { ShowMeta } from '../lib/cartoons'
import { PageBanner } from '@/app/components/page-layout'
import { FilterSidebar, ContentCard } from '@/app/components/content-grid'
import ShowEditDialog from './components/ShowEditDialog'
import { deleteShow } from '@/app/actions/admin'

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

const CATEGORIES = ['All Shows', 'Everyday Arabic', 'Historical', 'Islamic Heritage', 'Action']
const LEVELS = ['A1-A2', 'A2-B1', 'B1-B2', 'B2-C1']

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */
export default function CartoonsPage({
  shows,
  episodesMap,
  isAdmin,
}: {
  shows: ShowMeta[]
  episodesMap: Record<string, string[]>
  isAdmin?: boolean
}) {
  const [activeCategory, setActiveCategory] = useState('All Shows')
  const [activeLevel, setActiveLevel] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShow, setEditingShow] = useState<ShowMeta | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const handleDeleteShow = async (id: string) => {
    if (!isAdmin) return
    if (!confirm('Are you sure you want to delete this show? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteShow(id)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  const filteredShows = shows.filter((s) => {
    const catMatch = activeCategory === 'All Shows' || s.category === activeCategory
    const levelMatch = !activeLevel || s.level === activeLevel
    return catMatch && levelMatch
  })

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
        minHeight: { xs: 'calc(100vh - 56px)', md: '100vh' },
        background: WARM_WHITE,
        pb: { xs: 0, md: 8 },
      }}
    >
      {/* Desktop banner */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
              sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: '#7a6e65', cursor: 'pointer', '&:hover': { color: GOLD } }}
            >
              Home
            </Typography>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: '#2c1a0e', fontWeight: 600 }}>
              Cartoons
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
                categories={CATEGORIES}
                levels={LEVELS}
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

            <ShowEditDialog
              open={dialogOpen}
              show={editingShow}
              onClose={() => setDialogOpen(false)}
              onSaved={() => { setDialogOpen(false); router.refresh(); }}
            />

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
                    <Box sx={{ position: 'relative' }}>
                      {isAdmin && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 2,
                            display: 'flex',
                            gap: 0.5,
                          }}
                        >
                          <IconButton
                            size="small"
                            disabled={deletingId === show.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingShow(show)
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
                            disabled={deletingId === show.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteShow(show.id)
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
                        slug={show.slug}
                        hrefPrefix="/cartoons"
                        cover={show.cover}
                        title={show.title}
                        titleAr={show.titleAr}
                        description={show.description}
                        category={show.category}

                        level={show.level}
                        overlayIcon={<PlayArrow sx={{ fontSize: 20, color: BARK, ml: 0.3 }} />}
                        metaItems={[
                          {
                            icon: <School sx={{ fontSize: 14, color: '#9e8a7a' }} />,
                            label: `${show.episodeCount} ${show.episodeCount === 1 ? 'episode' : 'episodes'}`,
                          },
                        ]}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Box>

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
          categories={CATEGORIES}
          levels={LEVELS}
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
