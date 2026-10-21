import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Box, Container } from '@mui/material'
import { fetchBookBySlugPublic, fetchChaptersForBookPublic } from '@/app/actions/books'
import { fetchPublishedAudioForBook } from '@/app/actions/audiobooks'
import AudiobookPlayer from '@/app/books/AudiobookPlayer'

export const metadata = { title: 'Listen | ArabicWithM' }

export default async function ListenPage({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params
  const book = await fetchBookBySlugPublic(slug)
  if (!book) notFound()
  const [chapters, audio] = await Promise.all([fetchChaptersForBookPublic(book.id), fetchPublishedAudioForBook(book.id)])
  if (!audio.length) notFound()
  return <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 }, pb: 10 }}>
    <Box sx={{ mb: 2 }}><Link href="/books?mode=listen" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, color: 'var(--awm-forest)' }}>Back to Listen library</Link></Box>
    <AudiobookPlayer book={book} chapters={chapters} audio={audio} />
  </Container>
}
