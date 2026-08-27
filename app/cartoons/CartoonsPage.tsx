'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  Drawer,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  Close,
  Delete,
  Edit,
  Movie,
  NavigateNext,
  PlayArrow,
  School,
  Tune,
  VideoLibrary,
} from '@mui/icons-material'
import type { EpisodeMeta, ShowMeta } from '@/app/lib/cartoons'
import { ContentCard, FilterSidebar } from '@/app/components/content-grid'
import ShowEditDialog from './components/ShowEditDialog'
import { deleteShow } from '@/app/actions/admin'
import { useIsAdmin } from '@/app/lib/useIsAdmin'
import { errorMessage } from '@/app/lib/errors'

const BARK = 'var(--awm-bark)'
const GOLD = 'var(--awm-gold)'
const WARM_WHITE = 'var(--awm-cream-light)'
const MUTED = 'var(--awm-muted)'
const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'A1-A2', 'A2-B1', 'B1-B2', 'B2-C1']

export interface WatchEpisode extends EpisodeMeta {
  showId: string
  showSlug: string
  showTitle: string
  showCategory?: string
}

type WatchView = 'episodes' | 'shows'

export default function CartoonsPage({
  shows,
  episodes,
  episodesMap,
  showCategories,
  showAdditionalTags,
  availableCategories,
  availableAdditionalTags,
}: {
  shows: ShowMeta[]
  episodes: WatchEpisode[]
  episodesMap: Record<string, string[]>
  showCategories: Record<string, string>
  showAdditionalTags: Record<string, string[]>
  availableCategories: string[]
  availableAdditionalTags: string[]
}) {
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const [view, setView] = useState<WatchView>('episodes')
  const [activeCategory, setActiveCategory] = useState('All Categories')
  const [activeAdditionalTag, setActiveAdditionalTag] = useState('')
  const [activeLevel, setActiveLevel] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShow, setEditingShow] = useState<ShowMeta | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredEpisodes = useMemo(() => episodes.filter((episode) => {
    const categoryMatches = activeCategory === 'All Categories' || episode.showCategory === activeCategory
    const tagMatches = !activeAdditionalTag || episode.tags.some((tag) => tag.toLowerCase() === activeAdditionalTag.toLowerCase())
    const levelMatches = !activeLevel || episode.level === activeLevel
    return categoryMatches && tagMatches && levelMatches
  }), [activeAdditionalTag, activeCategory, activeLevel, episodes])

  const filteredShows = useMemo(() => shows.filter((show) => {
    const categoryMatches = activeCategory === 'All Categories' || showCategories[show.slug] === activeCategory
    const tagMatches = !activeAdditionalTag || (showAdditionalTags[show.slug] ?? []).some((tag) => tag.toLowerCase() === activeAdditionalTag.toLowerCase())
    const levelMatches = !activeLevel || show.level === activeLevel
    return categoryMatches && tagMatches && levelMatches
  }), [activeAdditionalTag, activeCategory, activeLevel, showAdditionalTags, showCategories, shows])

  const visibleItems = view === 'episodes' ? filteredEpisodes : filteredShows
  const activeFilterCount = (activeCategory !== 'All Categories' ? 1 : 0) + (activeAdditionalTag ? 1 : 0) + (activeLevel ? 1 : 0)

  const resetFilters = () => {
    setActiveCategory('All Categories')
    setActiveAdditionalTag('')
    setActiveLevel('')
  }

  const goToRandomEpisode = () => {
    const pool = filteredEpisodes.length > 0 ? filteredEpisodes : episodes
    if (pool.length === 0) return
    const episode = pool[Math.floor(Math.random() * pool.length)]
    router.push(`/cartoons/${episode.showSlug}/${episode.slug}`)
  }

  const handleDeleteShow = async (id: string) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this show? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteShow(id)
      router.refresh()
    } catch (error: unknown) {
      alert(errorMessage(error) ?? 'Failed to delete show')
    } finally {
      setDeletingId(null)
    }
  }

  const filters = (
    <FilterSidebar
      categories={availableCategories}
      levels={LEVELS}
      additionalTags={availableAdditionalTags}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      activeAdditionalTag={activeAdditionalTag}
      setActiveAdditionalTag={setActiveAdditionalTag}
      activeLevel={activeLevel}
      setActiveLevel={setActiveLevel}
      onMobileClose={() => setFilterDrawerOpen(false)}
    />
  )

  return (
    <Box component="main" sx={{ minHeight: { xs: 'calc(100vh - 56px)', md: '100vh' }, bgcolor: WARM_WHITE, pb: { xs: 2, md: 8 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 4 } }}>
        <Breadcrumbs separator={<NavigateNext sx={{ fontSize: 16, color: 'var(--awm-muted-light)' }} />} sx={{ display: { xs: 'none', md: 'flex' }, mb: 2 }}>
          <Typography onClick={() => router.push('/')} sx={{ color: MUTED, cursor: 'pointer', fontFamily: 'Jost, sans-serif', '&:hover': { color: GOLD } }}>Home</Typography>
          <Typography sx={{ color: BARK, fontWeight: 600, fontFamily: 'Jost, sans-serif' }}>Watch</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5, mb: { xs: 1.5, md: 3 } }}>
          <ToggleButtonGroup
            exclusive
            value={view}
            onChange={(_, nextView: WatchView | null) => { if (nextView) setView(nextView) }}
            aria-label="Watch catalogue view"
            size="small"
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'initial' }, minHeight: 44, px: 2.5, color: MUTED, borderColor: 'color-mix(in srgb, var(--awm-bark) 14%, transparent)', fontFamily: 'Jost, sans-serif', fontWeight: 700, textTransform: 'none', '&.Mui-selected': { bgcolor: '#0e2e1f', color: '#fff', '&:hover': { bgcolor: '#173f2d' } } } }}
          >
            <ToggleButton value="episodes" aria-label="Show all episodes"><VideoLibrary sx={{ mr: 0.75, fontSize: 19 }} />All Episodes</ToggleButton>
            <ToggleButton value="shows" aria-label="Show all shows"><Movie sx={{ mr: 0.75, fontSize: 19 }} />All Shows</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Button startIcon={<Tune />} onClick={() => setFilterDrawerOpen(true)} sx={{ display: { xs: 'inline-flex', md: 'none' }, minHeight: 42, px: 2, borderRadius: '8px', color: BARK, border: '1px solid rgba(44,26,14,.15)', textTransform: 'none' }}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
            <Button disabled={episodes.length === 0} onClick={goToRandomEpisode} startIcon={<PlayArrow />} variant="contained" sx={{ minHeight: 42, bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '9999px', px: { xs: 1.5, sm: 2.25 }, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#174832' } }}>
              Take Me Anywhere
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: { md: 4, lg: 5 } }}>
          <Box sx={{ width: 240, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 100 }}>{filters}</Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ display: { xs: 'none', md: 'block' }, mb: 2, color: MUTED, textAlign: 'right', fontSize: 13 }}>
              {visibleItems.length} {view === 'episodes' ? 'episodes' : 'shows'}
            </Typography>

            <ShowEditDialog open={dialogOpen} show={editingShow} onClose={() => setDialogOpen(false)} onSaved={() => { setDialogOpen(false); router.refresh() }} />

            {visibleItems.length === 0 ? (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Typography sx={{ color: BARK, fontFamily: 'var(--font-heading)', fontSize: 22 }}>No {view} match your filters</Typography>
                <Button onClick={resetFilters} sx={{ mt: 1.5, color: GOLD, textTransform: 'none' }}>Reset filters</Button>
              </Box>
            ) : view === 'episodes' ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3,minmax(0,1fr))', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))', xl: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 1, sm: 2 } }}>
                {filteredEpisodes.map((episode) => (
                  <ContentCard
                    key={episode.id}
                    slug={episode.slug}
                    hrefPrefix={`/cartoons/${episode.showSlug}`}
                    cover={episode.cover ?? ''}
                    title={episode.title}
                    description={episode.description}
                    level={episode.level}
                    tags={episode.tags}
                    showTags={false}
                    aspectRatio="16 / 9"
                    imageFit="cover"
                    denseMobileTile
                    mobileAspectRatio="16 / 9"
                    mobileTitleSize={10}
                    overlayIcon={<PlayArrow sx={{ fontSize: 20, color: BARK, ml: 0.3 }} />}
                    metaItems={[{ icon: <Movie sx={{ fontSize: 15, color: 'var(--awm-muted-light)' }} />, label: episode.showTitle }]}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3,minmax(0,1fr))', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))', xl: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 1, sm: 2 } }}>
                {filteredShows.map((show) => (
                  <Box key={show.id} sx={{ position: 'relative', minWidth: 0 }}>
                    {isAdmin && (
                      <Box sx={{ position: 'absolute', zIndex: 2, top: 8, left: 8, display: { xs: 'none', sm: 'flex' }, gap: 0.5 }}>
                        <IconButton size="small" disabled={deletingId === show.id} onClick={(event) => { event.preventDefault(); setEditingShow(show); setDialogOpen(true) }} sx={{ bgcolor: 'rgba(255,255,255,.92)', color: GOLD }}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" disabled={deletingId === show.id} onClick={(event) => { event.preventDefault(); void handleDeleteShow(show.id) }} sx={{ bgcolor: 'rgba(255,255,255,.92)', color: '#c0392b' }}><Delete fontSize="small" /></IconButton>
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
                      tags={showAdditionalTags[show.slug]}
                      maxVisibleTags={2}
                      level={show.level}
                      denseMobileTile
                      mobileAspectRatio="2 / 3"
                      mobileImagePosition="center"
                      overlayIcon={<PlayArrow sx={{ fontSize: 20, color: BARK, ml: 0.3 }} />}
                      metaItems={[{ icon: <School sx={{ fontSize: 14, color: 'var(--awm-muted-light)' }} />, label: `${episodesMap[show.slug]?.length ?? 0} episodes` }]}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Container>

      <Drawer anchor="left" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} slotProps={{ paper: { sx: { width: 310, bgcolor: WARM_WHITE, p: 3 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ color: BARK, fontFamily: 'var(--font-heading)', fontSize: 22 }}>Filters</Typography>
          <IconButton onClick={() => setFilterDrawerOpen(false)} aria-label="Close filters"><Close /></IconButton>
        </Box>
        {filters}
      </Drawer>
    </Box>
  )
}
