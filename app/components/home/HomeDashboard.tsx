'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
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
  SettingsOutlined,
  VolunteerActivismRounded,
  AccountTreeOutlined,
  SearchOutlined,
} from '@mui/icons-material'
import { Box, Button, Container, Paper, Skeleton, Typography } from '@mui/material'
import { useColorMode } from '@/app/components/ThemeProvider'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import CefrChip from '@/app/components/CefrChip'
import NewOnRow, { COMPACT_HOME_CARD_WIDTH, HOME_CAROUSEL_CARD_ASPECT_RATIO, type CatalogueRowItem } from './NewOnRow'
import AppDownloadSection from './AppDownloadSection'
import type { NewOnEpisode, NewOnShow } from './catalogueRows'
import { PREMIUM, PREMIUM_BENEFITS } from '@/app/lib/entitlements'
import type { PublicBook, PublicChapter } from '@/app/actions/books'
import type { EpisodeMeta, ShowMeta } from '@/app/lib/cartoons'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'

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
  { title: 'My Profile', label: 'View your progress and achievements', href: (userId: string) => `/profile/${userId}`, icon: AccountCircleOutlined },
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

function BookCard({ book }: { book: PublicBook }) {
  const [loaded, setLoaded] = useState(false)
  /* Reveal immediately when the SSR'd image finished before hydration
     attached onLoad, otherwise it stays stuck invisible. */
  const coverImgRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true)
  }, [])
  return (
    <Paper
      component={Link}
      href={`/books/${encodeURIComponent(book.slug)}`}
      elevation={0}
      sx={{
        position: 'relative',
        display: 'block',
        width: COMPACT_HOME_CARD_WIDTH,
        maxWidth: '100%',
        aspectRatio: HOME_CAROUSEL_CARD_ASPECT_RATIO,
        justifySelf: 'center',
        minWidth: 0,
        overflow: 'hidden',
        color: '#fff',
        textDecoration: 'none',
        border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)',
        borderRadius: { xs: '10px', sm: '14px' },
        bgcolor: '#0e2e1f',
        transition: 'transform .2s ease, box-shadow .2s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 32px color-mix(in srgb, var(--awm-bark) 12%, transparent)' },
      }}
    >
      {!loaded && <Skeleton variant="rectangular" animation="wave" sx={{ position: 'absolute', inset: 0, zIndex: 1, bgcolor: 'color-mix(in srgb, var(--awm-bark) 8%, transparent)' }} />}
      <Box
        component="img"
        ref={coverImgRef}
        src={book.cover || `/api/covers/books/${book.id}`}
        alt={book.titleAr ? `${book.title} — ${book.titleAr}` : book.title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true)
          e.currentTarget.style.display = 'none'
        }}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease', ...thumbnailCropCss(book.coverCrop) }}
      />
      <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,23,15,0.04) 22%, rgba(5,23,15,0.94) 100%)' }} />
      <Box sx={{ position: 'absolute', zIndex: 2, left: 0, right: 0, bottom: 0, p: { xs: 1, sm: 1.25 }, minWidth: 0 }}>
        <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: '0.88rem', sm: '1rem' }, fontWeight: 700, color: '#fff', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,.55)' }}>{book.title}</Typography>
        {book.titleAr && (
          <Typography lang="ar" dir="rtl" sx={{ mt: 0.15, fontFamily: 'var(--font-serif)', fontSize: { xs: '0.75rem', sm: '0.85rem' }, color: 'rgba(255,255,255,.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{book.titleAr}</Typography>
        )}
        {book.level && <CefrChip size="small" level={book.level} sx={{ mt: 0.65, height: 18, borderRadius: '9999px', fontSize: '0.6rem' }} />}
      </Box>
    </Paper>
  )
}

function BooksSection({ books }: { books: PublicBook[] }) {
  if (books.length === 0) return null
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: { xs: 1, md: 1.5 } }}>
      {books.slice(0, 4).map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </Box>
  )
}

export default function HomeDashboard({ books, newShows, newEpisodes }: { books: PublicBook[]; featuredBook: PublicBook | null; featuredEpisode: FeaturedEpisode | null; chaptersByBook: Record<string, PublicChapter[]>; newShows: NewOnShow[]; newEpisodes: NewOnEpisode[] }) {
  const { mode } = useColorMode()
  const { newShowItems, newEpisodeItems } = useMemo(() => {
    return {
      newShowItems: showRowItems(newShows),
      newEpisodeItems: episodeRowItems(newEpisodes),
    }
  }, [newEpisodes, newShows])

  /* Signed-in users currently see the same homepage as guests. The
     personalised dashboard lives in SignedInHome.tsx (set aside, not
     rendered) until we bring it back. */
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
        <Box sx={{ position: 'relative', mt: { xs: 'calc(-56px - env(safe-area-inset-top))', md: 'calc(-64px - env(safe-area-inset-top))' }, minHeight: { xs: 520, md: 610 }, display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundImage: 'url(/homepage/hero.avif)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          {mode === 'dark' && <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 55%, rgba(0,0,0,0.6) 100%)' }} />}
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: { xs: 12, md: 14 }, pb: { xs: 5, md: 6 } }}>
            <Box sx={{ maxWidth: 720 }}>
              <Typography component="h1" sx={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 42, sm: 54, md: 67 }, fontWeight: 600, lineHeight: 1.02, textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.75), 0 4px 28px rgba(0,0,0,0.55)' }}>Learn Arabic through cartoons and books</Typography>
              <Box sx={{ mt: 3.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button component={Link} href="/cartoons" variant="contained" startIcon={<OndemandVideo />} sx={{ bgcolor: '#8b6508', color: '#fff', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#a07c0a' } }}>Start Watching</Button>
                <Button component={Link} href="/books" variant="contained" startIcon={<MenuBook />} sx={{ bgcolor: '#8b6508', color: '#fff', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#a07c0a' } }}>Start Reading</Button>
              </Box>
            </Box>
          </Container>
        </Box>

        <Box className="awm-pattern-section" sx={{ pt: { xs: 3.5, md: 4.5 }, pb: { xs: 4, md: 5 } }}>
          <Container maxWidth={false}>
            {newShowItems.length > 0 && <>
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Shows</Typography>
              <NewOnRow items={newShowItems} ariaLabel="Shows" autoScroll compact />
            </>}
            {newEpisodeItems.length > 0 && <>
              <Typography component="h2" sx={{ mt: { xs: 2.5, md: 3.25 }, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Latest Episodes</Typography>
              <NewOnRow items={newEpisodeItems} ariaLabel="Latest Episodes" autoScroll compact />
            </>}
          </Container>

          <Container maxWidth={false} sx={{ mt: { xs: 4, md: 5 } }}>
            {/* Fluid row: fills one line on wide screens, wraps only when the
                catalogue outgrows the width; centred so the heading aligns. */}
            <Box sx={{ maxWidth: 2200, mx: 'auto' }}>
              <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2, textAlign: 'center' }}>Featured books in Arabic &amp; English</Typography>
              <Box sx={{ mt: 2 }}>
                <BooksSection books={books} />
              </Box>
            </Box>
          </Container>

          <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 7 }, mb: { xs: 5, md: 7 } }}>
            <AppDownloadSection />
          </Container>
        </Box>
      </Box>
  )
}
