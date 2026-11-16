import { notFound } from 'next/navigation'
import { Box, Container, Typography } from '@mui/material'
import Button from '@/app/components/RouteButton'
import { fetchPublicGrammarNotes } from '@/app/actions/canonicalGrammar'
export default async function Page({ params, searchParams }: { params: Promise<{ level: string }>; searchParams: Promise<{ page?: string }> }) {
  const { level } = await params
  if (!['A1','A2','B1','B2','C1','C2'].includes(level)) notFound()
  const requestedPage = Number((await searchParams).page ?? 0)
  const page = Number.isInteger(requestedPage) && requestedPage >= 0 && requestedPage <= 10000 ? requestedPage : 0
  const { notes, hasMore } = await fetchPublicGrammarNotes({ level, page })
  return <Container maxWidth="md" sx={{ py: 4 }}>
    <Button href="/grammar/context">Back to Grammar in Context</Button>
    <Typography component="h1" variant="h3" sx={{ my: 3 }}>{level} Grammar Notes</Typography>
    {!notes.length && <Typography role="status">No approved Grammar Notes are available at this level yet.</Typography>}
    <Box sx={{ display: 'grid', gap: 2 }}>{notes.map(note => <Button href={`/grammar/notes/${note.id}`} key={note.id} variant="outlined" sx={{ p: 2, textTransform: 'none', display: 'block', textAlign: 'start' }}>
      <Typography component="span" sx={{ display: 'block' }}>{note.title_en}</Typography><Typography component="span" lang="ar" dir="rtl" sx={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 24 }}>{note.title_ar}</Typography>
    </Button>)}</Box>
    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>{page > 0 && <Button href={`/grammar/context/${level}?page=${page-1}`}>Previous</Button>}{hasMore && <Button href={`/grammar/context/${level}?page=${page+1}`}>Next</Button>}</Box>
  </Container>
}
