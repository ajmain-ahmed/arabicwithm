'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import {
  ArrowForward,
  AutoStories,
  Headphones,
  MenuBook,
  Movie,
  SchoolOutlined,
  Search,
  Translate,
  VolumeUp,
} from '@mui/icons-material'
import { Box, Button, Chip, CircularProgress, Container, LinearProgress, Paper, Typography } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import type { PublicBook, PublicChapter } from '@/app/actions/books'
import type { VocabularyEntry } from '@/app/actions/vocabulary'
import PracticeWordButton from '@/app/components/vocab-tooltip/PracticeWordButton'
import type { ShowMeta } from '@/app/lib/cartoons'
import { parsePracticeWords } from '@/app/lib/practice'

interface ProgressEntry { chapterSlug: string; updatedAt?: string }

const LEARNING_AREAS = [
  { title: 'Cartoons', body: 'Watch entertaining Arabic content with interactive subtitles.', href: '/cartoons', icon: Movie },
  { title: 'Books', body: 'Read graded Arabic stories at a comfortable pace.', href: '/books', icon: MenuBook },
  { title: 'Practice', body: 'Review vocabulary with focused flashcard sessions.', href: '/practice', icon: SchoolOutlined },
  { title: 'Vocabulary', body: 'Search Arabic words, roots and English meanings.', href: '/vocabulary', icon: Translate },
]

const QUICK_PRACTICE = [
  { title: 'Vocabulary', label: 'Review saved words', href: '/practice', icon: Translate },
  { title: 'Reading', label: 'Open graded books', href: '/books', icon: AutoStories },
  { title: 'Listening', label: 'Watch with subtitles', href: '/cartoons', icon: Headphones },
  { title: 'Dictionary', label: 'Look up a word', href: '/vocabulary', icon: Search },
]

function openAuth(mode: 'register' | 'signin') {
  window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode } }))
}

function definitionWithoutTransliteration(definition: string, transliteration?: string): string {
  if (!transliteration) return definition
  const forms = [transliteration, ...transliteration.split('/')]
    .map((form) => form.trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
  return forms.reduce((text, form) => {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.replace(new RegExp(`^${escaped}[\\s,;:–—-]+`, 'i'), '')
  }, definition).trim()
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      {eyebrow && <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{eyebrow}</Typography>}
      <Typography component="h2" sx={{ mt: eyebrow ? 0.5 : 0, fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 30, md: 39 }, fontWeight: 700, color: '#2c1a0e', lineHeight: 1.15 }}>{title}</Typography>
      {detail && <Typography sx={{ mt: 0.75, color: '#7a6e65', fontFamily: 'Jost, sans-serif', lineHeight: 1.65 }}>{detail}</Typography>}
    </Box>
  )
}

function WordOfDayCard({ entry, guest }: { entry: VocabularyEntry | null; guest: boolean }) {
  if (!entry) return null
  const definition = definitionWithoutTransliteration(entry.english, entry.transliteration)
  const speak = () => {
    if (!('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(entry.arabic)
    utterance.lang = 'ar'
    window.speechSynthesis.speak(utterance)
  }
  return (
    <Paper elevation={0} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' }, overflow: 'hidden', border: '1px solid rgba(212,168,67,0.24)', borderRadius: '16px', bgcolor: '#0e2e1f' }}>
      <Box sx={{ p: { xs: 3, md: 4.5 }, bgcolor: '#0e2e1f', color: '#fff', textAlign: 'center', display: 'grid', placeItems: 'center' }}>
        <Box>
          <Typography sx={{ color: '#fff', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Word of the day</Typography>
          <Typography lang="ar" dir="rtl" sx={{ mt: 1.5, fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 48, md: 58 }, fontWeight: 700, lineHeight: 1.25, color: '#fff' }}>{entry.arabic}</Typography>
          {entry.root && <Typography lang="ar" dir="rtl" sx={{ color: 'rgba(255,255,255,0.65)', fontFamily: '"EB Garamond", Georgia, serif', fontSize: 18 }}>الجذر: {entry.root}</Typography>}
        </Box>
      </Box>
      <Box sx={{ p: { xs: 3, md: 4.5 }, position: 'relative', bgcolor: '#173f2d', color: '#fff' }}>
        <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
          <PracticeWordButton entry={{ arabic: entry.arabic, plain: entry.arabic, headword: entry.arabic, transliteration: entry.transliteration ?? '', english: definition, pos: entry.isRoot ? 'root' : 'word', entry_type: 'word' }} />
        </Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase' }}>English</Typography>
        <Typography sx={{ mt: 0.75, pr: 4, fontFamily: '"EB Garamond", Georgia, serif', color: '#fff', fontSize: { xs: 25, md: 29 }, fontWeight: 600, lineHeight: 1.35 }}>{definition}</Typography>
        {entry.transliteration && <Typography sx={{ mt: 1.25, color: '#d4a843', fontFamily: 'Jost, sans-serif', fontSize: 15, fontStyle: 'italic' }}>{entry.transliteration}</Typography>}
        {guest && <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,0.7)', fontFamily: 'Jost, sans-serif', fontSize: 13 }}>Create a free account to save vocabulary.</Typography>}
        <Box sx={{ mt: 2.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={speak} startIcon={<VolumeUp />} variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.45)', color: '#fff', textTransform: 'none', borderRadius: '9999px' }}>Listen</Button>
          <Button component={Link} href={`/vocabulary?q=${encodeURIComponent(entry.arabic)}`} endIcon={<ArrowForward />} sx={{ color: '#d4a843', textTransform: 'none', borderRadius: '9999px' }}>View in Dictionary</Button>
        </Box>
      </Box>
    </Paper>
  )
}

function LearningAreaCards() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' }, gap: 2 }}>
      {LEARNING_AREAS.map((area) => {
        const Icon = area.icon
        return (
          <Paper key={area.title} component={Link} href={area.href} elevation={0} sx={{ p: 2.75, color: 'inherit', textDecoration: 'none', border: '1px solid rgba(44,26,14,0.08)', borderRadius: '13px', bgcolor: '#fff', transition: 'transform .2s ease, box-shadow .2s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 30px rgba(44,26,14,0.09)' } }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(184,134,11,0.1)', color: '#b8860b' }}><Icon /></Box>
            <Typography sx={{ mt: 2, fontFamily: '"EB Garamond", Georgia, serif', fontSize: 24, fontWeight: 700, color: '#2c1a0e' }}>{area.title}</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: 'Jost, sans-serif', fontSize: 14, color: '#7a6e65', lineHeight: 1.6 }}>{area.body}</Typography>
          </Paper>
        )
      })}
    </Box>
  )
}

function QuickPractice() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', md: 'repeat(4, minmax(0,1fr))' }, gap: 1.5 }}>
      {QUICK_PRACTICE.map((item) => {
        const Icon = item.icon
        return (
          <Paper key={item.title} component={Link} href={item.href} elevation={0} sx={{ p: { xs: 2, md: 2.5 }, textDecoration: 'none', border: '1px solid rgba(44,26,14,0.08)', borderRadius: '12px', color: '#2c1a0e', '&:hover': { borderColor: 'rgba(184,134,11,0.5)' } }}>
            <Icon sx={{ color: '#b8860b' }} />
            <Typography sx={{ mt: 1, fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>{item.title}</Typography>
            <Typography sx={{ mt: 0.25, fontFamily: 'Jost, sans-serif', color: '#7a6e65', fontSize: 12 }}>{item.label}</Typography>
          </Paper>
        )
      })}
    </Box>
  )
}

function ContentCard({ type, title, titleAr, description, level, href, image }: { type: string; title: string; titleAr?: string; description?: string; level?: string; href: string; image?: string }) {
  return (
    <Paper elevation={0} sx={{ display: 'grid', gridTemplateColumns: { xs: '110px minmax(0,1fr)', sm: '180px minmax(0,1fr)' }, minHeight: 220, overflow: 'hidden', border: '1px solid rgba(44,26,14,0.08)', borderRadius: '14px', bgcolor: '#fff' }}>
      {image ? <Box component="img" src={image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Box sx={{ display: 'grid', placeItems: 'center', bgcolor: '#0e2e1f' }}><AutoStories sx={{ color: '#d4a843', fontSize: 46 }} /></Box>}
      <Box sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
        <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{type}</Typography>
        {titleAr && <Typography lang="ar" dir="rtl" sx={{ mt: 0.5, fontFamily: '"EB Garamond", Georgia, serif', fontSize: 23, fontWeight: 700, color: '#2c1a0e', textAlign: 'left' }}>{titleAr}</Typography>}
        <Typography sx={{ mt: titleAr ? 0 : 0.75, fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: '#2c1a0e', lineHeight: 1.2 }}>{title}</Typography>
        {description && <Typography sx={{ mt: 0.75, color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontSize: 13, lineHeight: 1.55, display: { xs: 'none', sm: '-webkit-box' }, WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{description}</Typography>}
        {level && <Chip size="small" label={level} sx={{ mt: 1.5, bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508', fontWeight: 700 }} />}
        <Button component={Link} href={href} endIcon={<ArrowForward />} sx={{ display: 'flex', width: 'fit-content', mt: 1.5, px: 0, color: '#0e2e1f', fontWeight: 700, textTransform: 'none' }}>Explore</Button>
      </Box>
    </Paper>
  )
}

export default function HomeDashboard({ books, shows, chaptersByBook, wordOfTheDay }: { books: PublicBook[]; shows: ShowMeta[]; chaptersByBook: Record<string, PublicChapter[]>; wordOfTheDay: VocabularyEntry | null }) {
  const { user, loading } = useAuth()
  const words = useMemo(() => parsePracticeWords(user?.user_metadata), [user])
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

  if (loading) return <Box sx={{ minHeight: '65vh', display: 'grid', placeItems: 'center' }}><CircularProgress sx={{ color: '#b8860b' }} /></Box>

  const featuredShow = shows[0]
  const featuredBook = books[0]
  const displayName = String(user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'learner').split(' ')[0]
  const practised = words.reduce((sum, word) => sum + word.practiceCount, 0)
  const mastered = words.filter((word) => word.mastery >= 6).length

  if (!user) {
    return (
      <Box component="main" sx={{ bgcolor: '#faf7f2', pb: { xs: 7, md: 11 } }}>
        <Box sx={{ position: 'relative', mt: { xs: '-56px', md: '-64px' }, minHeight: { xs: 590, md: 690 }, display: 'flex', alignItems: 'center', overflow: 'hidden', backgroundImage: 'url(/homepage/hero.avif)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,23,15,0.9) 0%, rgba(5,23,15,0.72) 52%, rgba(5,23,15,0.38) 100%)' }} />
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: { xs: 12, md: 14 }, pb: { xs: 7, md: 9 } }}>
            <Box sx={{ maxWidth: 720 }}>
              <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>Watch · Read · Practise</Typography>
              <Typography component="h1" sx={{ mt: 1.5, color: '#fff', fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 42, sm: 54, md: 67 }, fontWeight: 700, lineHeight: 1.02, textShadow: '0 3px 22px rgba(0,0,0,0.55)' }}>Learn Arabic through cartoons, books, and practice</Typography>
              <Typography sx={{ mt: 2, maxWidth: 610, color: 'rgba(255,255,255,0.86)', fontFamily: 'Jost, sans-serif', lineHeight: 1.75, textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>Build your Arabic naturally through entertaining content, graded stories, vocabulary and interactive review.</Typography>
              <Box sx={{ mt: 3.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button onClick={() => openAuth('register')} variant="contained" endIcon={<ArrowForward />} sx={{ bgcolor: '#d4a843', color: '#0e2e1f', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#e3bb58' } }}>Start Learning</Button>
                <Button component={Link} href="/cartoons" sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.5)', px: 3, py: 1.25, borderRadius: '9999px', textTransform: 'none', bgcolor: 'rgba(0,0,0,0.16)' }}>Browse Cartoons</Button>
              </Box>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 8 } }}>
          <LearningAreaCards />
          <Box sx={{ mt: { xs: 7, md: 10 } }}><SectionHeading eyebrow="Start exploring" title="Featured learning" detail="A simple place to begin—no account history required." />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,minmax(0,1fr))' }, gap: 2.5 }}>
              {featuredShow && <ContentCard type="Featured cartoon" title={featuredShow.title} titleAr={featuredShow.titleAr} description={featuredShow.description} level={featuredShow.level} href={`/cartoons/${featuredShow.slug}`} image={featuredShow.cover} />}
              {featuredBook && <ContentCard type="Featured book" title={featuredBook.title} titleAr={featuredBook.titleAr} description={featuredBook.description} level={featuredBook.level} href={`/books/${featuredBook.slug}`} image={featuredBook.cover} />}
            </Box>
          </Box>
          <Box sx={{ mt: { xs: 7, md: 10 } }}><WordOfDayCard entry={wordOfTheDay} guest /></Box>
          <Box sx={{ mt: { xs: 7, md: 10 } }}><SectionHeading eyebrow="Quick practice" title="Choose how you want to learn" /><QuickPractice /></Box>
          <Paper elevation={0} sx={{ mt: { xs: 7, md: 10 }, p: { xs: 3, md: 5 }, borderRadius: '16px', bgcolor: '#f2e9da', border: '1px solid rgba(184,134,11,0.18)', textAlign: 'center' }}>
            <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 30, md: 40 }, fontWeight: 700, color: '#2c1a0e' }}>Create an account to track your learning</Typography>
            <Typography sx={{ mt: 1, color: '#7a6e65', fontFamily: 'Jost, sans-serif' }}>Save words, continue reading, keep practice history, and return to your learning whenever you like.</Typography>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button onClick={() => openAuth('register')} variant="contained" sx={{ bgcolor: '#0e2e1f', color: '#fff', borderRadius: '9999px', px: 3, textTransform: 'none', '&:hover': { bgcolor: '#173f2d', color: '#fff' } }}>Sign Up for Free</Button>
              <Button onClick={() => openAuth('signin')} sx={{ color: '#0e2e1f', textTransform: 'none' }}>Log In</Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    )
  }

  return (
    <Box component="main" sx={{ bgcolor: '#faf7f2', pb: { xs: 7, md: 11 } }}>
      <Box sx={{ position: 'relative', mt: { xs: '-56px', md: '-64px' }, pt: { xs: 13, md: 16 }, pb: { xs: 5, md: 7 }, backgroundImage: 'url(/homepage/hero.avif)', backgroundSize: 'cover', backgroundPosition: 'center 42%' }}>
        <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(5,23,15,0.82)' }} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Your learning</Typography>
          <Typography component="h1" sx={{ mt: 0.75, color: '#fff', fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 40, md: 58 }, fontWeight: 700, lineHeight: 1.08 }}>Welcome back, {displayName}</Typography>
          <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.68)', fontFamily: 'Jost, sans-serif' }}>Pick up where you left off or choose something new.</Typography>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 } }}>
        <SectionHeading eyebrow="Continue learning" title={recentReading ? 'Your next step is ready' : 'Start your next lesson'} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,minmax(0,1fr))' }, gap: 2.5 }}>
          {recentReading ? (
            <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, border: '1px solid rgba(44,26,14,0.08)', borderRadius: '15px', bgcolor: '#fff' }}>
              <Typography sx={{ color: '#b8860b', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.13em', textTransform: 'uppercase' }}>Continue reading</Typography>
              {recentReading.book.titleAr && <Typography lang="ar" dir="rtl" sx={{ mt: 1.5, textAlign: 'left', fontFamily: '"EB Garamond", Georgia, serif', fontSize: 28, fontWeight: 700, color: '#2c1a0e' }}>{recentReading.book.titleAr}</Typography>}
              <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 25, fontWeight: 700, color: '#2c1a0e' }}>{recentReading.book.title}</Typography>
              <Typography sx={{ mt: 0.5, color: '#7a6e65', fontFamily: 'Jost, sans-serif' }}>{recentReading.chapter.title}</Typography>
              <LinearProgress variant="determinate" value={Math.round(recentReading.chapter.chapterNumber / Math.max(recentReading.book.chapterCount, 1) * 100)} sx={{ mt: 2.5, height: 7, borderRadius: 99, bgcolor: '#eee7dc', '& .MuiLinearProgress-bar': { bgcolor: '#b8860b', borderRadius: 99 } }} />
              <Button component={Link} href={`/books/${recentReading.book.slug}/${recentReading.chapter.slug}`} variant="contained" endIcon={<ArrowForward />} sx={{ mt: 2.5, bgcolor: '#0e2e1f', borderRadius: '9999px', textTransform: 'none' }}>Continue Reading</Button>
            </Paper>
          ) : featuredBook ? <ContentCard type="Start reading" title={featuredBook.title} titleAr={featuredBook.titleAr} description={featuredBook.description} level={featuredBook.level} href={`/books/${featuredBook.slug}`} image={featuredBook.cover} /> : null}
          {featuredShow && <ContentCard type="Watch next" title={featuredShow.title} titleAr={featuredShow.titleAr} description={featuredShow.description} level={featuredShow.level} href={`/cartoons/${featuredShow.slug}`} image={featuredShow.cover} />}
        </Box>

        <Box sx={{ mt: { xs: 5, md: 7 } }}>
          <SectionHeading eyebrow="At a glance" title="Your learning activity" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,minmax(0,1fr))' }, gap: 1.5 }}>
            {[['Saved words', words.length], ['Practice answers', practised], ['Mastered words', mastered], ['Books started', Object.keys(progress).length]].map(([label, value]) => (
              <Paper key={label} elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: '1px solid rgba(44,26,14,0.08)', borderRadius: '12px', bgcolor: '#fff' }}>
                <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 30, md: 37 }, fontWeight: 700, color: '#2c1a0e' }}>{value}</Typography>
                <Typography sx={{ color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontSize: 12 }}>{label}</Typography>
              </Paper>
            ))}
          </Box>
        </Box>
        <Box sx={{ mt: { xs: 6, md: 9 } }}><WordOfDayCard entry={wordOfTheDay} guest={false} /></Box>
        <Box sx={{ mt: { xs: 6, md: 9 } }}><SectionHeading eyebrow="Quick practice" title="Keep your momentum" /><QuickPractice /></Box>
      </Container>
    </Box>
  )
}
