import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Box, Container, Typography } from '@mui/material'
import { fetchBooksForPublic } from '@/app/actions/books'
import LibraryBookCard, { LIBRARY_GRID_SX } from '@/app/books/LibraryBookCard'
import StructuredData from '@/app/components/StructuredData'
import { absoluteUrl, breadcrumbJsonLd } from '@/app/lib/seo'

const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const
const introductions: Record<string, string> = {
  a1: 'Start with accessible graded stories, clear translations and vocabulary support for your first steps in Arabic reading.',
  a2: 'Build reading confidence with longer elementary Arabic stories, helpful translations and familiar everyday vocabulary.',
  b1: 'Move into independent Arabic reading with intermediate stories that develop vocabulary, comprehension and grammatical range.',
  b2: 'Challenge your upper-intermediate Arabic with richer stories, more varied sentence structures and broader vocabulary.',
  c1: 'Read advanced Arabic fiction with nuanced language, sustained narratives and opportunities to refine your comprehension.',
  c2: 'Explore sophisticated Arabic writing with complex expression, advanced vocabulary and full-length reading practice.',
}

async function booksAtLevel(level: string) {
  const books = await fetchBooksForPublic()
  return books.filter(book => book.isCompleted !== false && book.level.toLowerCase() === level)
}

export async function generateStaticParams() {
  const params: Array<{ level: string }> = []
  for (const level of levels) if ((await booksAtLevel(level)).length >= 2) params.push({ level })
  return params
}

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params
  if (!levels.includes(level as (typeof levels)[number])) return { title: 'Reading Level Not Found' }
  const count = (await booksAtLevel(level)).length
  const upper = level.toUpperCase(), title = `${upper} Arabic Books | Graded Readers`
  return {
    title,
    description: `${introductions[level]} Browse ${count} released ${upper} Arabic books on ArabicWithM.`,
    alternates: { canonical: `/books/level/${level}` },
    robots: count < 2 ? { index: false, follow: true } : undefined,
  }
}

export default function BookLevelPage({ params }: { params: Promise<{ level: string }> }) {
  return renderLevel(params)
}

async function renderLevel(params: Promise<{ level: string }>) {
  const { level } = await params
  if (!levels.includes(level as (typeof levels)[number])) notFound()
  const books = await booksAtLevel(level)
  if (books.length < 2) notFound()
  const upper = level.toUpperCase(), path = `/books/level/${level}`
  return <Box sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', py: { xs: 3, md: 6 } }}>
    <StructuredData data={[
      breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Arabic Books', path: '/books' }, { name: `${upper} Arabic Books`, path }]),
      {
        '@context': 'https://schema.org', '@type': 'ItemList', name: `${upper} Arabic Books`,
        itemListElement: books.map((book, index) => ({ '@type': 'ListItem', position: index + 1, name: book.title, url: absoluteUrl(`/books/${encodeURIComponent(book.slug)}`) })),
      },
    ]} />
    <Container maxWidth="xl">
      <Link href="/books" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--awm-muted)' }}>← All Arabic books</Link>
      <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 32, md: 46 }, color: 'var(--awm-bark)' }}>{upper} Arabic Books</Typography>
      <Typography sx={{ mt: 1.5, mb: 3, maxWidth: 760, color: 'var(--awm-muted)', fontSize: { xs: 16, md: 18 }, lineHeight: 1.65 }}>{introductions[level]}</Typography>
      <Box component="section" aria-label={`${upper} Arabic Books`} sx={LIBRARY_GRID_SX}>
        {books.map(book => <LibraryBookCard key={book.id} book={book} compact />)}
      </Box>
    </Container>
  </Box>
}
