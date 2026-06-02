'use client'

import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Container,
  Drawer,
  IconButton,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { useRouter } from 'next/navigation'
import { BookMeta } from '@/app/lib/books'
import {
  FilterSidebar,
  ContentCard,
  ComingSoonSection,
} from '@/app/components/content-grid'
import { PageBanner, HowItWorksSection, PlacementTestCTA } from '@/app/components/page-layout'

/* ── MUI Icons ── */
import {
  PlayArrow,
  MenuBook,
  School,
  TouchApp,
  AutoStories,
  FormatListBulleted,
  Translate,
  Close,
  Tune,
} from '@mui/icons-material'

/* ── Palette ── */
const BARK = '#2c1a0e'
const GOLD = '#b8860b'
const WARM_WHITE = '#fffaf0'
const MUTED = '#7a6e65'

const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const COMING_SOON = [
  { title: 'The Olive Tree', category: 'Literature', level: 'A2-B1', date: 'Coming March 2026' },
  { title: 'Cairo Nights', category: 'Contemporary Fiction', level: 'B1-B2', date: 'Coming April 2026' },
  { title: 'The Last Poet', category: 'Literature', level: 'B2-C1', date: 'Coming May 2026' },
  { title: 'Letters from Damascus', category: 'Historical', level: 'A2-B1', date: 'Coming June 2026' },
]

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */
export default function WrittenBooksPage({
  books,
  chaptersMap,
}: {
  books: BookMeta[]
  chaptersMap: Record<string, string[]>
}) {
  const [activeCategory, setActiveCategory] = useState('All Books')
  const [activeLevel, setActiveLevel] = useState('')
  const [activeGenre, setActiveGenre] = useState('')
  const [activeLanguage, setActiveLanguage] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const router = useRouter()

  // Derive filter options from book data
  const categories = useMemo(() => {
    const cats = new Set(books.map((b) => b.category).filter((c): c is string => Boolean(c)))
    return ['All Books', ...Array.from(cats).sort()]
  }, [books])

  const genres = useMemo(() => {
    const g = new Set(books.map((b) => b.genre).filter((x): x is string => Boolean(x)))
    return Array.from(g).sort()
  }, [books])

  const languages = useMemo(() => {
    const langs = new Set<string>()
    for (const book of books) {
      for (const lang of book.languageStyle ?? []) {
        langs.add(lang)
      }
    }
    return Array.from(langs).sort()
  }, [books])

  const filteredBooks = books.filter((b) => {
    const catMatch = activeCategory === 'All Books' || b.category === activeCategory
    const levelMatch = !activeLevel || b.level === activeLevel
    const genreMatch = !activeGenre || b.genre === activeGenre
    const languageMatch = !activeLanguage || (b.languageStyle ?? []).includes(activeLanguage)
    return catMatch && levelMatch && genreMatch && languageMatch
  })

  const goToRandomChapter = () => {
    const bookSlugs = Object.keys(chaptersMap).filter(
      (slug) => chaptersMap[slug].length > 0
    )
    if (bookSlugs.length === 0) return
    const randomBook = bookSlugs[Math.floor(Math.random() * bookSlugs.length)]
    const chs = chaptersMap[randomBook]
    const randomCh = chs[Math.floor(Math.random() * chs.length)]
    router.push(`/learn/reading/written/${randomBook}/${randomCh}`)
  }

  const activeFilterCount =
    (activeCategory !== 'All Books' ? 1 : 0) +
    (activeLevel ? 1 : 0) +
    (activeGenre ? 1 : 0) +
    (activeLanguage ? 1 : 0)

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        background: WARM_WHITE,
        pt: { xs: '56px', md: '64px' },
        pb: { xs: 0, md: 8 },
      }}
    >
      <PageBanner
        title="Written Arabic"
        titleAr="النَّصُوصُ الْعَرَبِيَّةُ"
        description="Read Arabic books with inline vocabulary, grammar notes, and word-by-word annotations."
        features={[
          { icon: <MenuBook sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Word-by-Word Annotations' },
          { icon: <Translate sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Transliteration & Audio' },
          { icon: <School sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Grammar Notes' },
        ]}
        ctaLabel="Take Me Anywhere"
        ctaAction={goToRandomChapter}
        ctaStartIcon={<PlayArrow sx={{ fontSize: 20 }} />}
        backgroundImage="/cartoons/cartooons.avif"
      />

      {/* ═══════════════════════════════════════════════
          CONTENT
         ═══════════════════════════════════════════════ */}
      <Container
        maxWidth="xl"
        sx={{
          position: 'relative',
          zIndex: 2,
          px: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 4, md: 6 },
        }}
      >
        {/* ── Book grid section ── */}
        <Box>
          {/* Section Header */}
          <Box id="books-section" sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
            <Typography
              sx={{
                fontFamily: '"Jost", system-ui, sans-serif',
                fontSize: { xs: 13, md: 14 },
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: GOLD,
                mb: 0.5,
              }}
            >
              Browse Collection
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontSize: { xs: 24, md: 32 },
                color: BARK,
                mb: 1,
              }}
            >
              {activeCategory}
            </Typography>
            <Box
              sx={{
                width: 48,
                height: 2,
                borderRadius: '2px',
                backgroundColor: GOLD,
                mx: 'auto',
              }}
            />
          </Box>

          {/* Mobile Filter Button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Button
              startIcon={<Tune />}
              onClick={() => setFilterDrawerOpen(true)}
              sx={{
                height: 40,
                px: 2,
                borderRadius: '6px',
                fontFamily: '"Jost", system-ui, sans-serif',
                fontSize: 13,
                fontWeight: 500,
                textTransform: 'none',
                color: BARK,
                border: '1px solid rgba(44,26,14,0.15)',
                backgroundColor: WARM_WHITE,
                '&:hover': { backgroundColor: 'rgba(44,26,14,0.04)' },
              }}
            >
              Filters
              {activeFilterCount > 0 && (
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: GOLD,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {activeFilterCount}
                </Box>
              )}
            </Button>
            <Typography sx={{ fontSize: 13, color: MUTED }}>
              {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
            </Typography>
          </Box>

          {/* Desktop: Sidebar + Grid Layout */}
          <Box sx={{ display: 'flex', gap: { md: 4, lg: 5 } }}>
            {/* Sidebar — desktop only */}
            <Box
              sx={{
                width: 240,
                flexShrink: 0,
                display: { xs: 'none', md: 'block' },
              }}
            >
              <Box sx={{ position: 'sticky', top: 100, alignSelf: 'flex-start' }}>
                <FilterSidebar
                  categories={categories}
                  levels={LEVELS}
                  genres={genres}
                  languages={languages}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  activeLevel={activeLevel}
                  setActiveLevel={setActiveLevel}
                  activeGenre={activeGenre}
                  setActiveGenre={setActiveGenre}
                  activeLanguage={activeLanguage}
                  setActiveLanguage={setActiveLanguage}
                />
              </Box>
            </Box>

            {/* Book Grid */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Desktop result count */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', mb: 2 }}>
                <Typography sx={{ fontSize: 13, color: MUTED }}>
                  {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
                </Typography>
              </Box>

              {filteredBooks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 20, color: BARK, mb: 1 }}>
                    No books match your filters
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: MUTED, mb: 2 }}>
                    Try adjusting your category or level selection.
                  </Typography>
                  <Button
                    onClick={() => {
                      setActiveCategory('All Books')
                      setActiveLevel('')
                      setActiveGenre('')
                      setActiveLanguage('')
                    }}
                    sx={{
                      borderRadius: '9999px',
                      px: 3,
                      py: 1,
                      fontFamily: '"Jost", system-ui, sans-serif',
                      textTransform: 'none',
                      color: BARK,
                      border: '1px solid rgba(44,26,14,0.15)',
                    }}
                  >
                    Reset Filters
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredBooks.map((book) => (
                    <Grid size={{ xs: 12, sm: 6, xl: 3 }} key={book.slug}>
                      <ContentCard
                        slug={book.slug}
                        hrefPrefix="/learn/reading/written"
                        cover={book.cover}
                        title={book.title}
                        titleAr={book.titleAr}
                        description={book.description}
                        category={book.category}
                        genre={book.genre}
                        level={book.level}
                        overlayIcon={<AutoStories sx={{ fontSize: 20, color: BARK }} />}
                        aspectRatio="2/3"
                        metaItems={[
                          {
                            icon: <MenuBook sx={{ fontSize: 14, color: '#9e8a7a' }} />,
                            label: `${book.vocabCount ?? 0} words`,
                          },
                          {
                            icon: <FormatListBulleted sx={{ fontSize: 14, color: '#9e8a7a' }} />,
                            label: `${book.chaptersCount ?? 0} ${(book.chaptersCount ?? 0) === 1 ? 'chapter' : 'chapters'}`,
                          },
                        ]}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>
        </Box>

        <HowItWorksSection
            steps={[
              {
                icon: <MenuBook sx={{ fontSize: 22, color: '#b8860b' }} />,
                title: 'Read with Annotations',
                desc: 'Every word is clickable — see definitions, transliteration, and grammar notes instantly',
              },
              {
                icon: <TouchApp sx={{ fontSize: 22, color: '#b8860b' }} />,
                title: 'Click Any Word',
                desc: 'Instant definitions, transliteration & audio pronunciation',
              },
              {
                icon: <AutoStories sx={{ fontSize: 22, color: '#b8860b' }} />,
                title: 'Review & Learn',
                desc: 'Save words to your personal vocabulary deck',
              },
            ]}
          />

        <PlacementTestCTA
          heading="Not Sure Where to Start?"
          description="Take a quick placement test to find books matched to your Arabic level."
          ctaLabel="Take Placement Test"
        />

        <ComingSoonSection
          label="Coming Soon"
          heading="More Books on the Way"
          items={COMING_SOON}
        />
      </Container>

      {/* ═══════════════════════════════════════════════
          MOBILE FILTER DRAWER
         ═══════════════════════════════════════════════ */}
      <Drawer
        anchor="left"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 300,
              backgroundColor: WARM_WHITE,
              p: 3,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: 20,
              color: BARK,
            }}
          >
            Filters
          </Typography>
          <IconButton onClick={() => setFilterDrawerOpen(false)} size="small">
            <Close sx={{ fontSize: 20, color: MUTED }} />
          </IconButton>
        </Box>
        <FilterSidebar
          categories={categories}
          levels={LEVELS}
          genres={genres}
          languages={languages}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          activeLevel={activeLevel}
          setActiveLevel={setActiveLevel}
          activeGenre={activeGenre}
          setActiveGenre={setActiveGenre}
          activeLanguage={activeLanguage}
          setActiveLanguage={setActiveLanguage}
          onMobileClose={() => setFilterDrawerOpen(false)}
          hideTitle
        />
      </Drawer>
    </Box>
  )
}
