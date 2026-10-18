'use client'

/* Signed-in homepage dashboard — SET ASIDE (2026-10).
   Currently not rendered anywhere: signed-in users see the same public
   homepage as guests (HomeDashboard). Keep this file around; we plan to
   bring the personalised dashboard back soon. */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AccessTimeRounded,
  ArrowForward,
  AutoStories,
  CalendarMonthRounded,
  Close,
  ExploreOutlined,
  GridOnRounded,
  LocalFireDepartmentRounded,
  MenuBook,
  PsychologyOutlined,
} from '@mui/icons-material'
import { Box, Button, Container, Dialog, DialogContent, DialogTitle, IconButton, Paper, SwipeableDrawer, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useAuth } from '@/app/AuthContext'
import { useColorMode } from '@/app/components/ThemeProvider'
import { fetchLearningActivity } from '@/app/actions/activity'
import CheckoutFeedback from '@/app/components/CheckoutFeedback'
import HomeQuickActions from '@/app/components/home/HomeQuickActions'
import { summarizeLearningDashboard } from '@/app/lib/learningDashboard'
import { parseReadingList } from '@/app/lib/readingList'
import CefrChip from '@/app/components/CefrChip'
import NewOnRow from './NewOnRow'
import type { NewOnEpisode, NewOnShow } from './catalogueRows'
import type { PublicBook, PublicChapter } from '@/app/actions/books'
import { thumbnailCropCss, type ThumbnailCrop } from '@/app/lib/thumbnailCrop'
import {
  LEARNING_ACTIVITY_EVENT,
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
import { episodeRowItems, showRowItems, type FeaturedEpisode } from './HomeDashboard'

interface ProgressEntry { chapterSlug: string; updatedAt?: string; hiddenFromList?: boolean }
interface ActivityUpdate { userId: string; activity: LearningActivity }

function SectionHeading({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      {eyebrow && <Typography sx={{ color: '#b8860b', fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{eyebrow}</Typography>}
      <Typography component="h2" sx={{ mt: eyebrow ? 0.5 : 0, fontFamily: 'var(--font-heading)', fontSize: { xs: 30, md: 39 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.15 }}>{title}</Typography>
      {detail && <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', lineHeight: 1.65 }}>{detail}</Typography>}
    </Box>
  )
}

function FeaturedContentCard({ type, title, description, level, href, image, imageCrop, actionLabel }: { type: string; title: string; description?: string; level?: string; href: string; image?: string; imageCrop?: ThumbnailCrop; actionLabel: string }) {
  return (
    <Paper elevation={0} sx={{ display: 'grid', gridTemplateColumns: { xs: '112px minmax(0,1fr)', sm: '38% minmax(0,1fr)' }, minHeight: { xs: 180, sm: 230 }, overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '14px', bgcolor: 'var(--awm-white)', boxShadow: '0 4px 16px color-mix(in srgb, var(--awm-bark) 5%, transparent)', transition: 'transform .22s ease, border-color .22s ease, box-shadow .22s ease', '&:hover': { transform: 'translateY(-3px)', borderColor: 'color-mix(in srgb, var(--awm-gold) 52%, transparent)', boxShadow: '0 12px 30px color-mix(in srgb, var(--awm-gold) 14%, transparent)' }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } } }}>
      <Box sx={{ minWidth: 0, overflow: 'hidden', bgcolor: 'var(--awm-forest)' }}>
        {image ? <Box component="img" src={image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...thumbnailCropCss(imageCrop) }} /> : <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}><AutoStories sx={{ color: 'var(--awm-gold-light)', fontSize: { xs: 34, sm: 46 } }} /></Box>}
      </Box>
      <Box sx={{ p: { xs: 1.75, sm: 2.5 }, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Typography sx={{ color: '#b8860b', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{type}</Typography>
        <Typography sx={{ mt: 0.75, fontFamily: 'var(--font-heading)', fontSize: { xs: 19, sm: 24 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</Typography>
        {description && <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{description}</Typography>}
        <Box sx={{ mt: 'auto', pt: 1.25 }}>
          {level && <CefrChip size="small" level={level} />}
          <Button component={Link} href={href} endIcon={<ArrowForward sx={{ fontSize: { xs: 17, sm: 20 } }} />} sx={{ display: 'flex', width: 'fit-content', mt: 0.75, px: 0, color: 'var(--awm-forest)', fontWeight: 700, textTransform: 'none' }}>{actionLabel}</Button>
        </Box>
      </Box>
    </Paper>
  )
}

function LearningStats({
  activity,
  streak,
  booksInProgress,
  now,
}: {
  activity: LearningActivity
  streak: number
  booksInProgress: number
  now: Date
}) {
  const theme = useTheme()
  const mobileDetail = useMediaQuery(theme.breakpoints.down('sm'))
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const summary = summarizeLearningDashboard(activity, now)
  const { week } = summary
  const comparison = week.comparisonPercent
  const comparisonText = comparison === null
    ? 'No previous-week comparison yet'
    : `${comparison >= 0 ? 'Up' : 'Down'} ${Math.abs(comparison)}% from last week`
  const metrics = [
    ...(activity.memory ? [{ id: 'memory', ...summary.memory, icon: PsychologyOutlined }] : []),
    ...(activity.wordSearch ? [{ id: 'word-search', ...summary.wordSearch, icon: GridOnRounded }] : []),
    { id: 'week', label: 'Learning this week', value: formatLearningTime(week.thisWeekSeconds), icon: CalendarMonthRounded, description: `${week.activeDays} active day${week.activeDays === 1 ? '' : 's'} this week. ${comparisonText}.` },
    { id: 'today', label: 'Active today', value: formatLearningTime(week.todaySeconds), icon: AccessTimeRounded, description: 'Active learning time recorded today while reading, watching, or practising.' },
    { id: 'reading', label: 'Reading this week', value: formatLearningTime(week.readingSeconds), icon: MenuBook, description: 'Time spent actively reading ArabicWithM books during the current week.' },
    { id: 'streak', label: 'Current streak', value: `${streak} day${streak === 1 ? '' : 's'}`, icon: LocalFireDepartmentRounded, description: 'Consecutive calendar days with recorded learning activity.' },
    { id: 'books', label: 'Books in progress', value: String(booksInProgress), icon: AutoStories, description: 'Books with saved reading progress on this account.' },
    { id: 'definitions', label: 'Words inspected this week', value: String(week.wordLookups), icon: ExploreOutlined, description: 'Arabic word definitions opened during the current week.' },
  ]
  const selected = metrics.find((metric) => metric.id === selectedMetric) ?? null
  const closeDetail = () => setSelectedMetric(null)
  const detailPanel = selected ? (() => {
    const DetailIcon = selected.icon
    return <Box sx={{ px: { xs: 2.5, sm: 3 }, pt: { xs: 1, sm: 0 }, pb: { xs: 'calc(24px + env(safe-area-inset-bottom))', sm: 3 } }}>
      <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: '14px', bgcolor: 'color-mix(in srgb, var(--awm-gold) 13%, transparent)', color: 'var(--awm-gold)' }}><DetailIcon sx={{ fontSize: 29 }} /></Box>
      <Typography sx={{ mt: 2, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{selected.label}</Typography>
      <Typography sx={{ mt: 0.5, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: 36, fontWeight: 600, lineHeight: 1.1 }}>{selected.value}</Typography>
      <Typography sx={{ mt: 1.25, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', lineHeight: 1.6 }}>{selected.description}</Typography>
    </Box>
  })() : null

  return (
    <>
    <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '15px', bgcolor: 'var(--awm-white)' }}>
      <Typography component="h2" sx={{ mb: { xs: 1.25, sm: 1.5 }, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 21, sm: 24 }, fontWeight: 600, lineHeight: 1.15 }}>Your learning activity</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(4,minmax(0,1fr))', sm: `repeat(${metrics.length},minmax(0,1fr))` }, gap: { xs: 0.65, sm: 0.8 } }}>
        {metrics.map((metric) => {
          const Icon = metric.icon
          return <Box component="button" type="button" key={metric.id} onClick={() => setSelectedMetric(metric.id)} aria-label={`${metric.label}: ${metric.value}. Show details`} sx={{ minWidth: 0, minHeight: { xs: 74, sm: 82 }, p: { xs: 0.7, sm: 1 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.65, border: '1px solid color-mix(in srgb, var(--awm-bark) 8%, transparent)', borderRadius: '10px', bgcolor: 'var(--awm-cream-light)', color: 'var(--awm-bark)', font: 'inherit', cursor: 'pointer', transition: 'border-color .15s ease, transform .15s ease, background-color .15s ease', '&:hover': { borderColor: 'color-mix(in srgb, var(--awm-gold) 48%, transparent)', bgcolor: 'color-mix(in srgb, var(--awm-gold) 7%, var(--awm-cream-light))', transform: { sm: 'translateY(-2px)' } }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', outlineOffset: 2 } }}>
            <Icon aria-hidden="true" sx={{ color: 'var(--awm-gold)', fontSize: { xs: 21, sm: 24 } }} />
            <Typography sx={{ maxWidth: '100%', color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 14, sm: 16 }, fontWeight: 700, lineHeight: 1.05, textAlign: 'center', overflowWrap: 'anywhere' }}>{metric.value}</Typography>
          </Box>
        })}
      </Box>
    </Paper>
    {mobileDetail ? (
      <SwipeableDrawer anchor="bottom" open={Boolean(selected)} onOpen={() => undefined} onClose={closeDetail} disableSwipeToOpen disableDiscovery slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-label': selected?.label ?? 'Learning activity detail', sx: { borderRadius: '22px 22px 0 0', bgcolor: 'var(--awm-white)', maxHeight: '82dvh' } } }}>
        <Box aria-hidden="true" sx={{ width: 42, height: 5, borderRadius: 999, bgcolor: 'color-mix(in srgb, var(--awm-bark) 24%, transparent)', mx: 'auto', mt: 1.25, mb: 1 }} />
        {detailPanel}
      </SwipeableDrawer>
    ) : (
      <Dialog open={Boolean(selected)} onClose={closeDetail} fullWidth maxWidth="xs" aria-labelledby="learning-metric-title" slotProps={{ paper: { sx: { borderRadius: '16px', bgcolor: 'var(--awm-white)' } } }}>
        <DialogTitle id="learning-metric-title" sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}><IconButton aria-label="Close details" onClick={closeDetail}><Close /></IconButton></DialogTitle>
        <DialogContent sx={{ p: 0 }}>{detailPanel}</DialogContent>
      </Dialog>
    )}
    </>
  )
}

export default function SignedInHome({ books, featuredBook, featuredEpisode, chaptersByBook, newShows, newEpisodes }: { books: PublicBook[]; featuredBook: PublicBook | null; featuredEpisode: FeaturedEpisode | null; chaptersByBook: Record<string, PublicChapter[]>; newShows: NewOnShow[]; newEpisodes: NewOnEpisode[] }) {
  const { user } = useAuth()
  const { mode } = useColorMode()
  const [activityUpdate, setActivityUpdate] = useState<ActivityUpdate | null>(null)
  const [bookmark, setBookmark] = useState<BookSentenceBookmark | null>(null)
  const [dashboardLoadedAt] = useState(Date.now)
  const progress = useMemo(() => {
    return parseReadingList(user?.user_metadata?.book_progress) as Record<string, ProgressEntry>
  }, [user])
  const recentReading = (() => {
    const entries = Object.entries(progress).sort((a, b) => Date.parse(b[1].updatedAt ?? '') - Date.parse(a[1].updatedAt ?? ''))
    for (const [bookSlug, saved] of entries) {
      if (saved.hiddenFromList) continue
      const book = books.find((item) => item.slug === bookSlug)
      const chapter = chaptersByBook[bookSlug]?.find((item) => item.slug === saved.chapterSlug)
      if (book && chapter) return { book, chapter }
    }
    return null
  })()
  const booksInProgress = Object.entries(progress).filter(([bookSlug, saved]) => (
    !saved.hiddenFromList && books.some((book) => book.slug === bookSlug) &&
    chaptersByBook[bookSlug]?.some((chapter) => chapter.slug === saved.chapterSlug)
  )).length
  const { newShowItems, newEpisodeItems } = useMemo(() => {
    return {
      newShowItems: showRowItems(newShows),
      newEpisodeItems: episodeRowItems(newEpisodes),
    }
  }, [newEpisodes, newShows])

  useEffect(() => {
    const handleActivityUpdate = (event: Event) => {
      setActivityUpdate((event as CustomEvent<ActivityUpdate>).detail)
    }
    window.addEventListener(LEARNING_ACTIVITY_EVENT, handleActivityUpdate)
    return () => window.removeEventListener(LEARNING_ACTIVITY_EVENT, handleActivityUpdate)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    void fetchLearningActivity()
      .then((activity) => {
        if (!cancelled) setActivityUpdate({ userId: user.id, activity })
      })
      .catch((error: unknown) => console.error('Unable to load dashboard activity:', error))
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    const readBookmark = (event?: Event) => {
      if (event instanceof CustomEvent && event.detail === null) {
        setBookmark(null)
        return
      }
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

  if (!user) return null

  const displayName = String(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'learner').split(' ')[0]
  const activity = activityUpdate?.userId === user.id
    ? activityUpdate.activity
    : parseLearningActivity(user.user_metadata)
  const dashboardNow = new Date(dashboardLoadedAt)
  const streak = summarizeLearningDashboard(activity, dashboardNow).streak
  const featuredReading = recentReading?.book ?? featuredBook
  const featuredReadingHref = recentReading
    ? `/books/${encodeURIComponent(recentReading.book.slug)}/${encodeURIComponent(recentReading.chapter.slug)}`
    : featuredBook ? `/books/${encodeURIComponent(featuredBook.slug)}` : ''
  return (
    <Box component="main" sx={{ bgcolor: 'var(--awm-cream-light)', pb: { xs: 7, md: 11 } }}>
      <Box sx={{ position: 'relative', mt: { xs: 'calc(-56px - env(safe-area-inset-top))', md: 'calc(-64px - env(safe-area-inset-top))' }, pt: { xs: 14.5, md: 18 }, pb: { xs: 8, md: 10 }, overflow: 'hidden', backgroundImage: 'url(/homepage/hero.avif)', backgroundSize: 'cover', backgroundPosition: 'center 42%' }}>
        <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, bgcolor: mode === 'dark' ? 'rgba(0,0,0,0.78)' : 'rgba(5,23,15,0.82)' }} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography sx={{ color: '#d4a843', fontFamily: 'var(--font-sans), sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Your learning</Typography>
          <Typography component="h1" sx={{ mt: 0.75, color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 40, md: 58 }, fontWeight: 600, lineHeight: 1.08 }}>Welcome back, {displayName}</Typography>
          <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.68)', fontFamily: 'var(--font-sans), sans-serif' }}>Pick up where you left off or choose something new.</Typography>
        </Container>
        <Box component="svg" aria-hidden="true" viewBox="0 0 1200 44" preserveAspectRatio="none" sx={{ position: 'absolute', zIndex: 2, left: 0, right: 0, bottom: -1, width: '100%', height: { xs: 25, sm: 32, md: 42 } }}>
          <path d="M0 0 C300 38 900 38 1200 0 L1200 44 L0 44 Z" fill="var(--awm-cream-light)" />
        </Box>
      </Box>
      <Container maxWidth="lg" sx={{ pt: { xs: 4.5, md: 6 } }}>
        <SectionHeading eyebrow="Continue learning" title={recentReading ? 'Your next step is ready' : 'Start your next lesson'} />
        <HomeQuickActions
          bookmarkHref={bookmark ? bookSentenceBookmarkHref(bookmark) : recentReading ? `/books/${encodeURIComponent(recentReading.book.slug)}/${encodeURIComponent(recentReading.chapter.slug)}` : '/books'}
          bookmarkLabel={bookmark ? `${bookmark.bookTitle} ? ${bookmark.chapterTitle}` : recentReading ? `${recentReading.book.title} ? ${recentReading.chapter.title}` : 'Save a sentence to return here'}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,minmax(0,1fr))' }, gap: 2.5 }}>
          {featuredEpisode && <FeaturedContentCard type={`Featured video · ${featuredEpisode.show.title}`} title={featuredEpisode.episode.title} description={featuredEpisode.episode.description} level={featuredEpisode.episode.level} href={`/cartoons/${featuredEpisode.show.slug}/${featuredEpisode.episode.slug}`} image={featuredEpisode.episode.cover} imageCrop={featuredEpisode.episode.coverCrop} actionLabel="Watch Now" />}
          {featuredReading && <FeaturedContentCard type={recentReading ? 'Continue reading' : 'Featured book'} title={featuredReading.title} description={featuredReading.description} level={featuredReading.level} href={featuredReadingHref} image={featuredReading.cover} imageCrop={featuredReading.coverCrop} actionLabel={recentReading ? 'Continue Reading' : 'Read Book'} />}
        </Box>

      </Container>

      {(newShowItems.length > 0 || newEpisodeItems.length > 0) && (
        <Box component="section" aria-label="Shows and latest episodes" sx={{ mt: { xs: 3.5, md: 5 }, minWidth: 0, width: '100%', overflow: 'hidden' }}>
          <Container maxWidth={false} sx={{ minWidth: 0 }}>
            {newShowItems.length > 0 && <Box>
              <Typography component="h3" sx={{ mb: 0.75, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 23 }, fontWeight: 600, color: 'var(--awm-bark)' }}>Shows</Typography>
              <NewOnRow items={newShowItems} ariaLabel="Shows" autoScroll compact />
            </Box>}
            {newEpisodeItems.length > 0 && <Box sx={{ mt: { xs: 2.5, md: 3.25 } }}>
              <Typography component="h3" sx={{ mb: 0.75, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 23 }, fontWeight: 600, color: 'var(--awm-bark)' }}>Latest Episodes</Typography>
              <NewOnRow items={newEpisodeItems} ariaLabel="Latest Episodes" autoScroll compact />
            </Box>}
          </Container>
        </Box>
      )}

      <Container maxWidth="lg">
        <Box sx={{ mt: { xs: 5, md: 7 } }}>
          <LearningStats
            activity={activity}
            streak={streak}
            booksInProgress={booksInProgress}
            now={dashboardNow}
          />
        </Box>
      </Container>
      <CheckoutFeedback />
    </Box>
  )
}
