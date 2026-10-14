import { Box, Container } from '@mui/material'
import { fetchBooksForPublic } from '@/app/actions/books'
import { fetchBookIdsWithPublishedAudio } from '@/app/actions/audiobooks'
import BooksLibrary from './BooksLibrary'

export const revalidate = 60

export const metadata = {
  title: 'Arabic Books | ArabicWithM',
  description: 'Read graded Arabic books and stories by level and category.',
}

export default async function BooksPage() {
  const books = await fetchBooksForPublic()
  const audioBookIds = await fetchBookIdsWithPublishedAudio(books.map((book) => book.id))

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pb: { xs: 5, md: 9 } }}>
      <Container maxWidth={false} sx={{ pt: { xs: 2.5, md: 5 }, px: { xs: 1.5, sm: 3, xl: 6 } }}>
        <BooksLibrary books={books} audioBookIds={audioBookIds} />
      </Container>
    </Box>
  )
}
