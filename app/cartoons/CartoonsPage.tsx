'use client'
import { Shuffle } from '@mui/icons-material'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  Drawer,
  IconButton,
  Pagination,
  Skeleton,
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
import { WATCH_LEVELS } from '@/app/lib/cartoons'
import { ContentCard, FilterSidebar } from '@/app/components/content-grid'
import ShowEditDialog from './components/ShowEditDialog'
import { deleteShow } from '@/app/actions/admin'
import { pickRandomEpisodeForWatch } from '@/app/actions/cartoons'
import { useIsAdmin } from '@/app/lib/useIsAdmin'
import { errorMessage } from '@/app/lib/errors'

const BARK = 'var(--awm-bark)'
const GOLD = 'var(--awm-gold)'
const WARM_WHITE = 'var(--awm-cream-light)'
const MUTED = 'var(--awm-muted)'

export interface WatchEpisode extends EpisodeMeta {
  showId: string
  showSlug: string
  showTitle: string
  showCategory?: string
}

type WatchView = 'episodes' | 'shows'
type WatchControl = WatchView | 'shuffle'

export interface WatchFilters {
  category: string
  level: string
  additionalTag: string
}

export function CartoonsPageSkeleton() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: { xs: 'calc(100vh - 56px)', md: '100vh' },
        '@supports (height: 100dvh)': { minHeight: { xs: 'calc(100dvh - 56px)', md: '100dvh' } },
        bgcolor: WARM_WHITE,
        pb: { xs: 2, md: 8 },
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 4 } }}>
        <Box sx={{ display: { xs: 'none', md: 'block' }, mb: 2 }}>
          <Skeleton width={140} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: { xs: 1.5, md: 3 } }}>
          <Skeleton variant="rounded" width={360} height={44} sx={{ borderRadius: '9999px', maxWidth: '60%' }} />
          <Skeleton variant="rounded" width={110} height={44} sx={{ display: { xs: 'none', md: 'block' } }} />
        </Box>
        <Box sx={{ display: 'flex', gap: { md: 4, lg: 5 } }}>
          <Box sx={{ width: 240, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 100, display: 'grid', gap: 1.75, pt: 0.5 }}>
              {Array.from({ length: 9 }).map((_, index) => (
                <Skeleton key={index} height={32} />
              ))}
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton sx={{ display: { xs: 'none', md: 'block' }, mb: 2, ml: 'auto' }} width={90} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3,minmax(0,1fr))', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))', xl: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 0.75, sm: 1 } }}>
              {Array.from({ length: 12 }).map((_, index) => (
                <Skeleton key={index} variant="rectangular" sx={{ aspectRatio: '4 / 5', borderRadius: '4px', bgcolor: 'rgba(44,26,14,0.08)' }} />
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export default function CartoonsPage({
  shows,
  episodes,
  showAdditionalTags,
  episodeCounts,
  availableCategories,
  availableAdditionalTags,
  filters,
  page,
  episodePageCount,
  showPageCount,
  totalEpisodes,
  totalShows,
}: {
  shows: ShowMeta[]
  episodes: WatchEpisode[]
  showAdditionalTags: Record<string, string[]>
  episodeCounts: Record<string, number>
  availableCategories: string[]
  availableAdditionalTags: string[]
  filters: WatchFilters
  page: number
  episodePageCount: number
  showPageCount: number
  totalEpisodes: number
  totalShows: number
}) {
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [view, setView] = useState<WatchView>('episodes')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShow, setEditingShow] = useState<ShowMeta | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [shuffleBusy, setShuffleBusy] = useState(false)

  const activeCategory = filters.category || 'All Categories'
  const activeAdditionalTag = filters.additionalTag
  const activeLevel = filters.level

  /* Filter changes reset pagination and sync to the URL, so the server can
     slice the matching page. */
  const updateFilters = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    params.delete('page')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }
  const setActiveCategory = (category: string) => updateFilters((params) => {
    if (!category || category === 'All Categories') params.delete('category')
    else params.set('category', category)
  })
  const setActiveAdditionalTag = (tag: string) => updateFilters((params) => {
    if (!tag) params.delete('additionalTag')
    else params.set('additionalTag', tag)
  })
  const setActiveLevel = (level: string) => updateFilters((params) => {
    if (!level) params.delete('level')
    else params.set('level', level)
  })
  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (nextPage <= 1) params.delete('page')
    else params.set('page', String(nextPage))
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }
  const resetFilters = () => router.push(pathname)

  const visibleItems = view === 'episodes' ? episodes : shows
  const pageCount = view === 'episodes' ? episodePageCount : showPageCount
  const totalItems = view === 'episodes' ? totalEpisodes : totalShows
  const activeFilterCount = (filters.category ? 1 : 0) + (filters.additionalTag ? 1 : 0) + (filters.level ? 1 : 0)

  const goToRandomEpisode = async () => {
    if (totalEpisodes === 0 || shuffleBusy) return
    setShuffleBusy(true)
    try {
      const target = await pickRandomEpisodeForWatch({
        category: activeCategory,
        level: activeLevel,
        additionalTag: activeAdditionalTag,
      })
      if (target) router.push(`/cartoons/${target.showSlug}/${target.slug}`)
    } catch (error: unknown) {
      alert(errorMessage(error) ?? 'Failed to pick a random episode')
    } finally {
      setShuffleBusy(false)
    }
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

  const filtersPanel = (
    <FilterSidebar
      categories={availableCategories}
      levels={WATCH_LEVELS}
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
    <Box
      component="main"
      sx={{
        minHeight: { xs: 'calc(100vh - 56px)', md: '100vh' },
        '@supports (height: 100dvh)': { minHeight: { xs: 'calc(100dvh - 56px)', md: '100dvh' } },
        bgcolor: WARM_WHITE,
        pb: { xs: 2, md: 8 },
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 4 } }}>
        <Breadcrumbs separator={<NavigateNext sx={{ fontSize: 16, color: 'var(--awm-muted-light)' }} />} sx={{ display: { xs: 'none', md: 'flex' }, mb: 2 }}>
          <Typography onClick={() => router.push('/')} sx={{ color: MUTED, cursor: 'pointer', fontFamily: 'Jost, sans-serif', '&:hover': { color: GOLD } }}>Home</Typography>
          <Typography sx={{ color: BARK, fontWeight: 600, fontFamily: 'Jost, sans-serif' }}>Watch</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5, mb: { xs: 1.5, md: 3 } }}>
          <Box sx={{ display: 'flex', width: { xs: '100%', sm: 'auto' }, alignItems: 'center' }}>
          <ToggleButtonGroup
            exclusive
            value={view}
            onChange={(_, nextControl: WatchControl | null) => {
              if (nextControl === 'shuffle') void goToRandomEpisode()
              else if (nextControl) setView(nextControl)
            }}
            aria-label="Watch catalogue view"
            size="small"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              alignSelf: { xs: 'stretch', sm: 'flex-start' },
              borderRadius: '9999px',
              overflow: 'hidden',
              '& .MuiToggleButton-root': {
                flex: { xs: '1 1 0', sm: '0 0 auto' },
                minWidth: 0,
                minHeight: 44,
                px: { xs: 0.75, sm: 2.25 },
                borderRadius: 0,
                color: MUTED,
                borderColor: 'color-mix(in srgb, var(--awm-bark) 14%, transparent)',
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: 12, sm: 14 },
                fontWeight: 700,
                textTransform: 'none',
                '&.Mui-selected': { bgcolor: '#0e2e1f', color: '#fff', '&:hover': { bgcolor: '#173f2d' } },
              },
            }}
          >
            <ToggleButton value="episodes" aria-label="Show all episodes">
              <VideoLibrary sx={{ display: { xs: 'none', sm: 'inline-flex' }, mr: 0.75, fontSize: 19 }} />
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Episodes</Box>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>All Episodes</Box>
            </ToggleButton>
            <ToggleButton value="shows" aria-label="Show all shows">
              <Movie sx={{ display: { xs: 'none', sm: 'inline-flex' }, mr: 0.75, fontSize: 19 }} />
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Shows</Box>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>All Shows</Box>
            </ToggleButton>
            <ToggleButton value="shuffle" aria-label="Open a random episode" title="Random episode" disabled={totalEpisodes === 0 || shuffleBusy}><Shuffle sx={{ display: { xs: 'none', sm: 'inline-flex' }, mr: 0.75, fontSize: 19 }} />Shuffle</ToggleButton>
          </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Button startIcon={<Tune />} onClick={() => setFilterDrawerOpen(true)} sx={{ display: { xs: 'inline-flex', md: 'none' }, minHeight: 42, px: 2, borderRadius: '8px', color: BARK, border: '1px solid rgba(44,26,14,.15)', textTransform: 'none' }}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
            {activeFilterCount > 0 && <Button onClick={resetFilters} sx={{ minHeight: 44 }}>Clear all</Button>}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: { md: 4, lg: 5 } }}>
          <Box sx={{ width: 240, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 100 }}>{filtersPanel}</Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ display: { xs: 'none', md: 'block' }, mb: 2, color: MUTED, textAlign: 'right', fontSize: 13 }}>
              {totalItems} {view === 'episodes' ? 'episodes' : 'shows'}
            </Typography>

            <ShowEditDialog open={dialogOpen} show={editingShow} onClose={() => setDialogOpen(false)} onSaved={() => { setDialogOpen(false); router.refresh() }} />

            {visibleItems.length === 0 ? (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Typography sx={{ color: BARK, fontFamily: 'var(--font-heading)', fontSize: 22 }}>No {view} match your filters</Typography>
                <Button onClick={resetFilters} sx={{ mt: 1.5, color: GOLD, textTransform: 'none' }}>Reset filters</Button>
              </Box>
            ) : view === 'episodes' ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3,minmax(0,1fr))', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))', xl: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 0.75, sm: 1 } }}>
                {episodes.map((episode) => (
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
                    aspectRatio="4 / 5"
                    imageFit="cover"
                    imageCrop={episode.coverCrop}
                    denseMobileTile
                    mobileAspectRatio="4 / 5"
                    mobileImagePosition="center"
                    mobileTitleSize={10}
                    overlayIcon={<PlayArrow sx={{ fontSize: 20, color: BARK, ml: 0.3 }} />}
                    metaItems={[{ icon: <Movie sx={{ fontSize: 15, color: 'var(--awm-muted-light)' }} />, label: episode.showTitle }]}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3,minmax(0,1fr))', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))', xl: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 0.75, sm: 1 } }}>
                {shows.map((show) => (
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
                      aspectRatio="4 / 5"
                      imageFit="cover"
                      imageCrop={show.coverCrop}
                      denseMobileTile
                      mobileAspectRatio="4 / 5"
                      mobileImagePosition="center"
                      overlayIcon={<PlayArrow sx={{ fontSize: 20, color: BARK, ml: 0.3 }} />}
                      metaItems={[{ icon: <School sx={{ fontSize: 14, color: 'var(--awm-muted-light)' }} />, label: `${episodeCounts[show.slug] ?? 0} episodes` }]}
                    />
                  </Box>
                ))}
              </Box>
            )}

            {pageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 3, md: 5 } }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, nextPage) => goToPage(nextPage)}
                  shape="rounded"
                  siblingCount={1}
                  boundaryCount={1}
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontFamily: 'Jost, sans-serif',
                      fontWeight: 600,
                      color: MUTED,
                      border: '1px solid rgba(44,26,14,0.12)',
                      borderRadius: '8px',
                      '&:hover': { bgcolor: 'rgba(184,134,11,0.08)' },
                    },
                    '& .MuiPaginationItem-root.Mui-selected': {
                      bgcolor: '#0e2e1f',
                      color: '#fff',
                      borderColor: '#0e2e1f',
                      '&:hover': { bgcolor: '#173f2d' },
                    },
                  }}
                />
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
        {filtersPanel}
      </Drawer>
    </Box>
  )
}
