'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AccessTimeRounded,
  ArrowForward,
  AutoStories,
  CalendarMonthRounded,
  CheckCircleRounded,
  ExploreOutlined,
  Headphones,
  LocalFireDepartmentRounded,
  MenuBook,
  MilitaryTechRounded,
  PsychologyOutlined,
  AccountCircleOutlined,
  SettingsOutlined,
  Close,
  VolunteerActivismRounded,
  GridOnRounded,
} from '@mui/icons-material'
import { Box, Button, CircularProgress, Container, Dialog, DialogContent, DialogTitle, IconButton, LinearProgress, Skeleton, SwipeableDrawer, Typography, Paper, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useAuth } from '@/app/AuthContext'
import { useAccountAccess } from '@/app/lib/useAccountAccess'
import { fetchLearningActivity } from '@/app/actions/activity'
import { fetchPremiumStatus } from '@/app/actions/premium'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import CheckoutFeedback from '@/app/components/CheckoutFeedback'
import HomeQuickActions from '@/app/components/home/HomeQuickActions'
import { summarizeLearningDashboard } from '@/app/lib/learningDashboard'
import { parseReadingList } from '@/app/lib/readingList'
import CefrChip from '@/app/components/CefrChip'
import NewOnRow, { COMPACT_HOME_CARD_WIDTH, HOME_CAROUSEL_CARD_ASPECT_RATIO, type CatalogueRowItem } from './NewOnRow'
import type { NewOnEpisode, NewOnShow } from './catalogueRows'
import { PREMIUM, PREMIUM_BENEFITS } from '@/app/lib/entitlements'
import type { PublicBook, PublicChapter } from '@/app/actions/books'
import type { EpisodeMeta, ShowMeta } from '@/app/lib/cartoons'
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

interface ProgressEntry { chapterSlug: string; updatedAt?: string; hiddenFromList?: boolean }
interface FeaturedEpisode {
  show: ShowMeta
  episode: EpisodeMeta
}
interface ActivityUpdate { userId: string; activity: LearningActivity }
interface PremiumUpdate { authKey: string; premium: boolean }

const QUICK_LINKS = [
  { title: 'Word Search', label: 'Find Arabic words from real transcripts', href: '/word-search', icon: GridOnRounded },
  { title: 'Explore', label: 'Discover a random clip', href: '/explore', icon: ExploreOutlined },
  { title: 'Read', label: 'Open graded books', href: '/books', icon: AutoStories },
  { title: 'Watch', label: 'Browse full episodes', href: '/cartoons', icon: Headphones },
  { title: 'Settings', label: 'Manage your learning profile', href: (userId: string) => `/profile/${userId}#profile-settings`, icon: SettingsOutlined },
  { title: 'My Profile', label: 'View your progress and achievements', href: (userId: string) => `/profile/${userId}`, icon: AccountCircleOutlined },
  { title: 'Support Us', label: 'Help us create more learning resources', href: '/support', icon: VolunteerActivismRounded },
]

function openAuth(mode: 'register' | 'signin') {
  window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode } }))
}

function showRowItems(shows: NewOnShow[]): CatalogueRowItem[] {
  return shows.map((show) => ({
    key: show.id,
    href: `/cartoons/${encodeURIComponent(show.slug)}`,
    title: show.title,
    level: show.level,
    imageSrc: `/api/covers/shows/${show.id}`,
    imageCrop: show.coverCrop,
  }))
}

function episodeRowItems(episodes: NewOnEpisode[]): CatalogueRowItem[] {
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

function UpgradeSection() {
  const [open, setOpen] = useState(false)
  return (
    <Box component="section" aria-labelledby="upgrade-heading" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3.5, md: 6 } }}>
      <Container maxWidth="md" disableGutters>
        <Paper elevation={0} sx={{ px: { xs: 2.5, sm: 5, md: 7 }, py: { xs: 3.5, sm: 4.5, md: 5.5 }, textAlign: 'center', border: '1px solid color-mix(in srgb, var(--awm-bark) 10%, transparent)', borderRadius: { xs: '16px', md: '20px' }, bgcolor: 'var(--awm-white)' }}>
          <Typography id="upgrade-heading" component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 30, md: 38 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.15 }}>Upgrade to AWM+</Typography>
          <Typography sx={{ mt: 1.25, mx: 'auto', maxWidth: 520, fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted)', fontSize: { xs: 14, sm: 15 }, lineHeight: 1.6 }}>Take your Arabic further, wherever you like to learn.</Typography>

          <Box component="ul" sx={{ m: 0, mt: { xs: 2.5, sm: 3.5 }, p: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: { xs: 1.25, sm: 1.5 }, textAlign: 'left' }}>
            {PREMIUM_BENEFITS.map((benefit) => (
              <Box component="li" key={benefit.id} sx={{ minHeight: 48, px: 1.75, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.1, borderRadius: '10px', bgcolor: 'var(--awm-cream-light)' }}>
                <CheckCircleRounded aria-hidden="true" sx={{ flex: '0 0 auto', color: 'var(--awm-gold)', fontSize: 21 }} />
                <Typography sx={{ minWidth: 0, flex: 1, fontFamily: 'Jost, sans-serif', color: 'var(--awm-bark)', fontSize: { xs: 13.5, sm: 14.5 }, fontWeight: 600 }}>{benefit.label}</Typography>
                {benefit.appOnly && <Box component="span" sx={{ flex: '0 0 auto', px: 0.8, py: 0.35, borderRadius: '9999px', bgcolor: 'color-mix(in srgb, var(--awm-forest) 9%, transparent)', color: 'var(--awm-forest)', fontFamily: 'Jost, sans-serif', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>📱 App only</Box>}
              </Box>
            ))}
          </Box>

          <Button variant="contained" startIcon={<AutoStories />} onClick={() => setOpen(true)} sx={{ mt: { xs: 3, sm: 4 }, width: '100%', maxWidth: 440, minHeight: { xs: 58, sm: 64 }, px: 4, borderRadius: '16px', position: 'relative', overflow: 'hidden', color: 'primary.contrastText', background: 'linear-gradient(135deg, var(--awm-gold-light), var(--awm-gold))', border: '1px solid color-mix(in srgb, var(--awm-gold-light) 75%, transparent)', fontSize: { xs: 16, sm: 18 }, fontWeight: 700, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), 0 10px 28px color-mix(in srgb, var(--awm-gold) 22%, transparent)', transition: 'transform .18s ease, box-shadow .18s ease', '&::before': { content: '\"\"', position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,.24) 46%, transparent 68%)', transform: 'translateX(-65%)', transition: 'transform .65s ease', pointerEvents: 'none' }, '&:hover': { background: 'linear-gradient(135deg, var(--awm-gold-light), var(--awm-gold))', transform: 'translateY(-2px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), 0 14px 32px color-mix(in srgb, var(--awm-gold) 30%, transparent)', '&::before': { transform: 'translateX(60%)' } }, '&:active': { transform: 'translateY(1px)', boxShadow: 'inset 0 2px 5px rgba(0,0,0,.12)' }, '&:focus-visible': { outline: '3px solid', outlineColor: 'text.primary', outlineOffset: 4 }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&::before': { transition: 'none' }, '&:hover, &:active': { transform: 'none' } } }}>Upgrade to AWM+</Button>
          <Typography sx={{ mt: 1.25, fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted-light)', fontSize: 12 }}>{PREMIUM.label} · Cancel anytime</Typography>
        </Paper>
        <PremiumPrompt open={open} onClose={() => setOpen(false)} />
      </Container>
    </Box>
  )
}

function BookCard({ book }: { book: PublicBook }) {
  const [loaded, setLoaded] = useState(false)
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

function SectionHeading({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      {eyebrow && <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{eyebrow}</Typography>}
      <Typography component="h2" sx={{ mt: eyebrow ? 0.5 : 0, fontFamily: 'var(--font-heading)', fontSize: { xs: 30, md: 39 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.15 }}>{title}</Typography>
      {detail && <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', lineHeight: 1.65 }}>{detail}</Typography>}
    </Box>
  )
}

export function QuickLinks({ userId }: { userId?: string }) {
  const links = QUICK_LINKS.filter(item => userId || typeof item.href === 'string')
  return (
    <Box component="nav" aria-label="Quick Actions" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(3,minmax(0,1fr))', lg: 'repeat(4,minmax(0,1fr))' }, gap: 1.5, alignItems: 'stretch' }}>
      {links.map((item) => {
        const Icon = item.icon
        const href = typeof item.href === 'function' ? item.href(userId!) : item.href
        return (
          <Paper key={item.title} component={Link} href={href} elevation={0} sx={{ minWidth: 0, minHeight: 154, height: '100%', boxSizing: 'border-box', p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textDecoration: 'none', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '12px', color: 'var(--awm-bark)', bgcolor: 'var(--awm-white)', '&:hover': { borderColor: 'color-mix(in srgb, var(--awm-gold) 55%, transparent)' } }}>
            <Icon sx={{ color: '#b8860b', fontSize: { xs: 19, md: 24 } }} />
            <Typography sx={{ mt: 1, fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>{item.title}</Typography>
            <Typography sx={{ mt: 0.25, fontFamily: 'Jost, sans-serif', color: 'var(--awm-muted)', fontSize: 12 }}>{item.label}</Typography>
          </Paper>
        )
      })}
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
        <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{type}</Typography>
        <Typography sx={{ mt: 0.75, fontFamily: 'var(--font-heading)', fontSize: { xs: 19, sm: 24 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</Typography>
        {description && <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 13, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{description}</Typography>}
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
  const { level, week } = summary
  const comparison = week.comparisonPercent
  const comparisonText = comparison === null
    ? 'No previous-week comparison yet'
    : `${comparison >= 0 ? 'Up' : 'Down'} ${Math.abs(comparison)}% from last week`
  const metrics = [
    { id: 'level', label: 'Current level', value: `Level ${level.level}`, icon: MilitaryTechRounded, description: `${level.progressPercent}% of the way to Level ${level.level + 1}.`, detail: `${formatLearningTime(activity.totalSeconds)} total active learning time.` },
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
      <Typography sx={{ mt: 2, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{selected.label}</Typography>
      <Typography sx={{ mt: 0.5, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: 36, fontWeight: 600, lineHeight: 1.1 }}>{selected.value}</Typography>
      <Typography sx={{ mt: 1.25, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>{selected.description}</Typography>
      {'detail' in selected && selected.detail && <Typography sx={{ mt: 1.25, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 13 }}>{selected.detail}</Typography>}
      {selected.id === 'level' && <LinearProgress variant="determinate" value={level.progressPercent} sx={{ mt: 2, height: 7, borderRadius: 99, bgcolor: 'color-mix(in srgb, var(--awm-bark) 9%, transparent)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--awm-gold)', borderRadius: 99 } }} />}
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

export default function HomeDashboard({ books, featuredBook, featuredEpisode, chaptersByBook, newShows, newEpisodes }: { books: PublicBook[]; featuredBook: PublicBook | null; featuredEpisode: FeaturedEpisode | null; chaptersByBook: Record<string, PublicChapter[]>; newShows: NewOnShow[]; newEpisodes: NewOnEpisode[] }) {
  const { user, session, loading } = useAuth()
  const { isAdmin } = useAccountAccess('home')
  const [activityUpdate, setActivityUpdate] = useState<ActivityUpdate | null>(null)
  const [premiumUpdate, setPremiumUpdate] = useState<PremiumUpdate | null>(null)
  const [bookmark, setBookmark] = useState<BookSentenceBookmark | null>(null)
  const [dashboardLoadedAt] = useState(Date.now)
  const premiumAuthKey = user ? `${user.id}:${session?.expires_at ?? 'pending'}` : null
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
    if (!premiumAuthKey) return
    const authKey = premiumAuthKey
    let cancelled = false
    void fetchPremiumStatus()
      .then((status) => {
        if (!cancelled) setPremiumUpdate({ authKey, premium: status.premium })
      })
      .catch((error: unknown) => console.error('Unable to verify AWM+ status:', error))
    return () => { cancelled = true }
  }, [premiumAuthKey])

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

  if (loading) return <Box sx={{ minHeight: '65vh', display: 'grid', placeItems: 'center' }}><CircularProgress sx={{ color: '#b8860b' }} /></Box>

  const displayName = String(user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'learner').split(' ')[0]

  if (!user) {
    return (
      <Box component="main" sx={{ bgcolor: 'var(--awm-cream-light)' }}>
        <Box sx={{ position: 'relative', mt: { xs: 'calc(-56px - env(safe-area-inset-top))', md: 'calc(-64px - env(safe-area-inset-top))' }, minHeight: { xs: 520, md: 610 }, display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundImage: 'url(/homepage/hero.avif)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,23,15,0.9) 0%, rgba(5,23,15,0.72) 52%, rgba(5,23,15,0.38) 100%)' }} />
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: { xs: 12, md: 14 }, pb: { xs: 5, md: 6 } }}>
            <Box sx={{ maxWidth: 720 }}>
              <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>Explore · Watch · Read · Memory</Typography>
              <Typography component="h1" sx={{ mt: 1.5, color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 42, sm: 54, md: 67 }, fontWeight: 600, lineHeight: 1.02, textShadow: '0 3px 22px rgba(0,0,0,0.55)' }}>Learn Arabic through cartoons and books</Typography>
              <Box sx={{ mt: 3.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button onClick={() => openAuth('register')} variant="contained" endIcon={<ArrowForward />} sx={{ bgcolor: '#d4a843', color: '#0e2e1f', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#e3bb58' } }}>Start Learning</Button>
                <Button component={Link} href="/cartoons" sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.5)', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', bgcolor: 'rgba(0,0,0,0.16)' }}>Browse Cartoons</Button>
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
        </Box>

        <Container maxWidth="lg" sx={{ py: 4 }}><SectionHeading title="Quick Actions" /><QuickLinks /></Container>
        <UpgradeSection />
      </Box>
    )
  }

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
        <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(5,23,15,0.82)' }} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Your learning</Typography>
          <Typography component="h1" sx={{ mt: 0.75, color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: 40, md: 58 }, fontWeight: 600, lineHeight: 1.08 }}>Welcome back, {displayName}</Typography>
          <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.68)', fontFamily: 'Jost, sans-serif' }}>Pick up where you left off or choose something new.</Typography>
        </Container>
        <Box component="svg" aria-hidden="true" viewBox="0 0 1200 44" preserveAspectRatio="none" sx={{ position: 'absolute', zIndex: 2, left: 0, right: 0, bottom: -1, width: '100%', height: { xs: 25, sm: 32, md: 42 } }}>
          <path d="M0 0 C300 38 900 38 1200 0 L1200 44 L0 44 Z" fill="var(--awm-cream-light)" />
        </Box>
      </Box>
      <Container maxWidth="lg" sx={{ pt: { xs: 4.5, md: 6 } }}>
        <SectionHeading eyebrow="Continue learning" title={recentReading ? 'Your next step is ready' : 'Start your next lesson'} />
        <HomeQuickActions
          isAdmin={isAdmin}
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
        <Box sx={{ mt: { xs: 6, md: 9 } }}><SectionHeading title="Quick Actions" /><QuickLinks userId={user.id} /></Box>
      </Container>
      {premiumUpdate?.authKey === premiumAuthKey && !premiumUpdate.premium && <UpgradeSection />}
      <CheckoutFeedback />
    </Box>
  )
}
