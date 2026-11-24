import { Suspense } from 'react'
import { randomInt } from 'node:crypto'
import { Alert, Box, Button, LinearProgress, Paper, Typography } from '@mui/material'
import { fetchPuzzleVocabulary } from '@/app/actions/puzzles'
import { fetchMemoryLibrary } from '@/app/actions/memory'
import { generateWordSearch } from '@/app/lib/transcriptPuzzles'
import { websiteQuestions } from '@/app/grammar/websiteQuestions'
import { boundedRead } from '@/app/lib/readRecovery'
import { PuzzleActivity, GrammarActivity, MemoryActivity } from './PracticeActivities'
export const metadata = {
  title: 'Learn Arabic',
  description: 'Practise Arabic with Memory flashcards, grammar activities, and vocabulary word searches.',
  alternates: { canonical: '/learn' },
}
export const dynamic = 'force-dynamic'
async function Puzzle() {
  let source, puzzle
  try {
    source = await boundedRead(fetchPuzzleVocabulary(undefined, 6), 10000)
    if (source) puzzle = generateWordSearch(source.words, { difficulty: 'easy' })
  } catch { return <Alert severity="warning">Word Search could not load. Refresh to retry.</Alert> }
  if (!source || !puzzle) return <Alert severity="info">No suitable puzzle is available. <Button href="/word-search">Try Word Search</Button></Alert>
  return <PuzzleActivity source={source} puzzle={puzzle} />
}
async function Memory() {
  let library
  try {
    library = await boundedRead(fetchMemoryLibrary(), 10000)
  } catch { return <Alert severity="warning">Memory could not load. Refresh to retry.</Alert> }
  if (!library.cards.length) return <Alert severity="info">No Memory cards are available. <Button href="/memory">Open Memory</Button></Alert>
  const first = library.cards[0]
  const cards = library.cards.filter(card => card.episodeId === first.episodeId).slice(0, 5)
  return <><Typography sx={{ fontSize: 13, mb: 2 }}>From: <a href={`/cartoons/${first.showSlug}/${first.episodeSlug}`}>{first.episodeTitle}</a></Typography><MemoryActivity library={{ ...library, cards, recommendedCardCount: 5, availableCardCount: cards.length }} /></>
}
export default function LearnPage() {
  const question = websiteQuestions[randomInt(websiteQuestions.length)]
  const sarf = Boolean(question.wordPattern) || ['roots', 'morphology', 'conjugation'].includes(question.activity)
  const panels = [
    { name: 'Word Search activity', title: 'Word Search', content: <Suspense fallback={<LinearProgress aria-label="Loading Word Search" />}><Puzzle /></Suspense> },
    { name: 'Grammar activity', title: `${sarf ? 'Ṣarf' : 'Naḥw'} practice`, content: <><GrammarActivity question={question} /><Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 2 }}><Button href="/grammar?branch=nahw">Explore Naḥw</Button><Button href="/grammar?branch=sarf">Explore Ṣarf</Button></Box></> },
    { name: 'Memory activity', title: 'Memory practice', content: <Suspense fallback={<LinearProgress aria-label="Loading Memory" />}><Memory /></Suspense> },
  ]
  return <Box sx={{ px: { xs: 1.5, sm: 3 }, py: 3, pb: 'var(--awm-mobile-bottom-clearance)' }}>
    <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: 30, mb: 1 }}>A little Arabic, every day</Typography>
    <Typography sx={{ color: 'var(--awm-muted)', mb: 3 }}>Three activities ready for you. Take them at your own pace.</Typography>
    <Box data-learn-workspace sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))' }, gap: 2, alignItems: 'start' }}>
      {panels.map(panel => <Paper key={panel.name} component="section" aria-label={panel.name} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: '12px' }}><Typography component="h2" sx={{ fontSize: 22, mb: 2 }}>{panel.title}</Typography>{panel.content}</Paper>)}
    </Box>
  </Box>
}
