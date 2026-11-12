import { Suspense } from 'react'
import { Alert, Box, Container } from '@mui/material'
import { fetchBooksForPublic } from '@/app/actions/books'
import { fetchBookIdsWithPublishedAudio } from '@/app/actions/audiobooks'
import BooksLibrary from './BooksLibrary'

export const revalidate = 3600

export const metadata = {
  title: 'Arabic Books | ArabicWithM',
  description: 'Read graded Arabic books and stories by level and category.',
}

export default async function BooksPage() {
  const books = await fetchBooksForPublic()
  let audioBookIds:string[]=[],audioUnavailable=false
  try{audioBookIds=await fetchBookIdsWithPublishedAudio(books.map(book=>book.id))}
  catch(error){console.error('[books] optional audio availability failed',error);audioUnavailable=true}

  return (
    <Box component="div" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pb: { xs: 5, md: 9 } }}>
      <Container maxWidth={false} sx={{ pt: { xs: 2.5, md: 5 }, px: { xs: 1.5, sm: 3, xl: 6 } }}>
        {audioUnavailable&&<Alert severity="info" sx={{mb:2}}>Audio availability is temporarily unavailable. Reading is still available.</Alert>}
        <Suspense><BooksLibrary books={books} audioBookIds={audioBookIds} /></Suspense>
      </Container>
    </Box>
  )
}
