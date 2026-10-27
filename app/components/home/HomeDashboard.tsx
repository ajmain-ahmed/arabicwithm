'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdminPanelSettings,
  AutoStories,
  CheckCircleRounded,
  ExploreOutlined,
  GridOnRounded,
  Headphones,
  MenuBook,
  OndemandVideo,
  AccountCircleOutlined,
  ArrowForward,
  SettingsOutlined,
  VolunteerActivismRounded,
  AccountTreeOutlined,
  SearchOutlined,
  PsychologyOutlined,
} from '@mui/icons-material'
import { Box, Button, Container, Paper, Skeleton, Typography, useMediaQuery } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import { useColorMode } from '@/app/components/ThemeProvider'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import NewOnRow, { COMPACT_HOME_CARD_WIDTH, type CatalogueRowItem } from './NewOnRow'
import { buildContinueReadingItems, metadataReadingPositions } from './continueReadingItems'
import { useReadingProgressStore } from '@/store/readingProgressStore'
import { fetchMyList } from '@/app/actions/myList'
import { useMyListCache } from '@/store/myListStore'
import MemberActions from '@/app/components/navbar/MemberActions'
import FeaturedHero from './FeaturedHero'
import { fetchMyDisplayName } from '@/app/actions/profiles'
import type { NewOnEpisode, NewOnShow } from './catalogueRows'
import { PREMIUM, PREMIUM_BENEFITS } from '@/app/lib/entitlements'
import type { PublicBook, PublicChapter } from '@/app/actions/books'
import { fetchBooksForPublic } from '@/app/actions/books'
import type { EpisodeMeta, ShowMeta } from '@/app/lib/cartoons'
export interface FeaturedEpisode {
  show: ShowMeta
  episode: EpisodeMeta
}

const QUICK_LINKS = [
  { title: 'Search', label: 'Search shows, episodes and books', href: '/search', icon: SearchOutlined },
  { title: 'Grammar', label: 'Naḥw and Ṣarf activities', href: '/grammar', icon: AccountTreeOutlined },
  { title: 'Word Search', label: 'Find Arabic words from real transcripts', href: '/word-search', icon: GridOnRounded },
  { title: 'Explore', label: 'Browse AWM videos and reading', href: '/explore', icon: ExploreOutlined },
  { title: 'Read', label: 'Open graded books', href: '/books', icon: AutoStories },
  { title: 'Watch', label: 'Browse full episodes', href: '/cartoons', icon: Headphones },
  { title: 'Settings', label: 'Manage your learning profile', href: (userId: string) => `/profile/${userId}#profile-settings`, icon: SettingsOutlined },
  { title: 'My Profile', label: 'View your progress', href: (userId: string) => `/profile/${userId}`, icon: AccountCircleOutlined },
  { title: 'Support Us', label: 'Help us create more learning resources', href: '/support', icon: VolunteerActivismRounded },
]

export function QuickLinks({ userId, isAdmin = false }: { userId?: string; isAdmin?: boolean }) {
  const links = [
    ...QUICK_LINKS.filter(item => userId || typeof item.href === 'string'),
    ...(userId && isAdmin ? [{ title: 'Admin', label: 'Manage users and content', href: '/admin/users', icon: AdminPanelSettings }] : []),
  ]
  return (
    <Box component="nav" aria-label="Quick Actions" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(3,minmax(0,1fr))', lg: 'repeat(4,minmax(0,1fr))' }, gap: 1.5, alignItems: 'stretch' }}>
      {links.map((item) => {
        const Icon = item.icon
        const href = typeof item.href === 'function' ? item.href(userId!) : item.href
        return (
          <Paper key={item.title} component={Link} href={href} elevation={0} sx={{ minWidth: 0, minHeight: 154, height: '100%', boxSizing: 'border-box', p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textDecoration: 'none', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '12px', color: 'var(--awm-bark)', bgcolor: 'var(--awm-white)', '&:hover': { borderColor: 'color-mix(in srgb, var(--awm-gold) 55%, transparent)' } }}>
            <Icon sx={{ color: '#b8860b', fontSize: { xs: 19, md: 24 } }} />
            <Typography sx={{ mt: 1, fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700 }}>{item.title}</Typography>
            <Typography sx={{ mt: 0.25, fontFamily: 'var(--font-sans), sans-serif', color: 'var(--awm-muted)', fontSize: 12 }}>{item.label}</Typography>
          </Paper>
        )
      })}
    </Box>
  )
}

export function showRowItems(shows: NewOnShow[]): CatalogueRowItem[] {
  return shows.map((show) => ({
    key: show.id,
    href: `/cartoons/${encodeURIComponent(show.slug)}`,
    title: show.title,
    level: show.level,
    imageSrc: `/api/covers/shows/${show.id}`,
    imageCrop: show.coverCrop,
  }))
}

export function episodeRowItems(episodes: NewOnEpisode[]): CatalogueRowItem[] {
  return episodes.map((episode) => ({
    key: episode.id,
    href: `/cartoons/${encodeURIComponent(episode.showSlug)}/${encodeURIComponent(episode.slug)}`,
    title: episode.title,
    meta: episode.showTitle,
    level: episode.level,
    imageSrc: `/api/covers/episodes/${episode.id}`,
    imageCrop: episode.coverCrop,
  }))
}

/* Below-the-fold sections mount only when scrolled near (and then via a
   client-side dynamic import), so their chunks, render work and image fetches
   stay out of the LCP window entirely. The placeholders reserve each
   section's shape to keep layout stable. */
const DeferredNewOnRow = dynamic(() => import('./NewOnRow'), {
  ssr: false,
  loading: () => <DeferredRowPlaceholder />,
})
const DeferredAppDownloadSection = dynamic(() => import('./AppDownloadSection'), {
  ssr: false,
  loading: () => <DeferredAppPlaceholder />,
})

function useSectionNear(rootMargin = '500px') {
  const ref = useRef<HTMLDivElement | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || near) return
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setNear(true))
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setNear(true)
        observer.disconnect()
      }
    }, { rootMargin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [near, rootMargin])
  return { ref, near }
}

function DeferredSection({ placeholder, children }: { placeholder: React.ReactNode; children: React.ReactNode }) {
  const { ref, near } = useSectionNear()
  return <Box ref={ref}>{near ? children : placeholder}</Box>
}

function DeferredRowPlaceholder() {
  return (
    <Box role="status" aria-label="Loading content">
      <Skeleton variant="text" width={140} height={28} />
      <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.5 }, overflow: 'hidden', mt: 0.5 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" sx={{ width: COMPACT_HOME_CARD_WIDTH, maxWidth: '38vw', height: { xs: 'clamp(188px, 57.5vw, 228px)', sm: 248, md: 278, lg: 298 }, borderRadius: '10px', flexShrink: 0 }} />
        ))}
      </Box>
    </Box>
  )
}

function DeferredAppPlaceholder() {
  return (
    <Box
      role="status"
      aria-label="Loading app section"
      sx={{
        minHeight: { xs: 720, md: 520 },
        borderRadius: { xs: '18px', md: '28px' },
        bgcolor: '#0e2e1f',
        border: '1px solid rgba(212,168,67,0.22)',
      }}
    />
  )
}

export function UpgradeSection() {
  const [open, setOpen] = useState(false)
  return (
    <Box component="section" aria-labelledby="upgrade-heading" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3.5, md: 6 } }}>
      <Container maxWidth="md" disableGutters>
        <Paper elevation={0} sx={{ px: { xs: 2.5, sm: 5, md: 7 }, py: { xs: 3.5, sm: 4.5, md: 5.5 }, textAlign: 'center', border: '1px solid color-mix(in srgb, var(--awm-bark) 10%, transparent)', borderRadius: { xs: '16px', md: '20px' }, bgcolor: 'var(--awm-white)' }}>
          <Typography id="upgrade-heading" component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 30, md: 38 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.15 }}>Upgrade to AWM+</Typography>
          <Typography sx={{ mt: 1.25, mx: 'auto', maxWidth: 520, fontFamily: 'var(--font-sans), sans-serif', color: 'var(--awm-muted)', fontSize: { xs: 14, sm: 15 }, lineHeight: 1.6 }}>Take your Arabic further, wherever you like to learn.</Typography>

          <Box component="ul" sx={{ m: 0, mt: { xs: 2.5, sm: 3.5 }, p: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: { xs: 1.25, sm: 1.5 }, textAlign: 'left' }}>
            {PREMIUM_BENEFITS.map((benefit) => (
              <Box component="li" key={benefit.id} sx={{ minHeight: 48, px: 1.75, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.1, borderRadius: '10px', bgcolor: 'var(--awm-cream-light)' }}>
                <CheckCircleRounded aria-hidden="true" sx={{ flex: '0 0 auto', color: 'var(--awm-gold)', fontSize: 21 }} />
                <Typography sx={{ minWidth: 0, flex: 1, fontFamily: 'var(--font-sans), sans-serif', color: 'var(--awm-bark)', fontSize: { xs: 13.5, sm: 14.5 }, fontWeight: 600 }}>{benefit.label}</Typography>
                {benefit.appOnly && <Box component="span" sx={{ flex: '0 0 auto', px: 0.8, py: 0.35, borderRadius: '9999px', bgcolor: 'color-mix(in srgb, var(--awm-forest) 9%, transparent)', color: 'var(--awm-forest)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>📱 App only</Box>}
              </Box>
            ))}
          </Box>

          <Button variant="contained" startIcon={<AutoStories />} onClick={() => setOpen(true)} sx={{ mt: { xs: 3, sm: 4 }, width: '100%', maxWidth: 440, minHeight: { xs: 58, sm: 64 }, px: 4, borderRadius: '16px', position: 'relative', overflow: 'hidden', color: 'primary.contrastText', background: 'linear-gradient(135deg, var(--awm-gold-light), var(--awm-gold))', border: '1px solid color-mix(in srgb, var(--awm-gold-light) 75%, transparent)', fontSize: { xs: 16, sm: 18 }, fontWeight: 700, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), 0 10px 28px color-mix(in srgb, var(--awm-gold) 22%, transparent)', transition: 'transform .18s ease, box-shadow .18s ease', '&::before': { content: '\"\"', position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,.24) 46%, transparent 68%)', transform: 'translateX(-65%)', transition: 'transform .65s ease', pointerEvents: 'none' }, '&:hover': { background: 'linear-gradient(135deg, var(--awm-gold-light), var(--awm-gold))', transform: 'translateY(-2px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), 0 14px 32px color-mix(in srgb, var(--awm-gold) 30%, transparent)', '&::before': { transform: 'translateX(60%)' } }, '&:active': { transform: 'translateY(1px)', boxShadow: 'inset 0 2px 5px rgba(0,0,0,.12)' }, '&:focus-visible': { outline: '3px solid', outlineColor: 'text.primary', outlineOffset: 4 }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&::before': { transition: 'none' }, '&:hover, &:active': { transform: 'none' } } }}>Upgrade to AWM+</Button>
          <Typography sx={{ mt: 1.25, fontFamily: 'var(--font-sans), sans-serif', color: 'var(--awm-muted-light)', fontSize: 12 }}>{PREMIUM.label} · Cancel anytime</Typography>
        </Paper>
        <PremiumPrompt open={open} onClose={() => setOpen(false)} />
      </Container>
    </Box>
  )
}

export default function HomeDashboard({ books, newShows, newEpisodes, chaptersByBook, featured }: { books: PublicBook[]; featuredBook: PublicBook | null; featuredEpisode: FeaturedEpisode | null; chaptersByBook: Record<string, PublicChapter[]>; newShows: NewOnShow[]; newEpisodes: NewOnEpisode[]; featured?: import('./FeaturedHero').FeaturedShow | null }) {
  const { mode } = useColorMode()
  const { user } = useAuth()
  const isMobile=useMediaQuery('(max-width:899.95px)')
  /* My List is fetched once per session and cached in the store; show-page
     add/remove keeps the cache in sync. Saved books share the row; they are
     stored in user metadata (like reading progress), so merge them in. */
  const myListCacheItems = useMyListCache((state) => state.items)
  const setMyListCache = useMyListCache((state) => state.set)
  const myListBookSlugs = useMemo(() => {
    const value = user?.user_metadata?.my_list_books
    return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === 'string') : []
  }, [user])
  const [myListBooks, setMyListBooks] = useState<PublicBook[] | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!user?.id || myListBookSlugs.length === 0) {
      queueMicrotask(() => { if (!cancelled) setMyListBooks([]) })
      return () => { cancelled = true }
    }
    void fetchBooksForPublic()
      .then((all) => { if (!cancelled) setMyListBooks(all.filter((book) => myListBookSlugs.includes(book.slug))) })
      .catch(() => { if (!cancelled) setMyListBooks([]) })
    return () => { cancelled = true }
  }, [user, myListBookSlugs])
  const myListLoading = Boolean(user) && (myListCacheItems === null || myListBooks === null)
  const { newShowItems, newEpisodeItems } = useMemo(() => {
    return {
      newShowItems: showRowItems(newShows),
      newEpisodeItems: episodeRowItems(newEpisodes),
    }
  }, [newEpisodes, newShows])

  useEffect(() => {
    if (!user?.id || myListCacheItems !== null) return
    let cancelled = false
    void fetchMyList()
      .then((items) => {
        if (!cancelled) setMyListCache(items)
      })
      .catch((error: unknown) => {
        // Resolve to empty on failure: an unresolved cache pins the section
        // in its skeleton state forever.
        if (!cancelled) setMyListCache([])
        console.error('Unable to load My List:', error)
      })
    return () => { cancelled = true }
  }, [user?.id, myListCacheItems, setMyListCache])

  /* Continue Reading row: metadata seeds the first paint synchronously; the
     session store refines it with live page positions. */
  const trackedPositions = useReadingProgressStore((state) => state.positions)
  const continueReadingRowItems: CatalogueRowItem[] = useMemo(() => {
    if (!user) return []
    return buildContinueReadingItems(books, chaptersByBook, metadataReadingPositions(user.user_metadata), trackedPositions)
  }, [user, books, chaptersByBook, trackedPositions])
  const displayNameFallback = user ? String(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'learner') : ''
  /* The saved profile name wins over metadata/email — same source the profile
     page shows. */
  const [savedDisplayName, setSavedDisplayName] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    if (!user?.id) {
      queueMicrotask(() => { if (active) setSavedDisplayName(null) })
      return () => { active = false }
    }
    void fetchMyDisplayName()
      .then(name => { if (active) setSavedDisplayName(name) })
      .catch(() => { if (active) setSavedDisplayName(null) })
    return () => { active = false }
  }, [user?.id])
  const displayName = (savedDisplayName ?? displayNameFallback).split(' ')[0]
  const myListRowItems: CatalogueRowItem[] = useMemo(() => [
    ...(myListCacheItems ?? []).map((item) => ({
      key: item.showId,
      href: `/cartoons/${encodeURIComponent(item.slug)}`,
      title: item.title,
      level: item.level,
      imageSrc: `/api/covers/shows/${item.showId}`,
      imageCrop: item.coverCrop,
    })),
    ...(myListBooks ?? []).map((book) => ({
      key: book.id,
      href: `/books/${encodeURIComponent(book.slug)}`,
      title: book.title,
      meta: book.author,
      level: book.level,
      imageSrc: `/api/covers/books/${book.id}`,
      imageCrop: book.coverCrop,
    })),
  ], [myListCacheItems, myListBooks])
  const bookRowItems: CatalogueRowItem[] = useMemo(() => books.map((book) => ({
    key: book.id,
    href: `/books/${encodeURIComponent(book.slug)}`,
    title: book.title,
    meta: book.titleAr ?? undefined,
    level: book.level,
    imageSrc: book.cover || `/api/covers/books/${book.id}`,
    imageCrop: book.coverCrop,
  })), [books])
  const hour = new Date().getHours()
  const daypart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const greeting = `Good ${daypart}, ${displayName}!`

  return (
      <Box
        component="main"
        sx={{
          position: 'relative',
          bgcolor: 'var(--awm-cream-light)',
          /* Faint brand-mark pattern across the whole homepage. CSS-masked so
             the fill follows the theme; sits above the page background but
             below every content section. */
          '& > *': { position: 'relative', zIndex: 1 },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            bgcolor: 'var(--awm-bark)',
            opacity: { xs: 0.022, md: 0.028 },
            maskImage: 'url(/homepage/arabicwithm-notext.svg)',
            maskSize: { xs: '230px', md: '330px' },
            maskRepeat: 'repeat',
            WebkitMaskImage: 'url(/homepage/arabicwithm-notext.svg)',
            WebkitMaskSize: { xs: '230px', md: '330px' },
            WebkitMaskRepeat: 'repeat',
          },
        }}
      >
        {user && featured ? (
          <FeaturedHero show={featured.show} episode={featured.episode} episodeCount={featured.episodeCount} />
        ) : (
        <Box data-home-hero sx={{ position: 'relative', mt: { xs: 'calc(-56px - env(safe-area-inset-top))', md: 'calc(-64px - env(safe-area-inset-top))' }, minHeight: { xs: 360, md: 610 }, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          {/* Responsive AVIF set encoded from the pristine source: the browser
              picks the width per viewport/DPR, so retina screens are never
              served an upscale (plain <img>, not next/image — a custom loader
              would route through the optimizer and reintroduce its cold
              encode latency). React hoists an automatic imagesrcset preload
              from this img, so no manual link is needed. */}
          <Box
            component="img"
            src="/homepage/hero-1600.avif"
            srcSet="/homepage/hero-1200.avif 1200w, /homepage/hero-1600.avif 1600w, /homepage/hero-1920.avif 1920w"
            sizes="100vw"
            alt=""
            fetchPriority="high"
            decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
          {mode === 'dark' && <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 55%, rgba(0,0,0,0.6) 100%)' }} />}
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: { xs: 9, md: 14 }, pb: { xs: 4, md: 6 } }}>
            <Box sx={{ maxWidth: user ? 1140 : 720, mx: user ? 'auto' : 0, textAlign: user ? 'center' : 'left' }}>
              {user ? (
                <Typography component="h1" suppressHydrationWarning sx={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 40, sm: 52, md: 62 }, fontWeight: 600, lineHeight: 1.05, textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.75), 0 4px 28px rgba(0,0,0,0.55)' }}>{greeting}</Typography>
              ) : (
                <Typography component="h1" sx={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 42, sm: 54, md: 67 }, fontWeight: 600, lineHeight: 1.02, textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.75), 0 4px 28px rgba(0,0,0,0.55)' }}>Learn Arabic through cartoons and books</Typography>
              )}
              {/* Desktop surfaces streak/AWM+ in the navbar; on mobile the hero is their home. */}
              {user && (
                <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mt: 2.5 }}>
                  <MemberActions />
                </Box>
              )}
              {!user && (
                <Box sx={{ mt: 3.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  <Button component={Link} href="/cartoons" variant="contained" startIcon={<OndemandVideo />} sx={{ bgcolor: '#8b6508', color: '#fff', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#a07c0a' } }}>Start Watching</Button>
                  <Button component={Link} href="/books" variant="contained" startIcon={<MenuBook />} sx={{ bgcolor: '#8b6508', color: '#fff', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#a07c0a' } }}>Start Reading</Button>
                </Box>
              )}
            </Box>
          </Container>
        </Box>
        )}

        <Box className="awm-pattern-section" sx={{ pt: { xs: 3.5, md: 4.5 }, pb: { xs: 4, md: 5 } }}>
          {user && myListRowItems.length > 0 && (
            <Container maxWidth={false}>
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>My List</Typography>
              <NewOnRow items={myListRowItems} ariaLabel="My List" autoScroll compact />
            </Container>
          )}
          {user && continueReadingRowItems.length > 0 && (
            <Container maxWidth={false} sx={{ mt: user && myListRowItems.length > 0 ? { xs: 2.5, md: 3.25 } : 0 }}>
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Continue Reading</Typography>
              <NewOnRow items={continueReadingRowItems} ariaLabel="Continue Reading" compact />
            </Container>
          )}
          {user && myListLoading && myListRowItems.length === 0 && (
            <Container maxWidth={false} aria-label="Loading My List">
              <Skeleton variant="text" width={110} height={28} />
              <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.5 }, overflow: 'hidden', mt: 0.5 }}>
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} variant="rounded" sx={{ width: COMPACT_HOME_CARD_WIDTH, maxWidth: '38vw', height: { xs: 'clamp(188px, 57.5vw, 228px)', sm: 248, md: 278, lg: 298 }, borderRadius: '10px', flexShrink: 0 }} />
                ))}
              </Box>
            </Container>
          )}
          {user && !myListLoading && myListRowItems.length === 0 && (
            <Container maxWidth={false}>
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>My List</Typography>
              <Box
                component={Link}
                href="/cartoons?view=shows"
                /* fit-content: a block-level flex <a> would stretch to the
                   full container width and swallow clicks on the empty
                   space beside the card. */
                sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 }, mt: 1.5, textDecoration: 'none', width: 'fit-content', maxWidth: '100%' }}
              >
                <Box sx={{
                  width: COMPACT_HOME_CARD_WIDTH,
                  maxWidth: '38vw',
                  height: { xs: 'clamp(188px, 57.5vw, 228px)', sm: 248, md: 278, lg: 298 },
                  flexShrink: 0,
                  borderRadius: '10px',
                  border: '1.5px dashed color-mix(in srgb, var(--awm-bark) 38%, transparent)',
                  bgcolor: 'color-mix(in srgb, var(--awm-bark) 5%, transparent)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--awm-muted)',
                  transition: 'border-color .2s ease, color .2s ease, transform .2s ease',
                  '&:hover': { borderColor: 'var(--awm-gold)', color: 'var(--awm-gold)', transform: 'translateY(-3px)' },
                }}>
                  <ArrowForward sx={{ fontSize: 34 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 21, md: 26 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.25 }}>
                    Start adding shows to your list!
                  </Typography>
                  <Typography sx={{ mt: 0.75, fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 13, md: 14.5 }, color: 'var(--awm-muted)', lineHeight: 1.55 }}>
                    Tap to explore the catalogue and keep every show you love one click away.
                  </Typography>
                </Box>
              </Box>
            </Container>
          )}
          <Container maxWidth={false} sx={user ? { mt: { xs: 2.5, md: 3.25 } } : undefined}>
            {newShowItems.length > 0 && <>
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Shows</Typography>
              <NewOnRow items={newShowItems} ariaLabel="Shows" autoScroll compact />
            </>}
            {newEpisodeItems.length > 0 && <>
              <Typography component="h2" sx={{ mt: { xs: 2.5, md: 3.25 }, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Latest Episodes</Typography>
              <DeferredSection placeholder={<DeferredRowPlaceholder />}>
                <DeferredNewOnRow items={newEpisodeItems} ariaLabel="Latest Episodes" autoScroll compact />
              </DeferredSection>
            </>}
            {bookRowItems.length > 0 && <>
              <Typography component="h2" sx={{ mt: { xs: 2.5, md: 3.25 }, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Books</Typography>
              <DeferredSection placeholder={<DeferredRowPlaceholder />}>
                <DeferredNewOnRow items={bookRowItems} ariaLabel="Books" autoScroll compact />
              </DeferredSection>
            </>}
          </Container>

          {/* Mobile-only section: the Quick Actions grid and the mobile Continue
              Reading card have no desktop presentation. */}
          <Container maxWidth={false} sx={{ display: { xs: 'block', md: 'none' }, mt: 3 }}>
            {user&&isMobile&&continueReadingRowItems.length===0&&<Box sx={{mb:3}}><Button component={Link} href="/books" variant="outlined" sx={{minHeight:44,textTransform:'none',borderRadius:'999px'}}>Start Reading</Button></Box>}
            <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600, color: 'var(--awm-bark)' }}>Quick Actions</Typography>
            <Box component="nav" aria-label="Quick Actions" data-mobile-home-actions sx={{ display: 'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))',gridAutoRows:'1fr',gap:1.5,mt:1.5 }}>
              {[
                { title: 'Memory', href: '/memory', Icon: PsychologyOutlined },
                { title: 'Grammar', href: '/grammar', Icon: AccountTreeOutlined },
                { title: 'Word Search', href: '/word-search', Icon: GridOnRounded },
                { title: 'Explore', href: '/explore', Icon: ExploreOutlined },
              ].map(({ title, href, Icon }) => <Paper key={href} component={Link} href={href} elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 76, p: 2, borderRadius: '10px', textDecoration: 'none', color: 'var(--awm-bark)', bgcolor: 'var(--awm-white)', border: '1px solid color-mix(in srgb, var(--awm-gold) 25%, transparent)', '&:focus-visible': { outline: '2px solid var(--awm-gold)', outlineOffset: 2 } }}><Icon sx={{ color: 'var(--awm-gold)' }} /><Typography sx={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14 }}>{title}</Typography></Paper>)}
            </Box>
          </Container>

          <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 7 }, mb: { xs: 5, md: 7 } }}>
            <DeferredSection placeholder={<DeferredAppPlaceholder />}>
              <DeferredAppDownloadSection />
            </DeferredSection>
          </Container>
        </Box>
      </Box>
  )
}
