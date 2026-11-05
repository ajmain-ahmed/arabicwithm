'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ExploreOutlined,
  GridOnRounded,
  MenuBook,
  OndemandVideo,
  ArrowForward,
  AccountTreeOutlined,
  PsychologyOutlined,
} from '@mui/icons-material'
import { Box, Button, Container, Paper, Skeleton, Typography } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import { useColorMode } from '@/app/components/ThemeProvider'
import NewOnRow, { COMPACT_HOME_CARD_WIDTH, type CatalogueRowItem } from './NewOnRow'
import { useBookMyList } from '@/app/lib/bookMyList'
import AppDownloadSection from './AppDownloadSection'
import { fetchMyList } from '@/app/actions/myList'
import { useMyListCache } from '@/store/myListStore'
import MemberActions from '@/app/components/navbar/MemberActions'
import FeaturedHero from './FeaturedHero'
import { fetchMyDisplayName } from '@/app/actions/profiles'
import type { NewOnEpisode, NewOnShow } from './catalogueRows'
import type { PublicBook } from '@/app/actions/books'


/* Catalogue rows paint at most this many cards. The shows/episodes queries
   already limit to 12; books are sliced here to match so the homepage's
   image count stays flat as the catalogue grows. */
const HOME_ROW_LIMIT = 12

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

/* Below-the-fold rows mount only when scrolled near (and then via a
   client-side dynamic import), so their chunks, render work and image fetches
   stay out of the LCP window entirely. The placeholder reserves the row's
   shape to keep layout stable. */
const DeferredNewOnRow = dynamic(() => import('./NewOnRow'), {
  ssr: false,
  loading: () => <DeferredRowPlaceholder />,
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

export default function HomeDashboard({ books, newShows, newEpisodes, featured }: { books: PublicBook[]; newShows: NewOnShow[]; newEpisodes: NewOnEpisode[]; featured?: import('./FeaturedHero').FeaturedShow | null }) {
  const { mode } = useColorMode()
  const { user, loading: authLoading } = useAuth()
  // Membership alone defines active reading. Positions remain resume history.
  const myListCacheItems = useMyListCache((state) => state.items)
  const setMyListCache = useMyListCache((state) => state.set)
  const myListBookSlugs = useBookMyList(user)
  const myListBooks = books.filter(book => myListBookSlugs.includes(book.slug))
  const myListLoading = Boolean(user) && myListCacheItems === null
  const { newShowItems, newEpisodeItems } = useMemo(() => {
    return {
      newShowItems: showRowItems(newShows).slice(0, HOME_ROW_LIMIT),
      newEpisodeItems: episodeRowItems(newEpisodes).slice(0, HOME_ROW_LIMIT),
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
      book,
      href: `/books/${encodeURIComponent(book.slug)}`,
      title: book.title,
      meta: book.author,
      level: book.level,
      imageSrc: `/api/covers/books/${book.id}`,
      imageCrop: book.coverCrop,
    })),
  ], [myListCacheItems, myListBooks])
  const bookRowItems: CatalogueRowItem[] = useMemo(() => books.slice(0, HOME_ROW_LIMIT).map((book) => ({
    key: book.id,
    book,
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
        }}
      >
        {featured ? (
          <FeaturedHero {...featured} />
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

        <Box className="awm-pattern-section" sx={{ pt: { xs: 3.5, md: 4.5 }, pb: { xs: 2, md: 5 } }}>
          {user && myListRowItems.length > 0 && (
            <Container maxWidth={false}>
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>My List</Typography>
              <NewOnRow items={myListRowItems} ariaLabel="My List" compact scrollHint />
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
              <NewOnRow items={newShowItems} ariaLabel="Shows" compact viewAllHref="/cartoons?view=shows" />
            </>}
            {newEpisodeItems.length > 0 && <>
              <Typography component="h2" sx={{ mt: { xs: 2.5, md: 3.25 }, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Latest Episodes</Typography>
              <DeferredSection placeholder={<DeferredRowPlaceholder />}>
                <DeferredNewOnRow items={newEpisodeItems} ariaLabel="Latest Episodes" compact viewAllHref="/cartoons" />
              </DeferredSection>
            </>}
            {bookRowItems.length > 0 && <>
              <Typography component="h2" sx={{ mt: { xs: 2.5, md: 3.25 }, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Books</Typography>
              <DeferredSection placeholder={<DeferredRowPlaceholder />}>
                <DeferredNewOnRow items={bookRowItems} ariaLabel="Books" compact viewAllHref="/books" />
              </DeferredSection>
            </>}
          </Container>

          {/* Mobile-only Quick Actions. */}
          <Container maxWidth={false} sx={{ display: { xs: 'block', md: 'none' }, mt: 3 }}>
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
          {!authLoading && !user && <Container maxWidth="lg" sx={{ mt: { xs: 3, md: 4 } }}><AppDownloadSection /></Container>}
        </Box>
      </Box>
  )
}
