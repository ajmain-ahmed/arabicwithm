'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AccessTimeRounded,
  ArrowForward,
  AutoStories,
  Bookmark,
  CalendarMonthRounded,
  Check,
  ChevronRight,
  Close,
  ExploreOutlined,
  Headphones,
  InfoOutlined,
  LocalFireDepartmentRounded,
  MenuBook,
  PsychologyOutlined,
  TrendingDownRounded,
  TrendingUpRounded,
} from '@mui/icons-material'
import { Box, Button, Chip, CircularProgress, Container, Dialog, IconButton, LinearProgress, Skeleton, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useMediaQuery, useTheme } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import { fetchLearningActivity } from '@/app/actions/activity'
import NewOnRow, { type CatalogueRowItem } from './NewOnRow'
import type { NewOnEpisode, NewOnShow } from './catalogueRows'
import { PREMIUM } from '@/app/lib/entitlements'
import type { PublicBook, PublicChapter } from '@/app/actions/books'
import type { EpisodeMeta, ShowMeta } from '@/app/lib/cartoons'
import {
  LEARNING_ACTIVITY_EVENT,
  calculateLearningLevel,
  calculateLearningStreak,
  formatLearningTime,
  parseLearningActivity,
  summarizeWeeklyActivity,
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

const QUICK_LINKS = [
  { title: 'Explore', label: 'Discover a random clip', href: '/explore', icon: ExploreOutlined },
  { title: 'Read', label: 'Open graded books', href: '/books', icon: AutoStories },
  { title: 'Watch', label: 'Browse full episodes', href: '/cartoons', icon: Headphones },
  { title: 'Memory', label: 'Recall phrases with flashcards', href: '/memory', icon: PsychologyOutlined },
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
  }))
}

const PLAN_ROWS = [
  {
    feature: 'Cartoons & Anime', free: 'tick', plus: 'tick', imageKey: 'show0',
    detail: 'Watch every cartoon and anime episode with interactive Arabic subtitles — tap any word for its definition, pronunciation, and grammar notes.',
  },
  {
    feature: 'Books', free: 'limited', plus: 'tick', imageKey: 'book0',
    detail: 'Graded Arabic readers written for learners. The free tier includes the opening chapters of every book; AWM+ unlocks every chapter.',
  },
  {
    feature: 'Early access', free: 'none', plus: 'tick', imageKey: 'show1',
    detail: 'Get new books, cartoons and anime before they are published on YouTube or our other social channels.',
  },
  {
    feature: 'Downloadable PDFs', free: 'none', plus: 'tick', imageKey: 'book1',
    detail: 'Download every book and chapter as a print-ready PDF to read offline, annotate, or keep forever.',
  },
  {
    feature: 'Audiobooks', free: 'none', plus: 'tick', imageKey: 'show2',
    detail: 'Listen to narrated audiobooks of our graded readers — perfect for listening practice and shadowing on the go.',
  },
] as const

const PLAN_PLUS_COL_SX = {
  bgcolor: 'color-mix(in srgb, var(--awm-gold) 8%, transparent)',
} as const
const PLAN_HAIRLINE = '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)'
const PLAN_ROW_HAIRLINE = '1px solid color-mix(in srgb, var(--awm-bark) 8%, transparent)'

function planCell(value: 'tick' | 'limited' | 'none') {
  if (value === 'tick') return <Check sx={{ color: 'var(--awm-gold)', fontSize: 26, verticalAlign: 'middle' }} />
  if (value === 'limited') return <Typography component="span" sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: 'var(--awm-muted)' }}>Limited</Typography>
  return <Typography component="span" sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: 'var(--awm-muted-light)' }}>—</Typography>
}

function planDetailImage(imageKey: string, shows: NewOnShow[], books: PublicBook[]): string | undefined {
  const show = (index: number) => shows[index] ? `/api/covers/shows/${shows[index].id}` : undefined
  const book = (index: number) => books[index] ? (books[index].cover || `/api/covers/books/${books[index].id}`) : undefined
  if (imageKey === 'show0') return show(0)
  if (imageKey === 'show1') return show(1)
  if (imageKey === 'show2') return show(2)
  if (imageKey === 'book0') return book(0)
  if (imageKey === 'book1') return book(1)
  return undefined
}

function PlanBadge({ kind }: { kind: 'free' | 'plus' }) {
  if (kind === 'free') {
    return (
      <Box component="span" sx={{ display: 'inline-block', px: 3.5, py: 1, borderRadius: '9999px', border: '1px solid color-mix(in srgb, var(--awm-bark) 35%, transparent)', color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Free</Box>
    )
  }
  return (
    <Box component="span" sx={{ display: 'inline-block', px: 3.5, py: 1, borderRadius: '9999px', bgcolor: '#b8860b', color: '#fff', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AWM+</Box>
  )
}

function PlanPrice({ kind }: { kind: 'free' | 'plus' }) {
  return (
    <>
      <Typography sx={{ mt: 1.75, fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--awm-bark)' }}>{kind === 'free' ? '£0' : PREMIUM.label}</Typography>
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: 'var(--awm-muted)' }}>{kind === 'free' ? 'free forever' : 'cancel anytime'}</Typography>
    </>
  )
}

function PlanInfoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={`About ${label}`}
      sx={{ display: 'inline-flex', p: 0.35, border: 0, bgcolor: 'transparent', cursor: 'pointer', color: 'var(--awm-muted-light)', borderRadius: '50%', transition: 'color 0.15s', '&:hover': { color: 'var(--awm-gold)' } }}
    >
      <InfoOutlined sx={{ fontSize: 16 }} />
    </Box>
  )
}

function PlanCompare({ shows, books }: { shows: NewOnShow[]; books: PublicBook[] }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [infoRow, setInfoRow] = useState<(typeof PLAN_ROWS)[number] | null>(null)
  return (
    <Container maxWidth="md" sx={{ pt: { xs: 6, md: 8 }, pb: { xs: 7, md: 9 }, textAlign: 'center' }}>
      <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 26, md: 34 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Choose your plan</Typography>

      {isMobile ? (
        /* Hulu-style stacked layout: plan badges on top, then per-feature
           label centred above the Free/AWM+ values. */
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', borderBottom: PLAN_HAIRLINE, pb: 2.5 }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <PlanBadge kind="free" />
              <PlanPrice kind="free" />
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <PlanBadge kind="plus" />
              <PlanPrice kind="plus" />
            </Box>
          </Box>
          {PLAN_ROWS.map((row, index) => (
            <Box key={row.feature} sx={{ py: 2, borderBottom: index === PLAN_ROWS.length - 1 ? 'none' : PLAN_ROW_HAIRLINE }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.6 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: 'var(--awm-muted)' }}>{row.feature}</Typography>
                <PlanInfoButton label={row.feature} onClick={() => setInfoRow(row)} />
              </Box>
              <Box sx={{ display: 'flex', mt: 1.25 }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>{planCell(row.free)}</Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>{planCell(row.plus)}</Box>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <TableContainer sx={{ mt: 4, overflowX: 'auto' }}>
          <Table sx={{ minWidth: 520, borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '42%', borderBottom: PLAN_HAIRLINE }} />
                <TableCell align="center" sx={{ borderBottom: PLAN_HAIRLINE, verticalAlign: 'bottom', py: 2.5 }}>
                  <PlanBadge kind="free" />
                  <PlanPrice kind="free" />
                </TableCell>
                <TableCell align="center" sx={{ ...PLAN_PLUS_COL_SX, borderBottom: PLAN_HAIRLINE, verticalAlign: 'bottom', py: 2.5 }}>
                  <PlanBadge kind="plus" />
                  <PlanPrice kind="plus" />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {PLAN_ROWS.map((row, index) => (
                <TableRow key={row.feature}>
                  <TableCell sx={{ borderBottom: index === PLAN_ROWS.length - 1 ? 'none' : PLAN_ROW_HAIRLINE, py: 2.5, fontFamily: 'Jost, sans-serif', color: 'var(--awm-bark)', fontSize: '1rem' }}>
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                      {row.feature}
                      <PlanInfoButton label={row.feature} onClick={() => setInfoRow(row)} />
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ borderBottom: index === PLAN_ROWS.length - 1 ? 'none' : PLAN_ROW_HAIRLINE, py: 2.5 }}>{planCell(row.free)}</TableCell>
                  <TableCell align="center" sx={{ ...PLAN_PLUS_COL_SX, borderBottom: index === PLAN_ROWS.length - 1 ? 'none' : PLAN_ROW_HAIRLINE, py: 2.5 }}>{planCell(row.plus)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={Boolean(infoRow)}
        onClose={() => setInfoRow(null)}
        slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden', width: '100%', maxWidth: 380, m: 2 } } }}
      >
        {infoRow && (
          <>
            <Box sx={{ position: 'relative', bgcolor: '#0e2e1f' }}>
              {planDetailImage(infoRow.imageKey, shows, books) && (
                <Box component="img" src={planDetailImage(infoRow.imageKey, shows, books)} alt="" sx={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }} />
              )}
              <IconButton onClick={() => setInfoRow(null)} aria-label="Close" size="small" sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(5,23,15,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(5,23,15,0.75)' } }}>
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Box sx={{ p: 3, textAlign: 'left' }}>
              <Typography component="h3" sx={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.25 }}>{infoRow.feature}</Typography>
              <Typography sx={{ mt: 1.25, fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: 'var(--awm-muted)', lineHeight: 1.7 }}>{infoRow.detail}</Typography>
            </Box>
          </>
        )}
      </Dialog>
    </Container>
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
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        color: 'inherit',
        textDecoration: 'none',
        border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)',
        borderRadius: { xs: '10px', sm: '14px' },
        bgcolor: 'var(--awm-white)',
        transition: 'transform .2s ease, box-shadow .2s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 32px color-mix(in srgb, var(--awm-bark) 12%, transparent)' },
      }}
    >
      <Box sx={{ position: 'relative', bgcolor: '#0e2e1f' }}>
        {!loaded && (
          <Skeleton
            variant="rectangular"
            animation="wave"
            sx={{ position: 'absolute', inset: 0, zIndex: 1, bgcolor: 'color-mix(in srgb, var(--awm-bark) 8%, transparent)' }}
          />
        )}
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
          sx={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
        />
      </Box>
      <Box sx={{ p: { xs: 1.25, sm: 2 }, display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: '0.95rem', sm: '1.2rem' }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</Typography>
        {book.titleAr && (
          <Typography lang="ar" dir="rtl" sx={{ mt: 0.25, fontFamily: 'var(--font-serif)', fontSize: { xs: '0.82rem', sm: '1.05rem' }, color: 'var(--awm-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{book.titleAr}</Typography>
        )}
        <Typography sx={{ mt: { xs: 0.75, sm: 1 }, fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.72rem', sm: '0.85rem' }, color: 'var(--awm-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {book.description}
        </Typography>
        <Box sx={{ mt: 'auto', pt: { xs: 1.25, sm: 1.75 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', minWidth: 0 }}>
            {book.level && (
              <Chip size="small" label={book.level} sx={{ height: { xs: 18, sm: 22 }, borderRadius: '9999px', fontSize: { xs: '0.6rem', sm: '0.7rem' }, fontWeight: 700, fontFamily: 'Jost, sans-serif', bgcolor: 'var(--awm-forest)', color: 'var(--awm-cream)' }} />
            )}
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.68rem', sm: '0.78rem' }, color: 'var(--awm-muted)' }}>
              {book.chapterCount} ch.
            </Typography>
          </Box>
          <ChevronRight sx={{ color: 'var(--awm-muted)', fontSize: { xs: 16, sm: 20 }, flexShrink: 0 }} />
        </Box>
      </Box>
    </Paper>
  )
}

function BooksSection({ books }: { books: PublicBook[] }) {
  if (books.length === 0) return null
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' }, gap: { xs: 1.25, sm: 2 } }}>
      {books.map((book) => (
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

function QuickLinks() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', sm: 'repeat(4, minmax(0,1fr))' }, gap: 1.5 }}>
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
    <Paper elevation={0} sx={{ display: 'grid', gridTemplateColumns: { xs: '110px minmax(0,1fr)', sm: '180px minmax(0,1fr)' }, minHeight: { xs: 165, sm: 220 }, overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '14px', bgcolor: 'var(--awm-white)' }}>
      {image ? <Box component="img" src={image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} /> : <Box sx={{ display: 'grid', placeItems: 'center', bgcolor: '#0e2e1f' }}><AutoStories sx={{ color: '#d4a843', fontSize: { xs: 34, sm: 46 } }} /></Box>}
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
    <Paper elevation={0} sx={{ minHeight: { xs: 140, md: 178 }, p: { xs: 1.75, sm: 3.5 }, border: '1px solid color-mix(in srgb, var(--awm-gold) 30%, transparent)', borderRadius: '14px', bgcolor: 'var(--awm-white)', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) auto' }, columnGap: 4, alignItems: 'end' }}>
      <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--awm-gold)' }}>
        <Bookmark sx={{ fontSize: 20 }} />
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Your reading bookmark
        </Typography>
      </Box>
      <Typography lang="ar" dir="rtl" sx={{ mt: 2, fontFamily: 'var(--font-serif)', fontSize: { xs: 19, sm: 28 }, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: 600, lineHeight: 1.6, color: 'var(--awm-bark)', textAlign: 'right' }}>
        {bookmark.arabic.slice(0, 150)}{bookmark.arabic.length > 150 ? '?' : ''}
      </Typography>
      {bookmark.translation && (
        <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 14, lineHeight: 1.6 }}>
          {bookmark.translation.slice(0, 130)}{bookmark.translation.length > 130 ? '?' : ''}
        </Typography>
      )}
      <Typography sx={{ mt: 1, color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 600 }}>
        {bookmark.bookTitle} · {bookmark.chapterTitle} · sentence {bookmark.blockIndex + 1}
      </Typography>
      </Box>
      <Button component={Link} href={bookSentenceBookmarkHref(bookmark)} endIcon={<ArrowForward />} sx={{ mt: { xs: 2, md: 0 }, px: { xs: 0, md: 2.5 }, py: { md: 1.1 }, width: 'fit-content', color: { xs: 'var(--awm-forest)', md: '#fff' }, bgcolor: { md: 'var(--awm-forest)' }, borderRadius: '9999px', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: { md: '#173f2d' } } }}>
        Continue from bookmark
      </Button>
    </Paper>
  )
}

function ResumeReadingCard({ book, chapter }: { book: PublicBook; chapter: PublicChapter }) {
  return (
    <Paper elevation={0} sx={{ minHeight: 160, p: { xs: 2.5, sm: 3.5 }, border: '1px solid color-mix(in srgb, var(--awm-gold) 26%, transparent)', borderRadius: '14px', bgcolor: 'var(--awm-white)', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2.5, transition: 'border-color .2s ease, box-shadow .2s ease, transform .2s ease', '&:hover': { borderColor: 'color-mix(in srgb, var(--awm-gold) 46%, transparent)', boxShadow: '0 14px 36px color-mix(in srgb, var(--awm-bark) 12%, transparent)' }, 'html[data-theme="dark"] &': { bgcolor: 'color-mix(in srgb, var(--awm-white) 86%, var(--awm-forest))', borderColor: 'color-mix(in srgb, var(--awm-gold-light) 38%, transparent)', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.24)' } }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--awm-gold)' }}><Bookmark sx={{ fontSize: 20 }} /><Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Resume reading</Typography></Box>
        <Typography sx={{ mt: 1.35, fontFamily: 'var(--font-heading)', fontSize: { xs: 25, sm: 29 }, fontWeight: 600, color: 'var(--awm-bark)' }}>{book.title}</Typography>
        <Typography sx={{ mt: 0.4, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 13 }}>{chapter.title} · Chapter {chapter.chapterNumber} of {book.chapterCount}</Typography>
      </Box>
      <Button component={Link} href={`/books/${book.slug}/${chapter.slug}`} variant="contained" endIcon={<ArrowForward />} sx={{ flexShrink: 0, bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '9999px', px: 2.5, textTransform: 'none', boxShadow: 'none', '&:hover': { bgcolor: '#173f2d', boxShadow: '0 8px 20px rgba(14, 46, 31, 0.24)' }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold-light) 72%, transparent)', outlineOffset: '3px' } }}>Resume chapter</Button>
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
  const level = calculateLearningLevel(activity.totalSeconds, activity.memory?.totalXp ?? 0)
  const week = summarizeWeeklyActivity(activity.daily, now)
  const comparison = week.comparisonPercent
  const comparisonText = comparison === null
    ? 'No previous-week comparison yet'
    : `${comparison >= 0 ? 'Up' : 'Down'} ${Math.abs(comparison)}% from last week`
  const ComparisonIcon = comparison !== null && comparison < 0 ? TrendingDownRounded : TrendingUpRounded
  const secondaryStats = [
    { label: 'Active today', value: formatLearningTime(week.todaySeconds), icon: AccessTimeRounded },
    { label: 'Reading this week', value: formatLearningTime(week.readingSeconds), icon: MenuBook },
    { label: 'Current streak', value: `${streak} day${streak === 1 ? '' : 's'}`, icon: LocalFireDepartmentRounded },
    { label: 'Books in progress', value: String(booksInProgress), icon: AutoStories },
    { label: 'Definitions viewed', value: String(week.wordLookups), icon: ExploreOutlined },
  ]


  return (
    <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3, md: 3.5 }, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '15px', bgcolor: 'var(--awm-white)' }}>
      <Box sx={{ mb: { xs: 2.25, md: 3 }, display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase' }}>At a glance</Typography>
          <Typography component="h2" sx={{ mt: 0.4, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 27, md: 32 }, fontWeight: 600, lineHeight: 1.15 }}>Your learning activity</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,minmax(0,1fr))' }, gap: 1.5 }}>
        <Box sx={{ minWidth: 0, p: { xs: 2, sm: 2.5 }, borderRadius: '12px', bgcolor: 'var(--awm-cream-light)', color: 'var(--awm-bark)' }}>
          <Typography sx={{ color: 'var(--awm-gold-light)', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Current level</Typography>
          <Typography sx={{ mt: 1.1, fontFamily: 'var(--font-heading)', color: 'var(--awm-bark)', fontSize: { xs: 35, md: 40 }, fontWeight: 600, lineHeight: 1 }}>Level {level.level}</Typography>
          <Typography sx={{ mt: 1.15, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 12 }}>{level.progressPercent}% to Level {level.level + 1}</Typography>
          <LinearProgress variant="determinate" value={level.progressPercent} sx={{ mt: 1, height: 6, borderRadius: 99, bgcolor: 'rgba(255,255,255,.14)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--awm-gold-light)', borderRadius: 99 } }} />
          <Typography sx={{ mt: 1.4, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 11 }}>{formatLearningTime(activity.totalSeconds)} total active learning</Typography>
        </Box>

        {activity.memory && <Box sx={{ minWidth: 0, p: { xs: 2, sm: 2.5 }, borderRadius: '12px', bgcolor: 'var(--awm-cream-light)' }}>
          <Typography sx={{ fontWeight: 700 }}>Memory Practice</Typography>
          <Typography sx={{ mt: 1, fontSize: 28 }}>{activity.memory.weekCards} cards this week</Typography>
          <Typography color="text.secondary">{activity.memory.weekXp} XP this week</Typography>
          <Typography color="text.secondary">{activity.memory.totalXp} total Memory XP</Typography>
        </Box>}

        <Box sx={{ minWidth: 0, p: { xs: 2, sm: 2.5 }, borderRadius: '12px', bgcolor: 'var(--awm-cream-light)' }}>
          <Typography sx={{ color: 'var(--awm-bark)', fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 700 }}>This week</Typography>
          <Typography sx={{ mt: 1.25, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 29, sm: 33 }, fontWeight: 600, lineHeight: 1.05 }}>{formatLearningTime(week.thisWeekSeconds)}</Typography>
          <Box sx={{ mt: 1.1, display: 'flex', alignItems: 'center', gap: 0.6, color: comparison !== null && comparison < 0 ? 'var(--awm-muted)' : 'var(--awm-forest)' }}>
            {comparison !== null && <ComparisonIcon sx={{ fontSize: 16 }} />}
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: 11.5 }}>{comparisonText}</Typography>
          </Box>
          <Box sx={{ mt: 1.4, display: 'flex', alignItems: 'center', gap: 0.75, color: 'var(--awm-muted)' }}>
            <CalendarMonthRounded sx={{ fontSize: 17, color: 'var(--awm-gold)' }} />
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 600 }}>{week.activeDays} active day{week.activeDays === 1 ? '' : 's'} this week</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(3,minmax(0,1fr))', md: 'repeat(5,minmax(0,1fr))' }, gap: 1 }}>
        {secondaryStats.map((stat) => {
          const Icon = stat.icon
          return <Box key={stat.label} sx={{ p: 1.5, minWidth: 0, border: '1px solid color-mix(in srgb, var(--awm-bark) 8%, transparent)', borderRadius: '10px' }}>
            <Icon sx={{ color: 'var(--awm-gold)', fontSize: 18 }} />
            <Typography sx={{ mt: 0.75, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: 21, fontWeight: 600, lineHeight: 1 }}>{stat.value}</Typography>
            <Typography sx={{ mt: 0.55, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 10.5, lineHeight: 1.3 }}>{stat.label}</Typography>
          </Box>
        })}
      </Box>
    </Paper>
  )
}

export default function HomeDashboard({ books, featuredBook, featuredEpisode, chaptersByBook, newShows, newEpisodes }: { books: PublicBook[]; featuredBook: PublicBook | null; featuredEpisode: FeaturedEpisode | null; chaptersByBook: Record<string, PublicChapter[]>; newShows: NewOnShow[]; newEpisodes: NewOnEpisode[] }) {
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
  const booksInProgress = Object.entries(progress).filter(([bookSlug, saved]) => (
    books.some((book) => book.slug === bookSlug) &&
    chaptersByBook[bookSlug]?.some((chapter) => chapter.slug === saved.chapterSlug)
  )).length

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

  if (loading) return <Box sx={{ minHeight: '65vh', display: 'grid', placeItems: 'center' }}><CircularProgress sx={{ color: '#b8860b' }} /></Box>

  const displayName = String(user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'learner').split(' ')[0]

  if (!user) {
    return (
      <Box component="main" sx={{ bgcolor: 'var(--awm-cream-light)', pb: { xs: 7, md: 11 } }}>
        <Box sx={{ position: 'relative', mt: { xs: '-56px', md: '-64px' }, minHeight: { xs: 520, md: 610 }, display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundImage: 'url(/homepage/hero.avif)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
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

        <Container maxWidth={false} className="awm-pattern-section" sx={{ pt: { xs: 4, md: 5 }, pb: { xs: 4, md: 5 } }}>
          <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>New on ArabicWithM</Typography>
          <NewOnRow items={showRowItems(newShows)} />
          <Typography component="h2" sx={{ mt: { xs: 3, md: 4 }, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Brand new episodes</Typography>
          <NewOnRow items={episodeRowItems(newEpisodes)} />
        </Container>

        <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 6 } }}>
          <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 22 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2 }}>Books</Typography>
          <Box sx={{ mt: 2 }}>
            <BooksSection books={books} />
          </Box>
        </Container>

        <PlanCompare shows={newShows} books={books} />

        <Container maxWidth="lg" sx={{ pt: 0 }}>
          {bookmark && (
            <Box sx={{ mt: { xs: 5, md: 7 }, maxWidth: 720 }}>
              <BookmarkContinueCard bookmark={bookmark} />
            </Box>
          )}
        </Container>
      </Box>
    )
  }

  const activity = activityUpdate?.userId === user.id
    ? activityUpdate.activity
    : parseLearningActivity(user.user_metadata)
  const activityDates = [
    ...activity.activeDates,
  ]
  const dashboardNow = new Date(dashboardLoadedAt)
  const streak = calculateLearningStreak(activityDates, dashboardNow)
  const bookmarkMatchesRecent = Boolean(
    bookmark && recentReading &&
    bookmark.bookSlug === recentReading.book.slug &&
    bookmark.chapterSlug === recentReading.chapter.slug
  )
  const readingPositionPercent = bookmarkMatchesRecent && recentReading?.chapter.blockCount
    ? Math.min(100, Math.max(0, Math.round((
        (recentReading.chapter.chapterNumber - 1) +
        Math.min(1, (bookmark!.blockIndex + 1) / recentReading.chapter.blockCount)
      ) / Math.max(recentReading.book.chapterCount, 1) * 100)))
    : null

  return (
    <Box component="main" sx={{ bgcolor: 'var(--awm-cream-light)', pb: { xs: 7, md: 11 } }}>
      <Box sx={{ position: 'relative', mt: { xs: '-56px', md: '-64px' }, pt: { xs: 14.5, md: 18 }, pb: { xs: 8, md: 10 }, overflow: 'hidden', backgroundImage: 'url(/homepage/hero.avif)', backgroundSize: 'cover', backgroundPosition: 'center 42%' }}>
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
        {(bookmark || recentReading) && (
          <Box sx={{ mb: 2.5 }}>
            {bookmark ? <BookmarkContinueCard bookmark={bookmark} /> : recentReading && <ResumeReadingCard book={recentReading.book} chapter={recentReading.chapter} />}
          </Box>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,minmax(0,1fr))' }, gap: 2.5 }}>
          {featuredEpisode && <ContentCard type={`Watch next · ${featuredEpisode.show.title}`} title={featuredEpisode.episode.title} description={featuredEpisode.episode.description} level={featuredEpisode.episode.level} href={`/cartoons/${featuredEpisode.show.slug}/${featuredEpisode.episode.slug}`} image={featuredEpisode.episode.cover} actionLabel="Play episode" />}
          {recentReading ? (
            <Paper elevation={0} sx={{ display: 'grid', gridTemplateColumns: { xs: '110px minmax(0,1fr)', sm: '180px minmax(0,1fr)' }, minHeight: 240, overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '15px', bgcolor: 'var(--awm-white)' }}>
              {recentReading.book.cover ? (
                <Box component="img" src={recentReading.book.cover} alt={`${recentReading.book.title} cover`} sx={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
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
                <Typography sx={{ mt: 0.75, color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 11, sm: 12 }, fontWeight: 600 }}>{recentReading.chapter.title} · Chapter {recentReading.chapter.chapterNumber} of {recentReading.book.chapterCount}</Typography>
                {readingPositionPercent !== null && <>
                  <Typography sx={{ mt: 1.7, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 11 }}>Saved reading position · {readingPositionPercent}% through book</Typography>
                  <LinearProgress variant="determinate" value={readingPositionPercent} sx={{ mt: 0.7, height: 7, borderRadius: 99, bgcolor: '#eee7dc', '& .MuiLinearProgress-bar': { bgcolor: '#b8860b', borderRadius: 99 } }} />
                </>}
                <Button component={Link} href={`/books/${recentReading.book.slug}/${recentReading.chapter.slug}`} variant="contained" endIcon={<ArrowForward />} sx={{ mt: readingPositionPercent !== null ? 2 : 2.5, bgcolor: '#0e2e1f', color: '#fff', borderRadius: '9999px', textTransform: 'none', '& .MuiButton-endIcon': { color: '#fff' }, '&:hover': { bgcolor: '#173f2d', color: '#fff' } }}>Continue Reading</Button>
              </Box>
            </Paper>
          ) : featuredBook ? <ContentCard type="Start reading" title={featuredBook.title} titleAr={featuredBook.titleAr} description={featuredBook.description} level={featuredBook.level} href={`/books/${featuredBook.slug}`} image={featuredBook.cover} /> : null}
        </Box>

        <Box sx={{ mt: { xs: 5, md: 7 } }}>
<LearningStats
  activity={activity}
  streak={streak}
  booksInProgress={booksInProgress}
  now={dashboardNow}
/>
        </Box>
        <Box sx={{ mt: { xs: 6, md: 9 } }}><SectionHeading eyebrow="Keep exploring" title="Keep your momentum" /><QuickLinks /></Box>
      </Container>
    </Box>
  )
}
