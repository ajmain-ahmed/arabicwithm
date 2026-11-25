'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import PhraseOfTheDay from './PhraseOfTheDay'
import type { DailyPhrase } from '@/app/lib/dailyPhrase'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  ExploreOutlined,
  GridOnRounded,
  ArrowForward,
  AccountTreeOutlined,
  PsychologyOutlined,
} from '@mui/icons-material'
import { Box, Container, Paper, Skeleton, Typography } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import HomeForYouSpotlight from './HomeForYouSpotlight'
import type {ForYouClip} from '@/app/lib/forYou'
import NewOnRow, { COMPACT_HOME_CARD_WIDTH, type CatalogueRowItem } from './NewOnRow'
import { useBookMyList } from '@/app/lib/bookMyList'
import CheckoutReturnNotice from './CheckoutReturnNotice'
import AwmPromoSection from './AwmPromoSection'
import { fetchMyList } from '@/app/actions/myList'
import { useMyListCache } from '@/store/myListStore'
import FeaturedCarousel from './FeaturedCarousel'
import type { NewOnEpisode, NewOnShow } from './catalogueRows'
import type { PublicBook } from '@/app/actions/books'


/* Catalogue rows paint at most this many cards. The shows/episodes queries
   already limit to 12; books are sliced here to match so the homepage's
   image count stays flat as the catalogue grows. */
const HOME_ROW_LIMIT = 12
const subscribeHydration=()=>()=>{}

export function showRowItems(shows: NewOnShow[]): CatalogueRowItem[] {
  return shows.map((show) => ({
    key: show.id,
    href: `/cartoons/${encodeURIComponent(show.slug)}`,
    title: show.title,
    titleAr:show.titleAr,
    level: show.level,
    imageSrc: show.cover ?? `/api/covers/shows/${show.id}`,
    imageCrop: show.coverCrop,
  }))
}

export function episodeRowItems(episodes: NewOnEpisode[]): CatalogueRowItem[] {
  return episodes.map((episode) => ({
    key: episode.id,
    href: `/cartoons/${encodeURIComponent(episode.showSlug)}/${encodeURIComponent(episode.slug)}`,
    title: episode.title,
    titleAr:episode.titleAr,
    meta: episode.showTitle,
    metaAr:episode.showTitleAr,
    level: episode.level,
    imageSrc: episode.cover ?? `/api/covers/episodes/${episode.id}`,
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
 const {t:awmT}=useWebsiteLocale()

  return (
    <Box role="status" aria-label={awmT("Loading content")}>
      <Skeleton variant="text" width={140} height={28} />
      <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.5 }, overflow: 'hidden', mt: 0.5 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" sx={{ width: COMPACT_HOME_CARD_WIDTH, maxWidth: '38vw', height: { xs: 'clamp(188px, 57.5vw, 228px)', sm: 248, md: 278, lg: 298 }, borderRadius: '10px', flexShrink: 0 }} />
        ))}
      </Box>
    </Box>
  )
}

export default function HomeDashboard({ books, homepageBooks = books, newShows, newEpisodes, featured, showFeatured = true, spotlight, spotlightArea, dailyPhrase = null }: { showFeatured?: boolean; spotlightArea?: React.ReactNode; dailyPhrase?: DailyPhrase | null; books: PublicBook[]; homepageBooks?: PublicBook[]; newShows: NewOnShow[]; newEpisodes: NewOnEpisode[]; spotlight?:{clip:ForYouClip|null;error:boolean}; featured?: import('./FeaturedHero').FeaturedShow | import('./FeaturedHero').FeaturedShow[] | null }) {
 const {t:awmT}=useWebsiteLocale()

  const featuredItems=Array.isArray(featured)?featured:featured?[featured]:[]
  const auth=useAuth(),hydrated=useSyncExternalStore(subscribeHydration,()=>true,()=>false)
  // This Suspense boundary may hydrate after the parent has resolved Auth.
  // Match its server snapshot before inserting signed-in/guest-only sections.
  const user=hydrated?auth.user:null,authLoading=!hydrated||auth.loading
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
  const bookRowItems: CatalogueRowItem[] = useMemo(() => homepageBooks.slice(0, HOME_ROW_LIMIT).map((book) => ({
    key: book.id,
    book,
    href: `/books/${encodeURIComponent(book.slug)}`,
    title: book.title,
    meta: book.titleAr ?? undefined,
    level: book.level,
    imageSrc: book.cover || `/api/covers/books/${book.id}`,
    imageCrop: book.coverCrop,
  })), [homepageBooks])
  return (
      <Box
        component="div"
        sx={{
          position: 'relative',
          bgcolor: 'var(--awm-cream-light)',
        }}
      >
        {showFeatured && <>
          <Typography component="h1" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}><UiText>{"Learn Arabic through cartoons and books"}</UiText></Typography>
          <FeaturedCarousel key={featuredItems.map(item => item.show.id).join(':')} items={featuredItems} />
        </>}

        <Box className="awm-pattern-section" sx={{ pt: { xs: 3.5, md: 4.5 }, pb: { xs: 3, md: 5 } }}>
          {user && <CheckoutReturnNotice userId={user.id} />}
          {user && myListRowItems.length > 0 && (
            <Container maxWidth={false}>
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}><UiText>{"My List"}</UiText></Typography>
              <NewOnRow items={myListRowItems} ariaLabel="My List" compact scrollHint />
            </Container>
          )}
          {user && myListLoading && myListRowItems.length === 0 && (
            <Container maxWidth={false} aria-label={awmT("Loading My List")}>
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
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}><UiText>{"My List"}</UiText></Typography>
              <Box
                component={Link} prefetch={false}
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
                    <UiText>{"Start adding shows to your list!"}</UiText></Typography>
                  <Typography sx={{ mt: 0.75, fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 13, md: 14.5 }, color: 'var(--awm-muted)', lineHeight: 1.55 }}>
                    <UiText>{"Tap to explore the catalogue and keep every show you love one click away."}</UiText></Typography>
                </Box>
              </Box>
            </Container>
          )}
          <Container maxWidth={false} sx={user ? { mt: { xs: 2.5, md: 3.25 } } : undefined}>
            {newEpisodeItems.length > 0 && <>
              <Typography component="h2" sx={{ mt: { xs: 2.5, md: 3.25 }, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}><UiText>{"Latest Episodes"}</UiText></Typography>
              <DeferredSection placeholder={<DeferredRowPlaceholder />}>
                <DeferredNewOnRow items={newEpisodeItems} ariaLabel="Latest Episodes" compact viewAllHref="/cartoons" />
              </DeferredSection>
            </>}
            {spotlightArea ?? <HomeForYouSpotlight initialClip={spotlight?.clip??null} initialError={spotlight?.error}/>}
            {newShowItems.length > 0 && <>
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}><UiText>{"Shows"}</UiText></Typography>
              <NewOnRow items={newShowItems} ariaLabel="Shows" compact viewAllHref="/cartoons?view=shows" />
            </>}
            {bookRowItems.length > 0 && <>
              <Typography component="h2" sx={{ mt: { xs: 2.5, md: 3.25 }, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}><UiText>{"Books"}</UiText></Typography>
              <DeferredSection placeholder={<DeferredRowPlaceholder />}>
                <DeferredNewOnRow items={bookRowItems} ariaLabel="Books" compact viewAllHref="/books" />
              </DeferredSection>
            </>}
          </Container>

          <Box sx={{display:'flex',flexDirection:'column'}}>
          {/* Mobile-only Quick Actions. */}
          <Container maxWidth={false} sx={{ display: { xs: 'block', md: 'none' }, mt: 3 }}>
            <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600, color: 'var(--awm-bark)' }}><UiText>{"Quick Actions"}</UiText></Typography>
            <Box component="nav" aria-label={awmT("Quick Actions")} data-mobile-home-actions sx={{ display: 'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))',gridAutoRows:'1fr',gap:1.5,mt:1.5 }}>
              {[
                { title: "Memory", href: '/memory', Icon: PsychologyOutlined },
                { title: "Grammar", href: '/grammar', Icon: AccountTreeOutlined },
                { title: "Word Search", href: '/word-search', Icon: GridOnRounded },
                { title: "Explore", href: '/explore', Icon: ExploreOutlined },
              ].map(({ title, href, Icon }) => <Paper key={href} component={Link} prefetch={false} href={href} elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 76, p: 2, borderRadius: '10px', textDecoration: 'none', color: 'var(--awm-bark)', bgcolor: 'var(--awm-white)', border: '1px solid color-mix(in srgb, var(--awm-gold) 25%, transparent)', '&:focus-visible': { outline: '2px solid var(--awm-gold)', outlineOffset: 2 } }}><Icon sx={{ color: 'var(--awm-gold)' }} /><Typography sx={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14 }}><UiText>{title}</UiText></Typography></Paper>)}
            </Box>
          </Container>
          <Container maxWidth={false} sx={{ display: { xs: 'block', sm: 'none' } }}>
            <PhraseOfTheDay phrase={dailyPhrase} />
          </Container>
          <Box sx={{order:{xs:1,md:-1}}}>
            {!authLoading && <AwmPromoSection key={user?.id??"guest"} userId={user?.id} placement="home" />}
          </Box>
          </Box>
        </Box>
      </Box>
  )
}
