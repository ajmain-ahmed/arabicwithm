import LocalisedRegion from '@/app/components/LocalisedRegion'

import {UiText} from '@/app/components/WebsiteLocaleProvider'
import { Suspense } from 'react'
import Link from 'next/link'
import { Alert, Box, Container } from '@mui/material'
import { fetchBooksForPublic } from '@/app/actions/books'
import { fetchPublishedAudioLanguagesForBooks } from '@/app/actions/audiobooks'
import type { AudioLanguage } from '@/app/lib/audioUpload'
import BooksLibrary from './BooksLibrary'

export const revalidate = 3600

export const metadata = {
  title: 'Arabic Books',
  description: 'Read graded Arabic books and stories by CEFR level and category, with translations and audiobook support.',
  alternates: { canonical: '/books' },
}

export default async function BooksPage() {
  const books = await fetchBooksForPublic()
  let audioLanguages:Record<string,AudioLanguage[]>={},audioUnavailable=false
  try{audioLanguages=await fetchPublishedAudioLanguagesForBooks(books.map(book=>book.id))}
  catch(error){console.error('[books] optional audio availability failed',error);audioUnavailable=true}
  const readingLevels=['a1','a2','b1','b2','c1','c2'].filter(level=>books.filter(book=>book.isCompleted!==false&&book.level?.toLowerCase()===level).length>=2)

  return (
    <Box component="div" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pb: { xs: 5, md: 9 } }}>
      <Container maxWidth={false} sx={{ pt: { xs: 2.5, md: 5 }, px: { xs: 1.5, sm: 3, xl: 6 } }}>
        {readingLevels.length>0&&<LocalisedRegion component="nav" aria-label="Browse Arabic books by CEFR level" sx={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:1,mb:2,color:'var(--awm-muted)',fontSize:13}}>
          <span><UiText>{"Browse by level:"}</UiText></span>{readingLevels.map(level=><Link key={level} href={`/books/level/${level}`} style={{color:'var(--awm-forest)',fontWeight:700,padding:'4px 8px'}}>{level.toUpperCase()}</Link>)}
        </LocalisedRegion>}
        {audioUnavailable&&<Alert severity="info" sx={{mb:2}}><UiText>{"Audio availability is temporarily unavailable. Reading is still available."}</UiText></Alert>}
        <Suspense><BooksLibrary books={books} audioLanguagesByBook={audioLanguages} /></Suspense>
      </Container>
    </Box>
  )
}
