'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AccessTimeRounded,
  ArrowForward,
  AutoStories,
  Bookmark,
  ExploreOutlined,
  Headphones,
  LocalFireDepartmentRounded,
  MenuBook,
  Movie,
} from '@mui/icons-material'
import { Box, Button, Chip, CircularProgress, Container, LinearProgress, Paper, Typography } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import type { PublicBook, PublicChapter } from '@/app/actions/books'
import type { EpisodeMeta, ShowMeta } from '@/app/lib/cartoons'
import {
  LEARNING_ACTIVITY_EVENT,
  calculateLearningStreak,
  formatLearningTime,
  parseLearningActivity,
  type LearningActivity,
} from '@/app/lib/activity'
import {
  BOOK_SENTENCE_BOOKMARK_EVENT,
  BOOK_SENTENCE_BOOKMARK_STORAGE_KEY,
  bookSentenceBookmarkHref,
  latestBookSentenceBookmark,
  parseBookSentenceBookmark,
  type BookSentenceBookmark,
} from '@/app/lib/bookSentenceBookmark'

interface ProgressEntry { chapterSlug: string; updatedAt?: string }
interface FeaturedEpisode {
  show: ShowMeta
  episode: EpisodeMeta
}
interface ActivityUpdate { userId: string; activity: LearningActivity }

const LEARNING_AREAS = [
  { title: 'Explore', body: 'Scroll through randomized Arabic clips and discover your next episode.', href: '/explore', icon: ExploreOutlined },
  { title: 'Watch', body: 'Watch entertaining Arabic content with interactive subtitles.', href: '/cartoons', icon: Movie },
  { title: 'Read', body: 'Read graded Arabic stories at a comfortable pace.', href: '/books', icon: MenuBook },
]

const QUICK_LINKS = [
  { title: 'Explore', label: 'Discover a random clip', href: '/explore', icon: ExploreOutlined },
  { title: 'Read', label: 'Open graded books', href: '/books', icon: AutoStories },
  { title: 'Watch', label: 'Browse full episodes', href: '/cartoons', icon: Headphones },
]

function openAuth(mode: 'register' | 'signin') {
  window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode } }))
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      {eyebrow && <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{eyebrow}</Typography>}
      <Typography component="h2" sx={{ mt: eyebrow ? 0.5 : 0, fontFamily: 'var(--font-heading)', fontSize: { xs: 30, md: 39 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.15 }}>{title}</Typography>
      {detail && <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', lineHeight: 1.65 }}>{detail}</Typography>}
    </Box>
  )
}

function LearningAreaCards() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' }, gap: 2 }}>
      {LEARNING_AREAS.map((area) => {
        const Icon = area.icon
        return (
          <Paper key={area.title} component={Link} href={area.href} elevation={0} sx={{ p: { xs: 2.25, sm: 2.75 }, color: 'inherit', textDecoration: 'none', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '13px', bgcolor: 'var(--awm-white)', transition: 'transform .2s ease, box-shadow .2s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 30px color-mix(in srgb, var(--awm-bark) 10%, transparent)' } }}>
            <Box sx={{ width: { xs: 38, sm: 44 }, height: { xs: 38, sm: 44 }, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(184,134,11,0.1)', color: '#b8860b' }}><Icon sx={{ fontSize: { xs: 20, sm: 24 } }} /></Box>
            <Typography sx={{ mt: { xs: 1.5, sm: 2 }, fontFamily: 'var(--font-heading)', fontSize: { xs: 22, sm: 24 }, fontWeight: 600, color: 'var(--awm-bark)' }}>{area.title}</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: 'Jost, sans-serif', fontSize: 14, color: 'var(--awm-muted)', lineHeight: 1.6 }}>{area.body}</Typography>
          </Paper>
        )
      })}
    </Box>
  )
}

function QuickLinks() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' }, gap: 1.5 }}>
      {QUICK_LINKS.map((item) => {
        const Icon = item.icon
        return (
          <Paper key={item.title} component={Link} href={item.href} elevation={0} sx={{ p: { xs: 2, md: 2.5 }, textDecoration: 'none', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '12px', color: 'var(--awm-bark)', bgcolor: 'var(--awm-white)', '&:hover': { borderColor: 'color-mix(in srgb, var(--awm-gold) 55%, transparent)' } }}>
            <Icon sx={{ color: '#b8860b', fontSize: { xs: 19, md: 24 } }} />
            <Typography sx={{ mt: 1, fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>{item.title}</Typography>
            <Typography sx={{ mt: 0.25, fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted)', fontSize: 12 }}>{item.label}</Typography>
          </Paper>
        )
      })}
    </Box>
  )
}

function ContentCard({ type, title, titleAr, description, level, href, image, actionLabel = 'Explore' }: { type: string; title: string; titleAr?: string; description?: string; level?: string; href: string; image?: string; actionLabel?: string }) {
  return (
    <Paper elevation={0} sx={{ display: 'grid', gridTemplateColumns: { xs: '110px minmax(0,1fr)', sm: '180px minmax(0,1fr)' }, minHeight: 220, overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '14px', bgcolor: 'var(--awm-white)' }}>
      {image ? <Box component="img" src={image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Box sx={{ display: 'grid', placeItems: 'center', bgcolor: '#0e2e1f' }}><AutoStories sx={{ color: '#d4a843', fontSize: { xs: 34, sm: 46 } }} /></Box>}
      <Box sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
        <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{type}</Typography>
        {titleAr && <Typography lang="ar" dir="rtl" sx={{ mt: 0.5, fontFamily: '"EB Garamond", Georgia, serif', fontSize: 23, fontWeight: 700, color: 'var(--awm-bark)', textAlign: 'left' }}>{titleAr}</Typography>}
        <Typography sx={{ mt: titleAr ? 0 : 0.75, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, sm: 24 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>{title}</Typography>
        {description && <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 13, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{description}</Typography>}
        {level && <Chip size="small" label={level} sx={{ mt: 1.5, bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508', fontWeight: 700 }} />}
        <Button component={Link} href={href} endIcon={<ArrowForward sx={{ fontSize: { xs: 17, sm: 20 } }} />} sx={{ display: 'flex', width: 'fit-content', mt: 1.5, px: 0, color: '#0e2e1f', fontWeight: 700, textTransform: 'none' }}>{actionLabel}</Button>
      </Box>
    </Paper>
  )
}

function BookmarkContinueCard({ bookmark }: { bookmark: BookSentenceBookmark }) {
  return (
    <Paper elevation={0} sx={{ minHeight: 220, p: { xs: 2.5, sm: 3.5 }, border: '1px solid color-mix(in srgb, var(--awm-gold) 30%, transparent)', borderRadius: '14px', bgcolor: 'var(--awm-white)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--awm-gold)' }}>
        <Bookmark sx={{ fontSize: 20 }} />
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Your reading bookmark
        </Typography>
      </Box>
      <Typography lang="ar" dir="rtl" sx={{ mt: 2, fontFamily: 'var(--font-serif)', fontSize: { xs: 24, sm: 28 }, fontWeight: 600, lineHeight: 1.75, color: 'var(--awm-bark)', textAlign: 'right' }}>
        {bookmark.arabic}
      </Typography>
      {bookmark.translation && (
        <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 14, lineHeight: 1.6 }}>
          {bookmark.translation}
        </Typography>
      )}
      <Typography sx={{ mt: 1, color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 600 }}>
        {bookmark.bookTitle} · {bookmark.chapterTitle}
      </Typography>
      <Button component={Link} href={bookSentenceBookmarkHref(bookmark)} endIcon={<ArrowForward />} sx={{ mt: 'auto', pt: 2, px: 0, width: 'fit-content', color: 'var(--awm-forest)', fontWeight: 700, textTransform: 'none' }}>
        Continue from bookmark
      </Button>
    </Paper>
  )
}

function LearningStats({ totalSeconds, streak }: { totalSeconds: number; streak: number }) {
  const stats = [
    { label: 'Learning time', detail: 'Active study', value: formatLearningTime(totalSeconds), icon: AccessTimeRounded, colour: '#0e2e1f', background: 'rgba(14,46,31,0.09)' },
    { label: 'Current streak', detail: streak === 1 ? '1 active day' : `${streak} active days`, value: `${streak}d`, icon: LocalFireDepartmentRounded, colour: '#c66a28', background: 'rgba(198,106,40,0.1)' },
  ]

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3, md: 3.5 }, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '15px', bgcolor: 'var(--awm-white)' }}>
      <Box sx={{ mb: { xs: 2.25, md: 3 }, display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase' }}>At a glance</Typography>
          <Typography component="h2" sx={{ mt: 0.4, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 27, md: 32 }, fontWeight: 600, lineHeight: 1.15 }}>Your learning activity</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: { xs: 1, sm: 1.5 } }}>
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Box key={stat.label} sx={{ minWidth: 0, p: { xs: 1.5, sm: 2 }, borderRadius: '11px', bgcolor: 'var(--awm-cream-light)' }}>
              <Box sx={{ width: { xs: 30, sm: 34 }, height: { xs: 30, sm: 34 }, display: 'grid', placeItems: 'center', borderRadius: '9px', color: stat.colour, bgcolor: stat.background }}>
                <Icon sx={{ fontSize: { xs: 17, sm: 19 } }} />
              </Box>
              <Typography sx={{ mt: 1.25, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 25, sm: 30 }, fontWeight: 600, lineHeight: 1 }}>{stat.value}</Typography>
              <Typography sx={{ mt: 0.8, color: 'var(--awm-bark)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 11, sm: 12 }, fontWeight: 700 }}>{stat.label}</Typography>
              <Typography sx={{ mt: 0.2, color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 9.5, sm: 10.5 }, lineHeight: 1.35 }}>{stat.detail}</Typography>
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}

export default function HomeDashboard({ books, featuredBook, featuredEpisode, chaptersByBook }: { books: PublicBook[]; featuredBook: PublicBook | null; featuredEpisode: FeaturedEpisode | null; chaptersByBook: Record<string, PublicChapter[]> }) {
  const { user, loading } = useAuth()
  const [activityUpdate, setActivityUpdate] = useState<ActivityUpdate | null>(null)
  const [bookmark, setBookmark] = useState<BookSentenceBookmark | null>(null)
  const [dashboardLoadedAt] = useState(Date.now)
  const progress = useMemo(() => {
    const raw = user?.user_metadata?.book_progress
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, ProgressEntry> : {}
  }, [user])
  const recentReading = (() => {
    const entries = Object.entries(progress).sort((a, b) => Date.parse(b[1].updatedAt ?? '') - Date.parse(a[1].updatedAt ?? ''))
    for (const [bookSlug, saved] of entries) {
      const book = books.find((item) => item.slug === bookSlug)
      const chapter = chaptersByBook[bookSlug]?.find((item) => item.slug === saved.chapterSlug)
      if (book && chapter) return { book, chapter }
    }
    return null
  })()

  useEffect(() => {
    const handleActivityUpdate = (event: Event) => {
      setActivityUpdate((event as CustomEvent<ActivityUpdate>).detail)
    }
    window.addEventListener(LEARNING_ACTIVITY_EVENT, handleActivityUpdate)
    return () => window.removeEventListener(LEARNING_ACTIVITY_EVENT, handleActivityUpdate)
  }, [])

  useEffect(() => {
    const readBookmark = (event?: Event) => {
      let localBookmark: BookSentenceBookmark | null = null
      try {
        localBookmark = parseBookSentenceBookmark(window.localStorage.getItem(BOOK_SENTENCE_BOOKMARK_STORAGE_KEY))
      } catch {
        // Signed-in account metadata can still provide the bookmark.
      }
      const eventBookmark = event instanceof CustomEvent
        ? parseBookSentenceBookmark(event.detail)
        : null
      const accountBookmark = parseBookSentenceBookmark(user?.user_metadata?.book_sentence_bookmark)
      setBookmark(latestBookSentenceBookmark(latestBookSentenceBookmark(localBookmark, accountBookmark), eventBookmark))
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BOOK_SENTENCE_BOOKMARK_STORAGE_KEY) readBookmark()
    }

    readBookmark()
    window.addEventListener(BOOK_SENTENCE_BOOKMARK_EVENT, readBookmark)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(BOOK_SENTENCE_BOOKMARK_EVENT, readBookmark)
      window.removeEventListener('storage', handleStorage)
    }
  }, [user])

  if (loading) return <Box sx={{ minHeight: '65vh', display: 'grid', placeItems: 'center' }}><CircularProgress sx={{ color: '#b8860b' }} /></Box>

  const displayName = String(user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'learner').split(' ')[0]

  if (!user) {
    return (
      <Box component="main" sx={{ bgcolor: 'var(--awm-cream-light)', pb: { xs: 7, md: 11 } }}>
        <Box sx={{ position: 'relative', mt: { xs: '-56px', md: '-64px' }, minHeight: { xs: 590, md: 690 }, display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundImage: 'url(/homepage/hero.avif)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,23,15,0.9) 0%, rgba(5,23,15,0.72) 52%, rgba(5,23,15,0.38) 100%)' }} />
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: { xs: 12, md: 14 }, pb: { xs: 7, md: 9 } }}>
            <Box sx={{ maxWidth: 720 }}>
              <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>Explore · Watch · Read</Typography>
              <Typography component="h1" sx={{ mt: 1.5, color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 42, sm: 54, md: 67 }, fontWeight: 600, lineHeight: 1.02, textShadow: '0 3px 22px rgba(0,0,0,0.55)' }}>Learn Arabic through cartoons and books</Typography>
              <Typography sx={{ mt: 2, maxWidth: 610, color: 'rgba(255,255,255,0.86)', fontFamily: 'Jost, sans-serif', lineHeight: 1.75, textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>Build your Arabic naturally through entertaining videos, interactive transcripts, and graded stories.</Typography>
              <Box sx={{ mt: 3.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button onClick={() => openAuth('register')} variant="contained" endIcon={<ArrowForward />} sx={{ bgcolor: '#d4a843', color: '#0e2e1f', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#e3bb58' } }}>Start Learning</Button>
                <Button component={Link} href="/cartoons" sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.5)', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', bgcolor: 'rgba(0,0,0,0.16)' }}>Browse Cartoons</Button>
              </Box>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 8 } }}>
          <LearningAreaCards />
          {bookmark && (
            <Box sx={{ mt: { xs: 5, md: 7 }, maxWidth: 720 }}>
              <BookmarkContinueCard bookmark={bookmark} />
            </Box>
          )}
          <Box sx={{ mt: { xs: 7, md: 10 } }}><SectionHeading eyebrow="Start exploring" title="Featured learning" detail="A simple place to begin—no account history required." />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,minmax(0,1fr))' }, gap: 2.5 }}>
              {featuredEpisode && <ContentCard type={`Featured episode · ${featuredEpisode.show.title}`} title={featuredEpisode.episode.title} description={featuredEpisode.episode.description} level={featuredEpisode.episode.level} href={`/cartoons/${featuredEpisode.show.slug}/${featuredEpisode.episode.slug}`} image={featuredEpisode.episode.cover} actionLabel="Play episode" />}
              {featuredBook && <ContentCard type="Featured book" title={featuredBook.title} titleAr={featuredBook.titleAr} description={featuredBook.description} level={featuredBook.level} href={`/books/${featuredBook.slug}`} image={featuredBook.cover} />}
            </Box>
          </Box>
          <Box sx={{ mt: { xs: 7, md: 10 } }}><SectionHeading eyebrow="Keep exploring" title="Choose what to do next" /><QuickLinks /></Box>
          <Paper elevation={0} sx={{ mt: { xs: 7, md: 10 }, p: { xs: 3, md: 5 }, borderRadius: '16px', bgcolor: 'var(--awm-cream)', border: '1px solid color-mix(in srgb, var(--awm-gold) 24%, transparent)', textAlign: 'center' }}>
            <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 30, md: 40 }, fontWeight: 600, color: 'var(--awm-bark)' }}>Create an account to track your learning</Typography>
            <Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif' }}>Continue reading, track your learning time, and return to your lessons whenever you like.</Typography>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button onClick={() => openAuth('register')} variant="contained" sx={{ bgcolor: '#0e2e1f', color: '#fff', borderRadius: '9999px', px: 3, textTransform: 'none', '&:hover': { bgcolor: '#173f2d', color: '#fff' } }}>Sign Up for Free</Button>
              <Button onClick={() => openAuth('signin')} sx={{ color: '#0e2e1f', textTransform: 'none' }}>Log In</Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    )
  }

  const activity = activityUpdate?.userId === user.id
    ? activityUpdate.activity
    : parseLearningActivity(user.user_metadata)
  const activityDates = [
    ...activity.activeDates,
    ...Object.values(progress).map((entry) => entry.updatedAt),
  ]
  const streak = calculateLearningStreak(activityDates, new Date(dashboardLoadedAt))

  return (
    <Box component="main" sx={{ bgcolor: 'var(--awm-cream-light)', pb: { xs: 7, md: 11 } }}>
      <Box sx={{ position: 'relative', mt: { xs: '-56px', md: '-64px' }, pt: { xs: 13, md: 16 }, pb: { xs: 5, md: 7 }, backgroundImage: 'url(/homepage/hero.avif)', backgroundSize: 'cover', backgroundPosition: 'center 42%' }}>
        <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(5,23,15,0.82)' }} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Your learning</Typography>
          <Typography component="h1" sx={{ mt: 0.75, color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 40, md: 58 }, fontWeight: 600, lineHeight: 1.08 }}>Welcome back, {displayName}</Typography>
          <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.68)', fontFamily: 'Jost, sans-serif' }}>Pick up where you left off or choose something new.</Typography>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 } }}>
        <SectionHeading eyebrow="Continue learning" title={recentReading ? 'Your next step is ready' : 'Start your next lesson'} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,minmax(0,1fr))' }, gap: 2.5 }}>
          {bookmark && <BookmarkContinueCard bookmark={bookmark} />}
          {recentReading ? (
            <Paper elevation={0} sx={{ display: 'grid', gridTemplateColumns: { xs: '110px minmax(0,1fr)', sm: '180px minmax(0,1fr)' }, minHeight: 240, overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '15px', bgcolor: 'var(--awm-white)' }}>
              {recentReading.book.cover ? (
                <Box component="img" src={recentReading.book.cover} alt={`${recentReading.book.title} cover`} sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
              ) : (
                <Box sx={{ display: 'grid', placeItems: 'center', bgcolor: '#0e2e1f' }}>
                  <AutoStories sx={{ color: '#d4a843', fontSize: { xs: 34, sm: 46 } }} />
                </Box>
              )}
              <Box sx={{ p: { xs: 2.25, sm: 3, md: 4 }, minWidth: 0 }}>
                <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.13em', textTransform: 'uppercase' }}>Continue reading</Typography>
                <Typography sx={{ mt: 1.25, fontFamily: 'var(--font-heading)', fontSize: { xs: 21, sm: 25 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>{recentReading.book.title}</Typography>
                <Typography
                  sx={{
                    mt: 1,
                    color: 'var(--awm-muted)',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: { xs: 13, sm: 15 },
                    lineHeight: 1.55,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 3,
                    overflow: 'hidden',
                  }}
                >
                  “{recentReading.chapter.teaser ?? recentReading.chapter.title}”
                </Typography>
                <Typography sx={{ mt: 0.75, color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 11, sm: 12 }, fontWeight: 600 }}>{recentReading.chapter.title}</Typography>
                <LinearProgress variant="determinate" value={Math.round(recentReading.chapter.chapterNumber / Math.max(recentReading.book.chapterCount, 1) * 100)} sx={{ mt: 2.5, height: 7, borderRadius: 99, bgcolor: '#eee7dc', '& .MuiLinearProgress-bar': { bgcolor: '#b8860b', borderRadius: 99 } }} />
                <Button component={Link} href={`/books/${recentReading.book.slug}/${recentReading.chapter.slug}`} variant="contained" endIcon={<ArrowForward />} sx={{ mt: 2.5, bgcolor: '#0e2e1f', color: '#fff', borderRadius: '9999px', textTransform: 'none', '& .MuiButton-endIcon': { color: '#fff' }, '&:hover': { bgcolor: '#173f2d', color: '#fff' } }}>Continue Reading</Button>
              </Box>
            </Paper>
          ) : featuredBook ? <ContentCard type="Start reading" title={featuredBook.title} titleAr={featuredBook.titleAr} description={featuredBook.description} level={featuredBook.level} href={`/books/${featuredBook.slug}`} image={featuredBook.cover} /> : null}
          {featuredEpisode && <ContentCard type={`Watch next · ${featuredEpisode.show.title}`} title={featuredEpisode.episode.title} description={featuredEpisode.episode.description} level={featuredEpisode.episode.level} href={`/cartoons/${featuredEpisode.show.slug}/${featuredEpisode.episode.slug}`} image={featuredEpisode.episode.cover} actionLabel="Play episode" />}
        </Box>

        <Box sx={{ mt: { xs: 5, md: 7 } }}>
          <LearningStats totalSeconds={activity.totalSeconds} streak={streak} />
        </Box>
        <Box sx={{ mt: { xs: 6, md: 9 } }}><SectionHeading eyebrow="Keep exploring" title="Keep your momentum" /><QuickLinks /></Box>
      </Container>
    </Box>
  )
}
