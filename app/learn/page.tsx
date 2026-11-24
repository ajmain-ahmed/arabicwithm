import { randomInt } from 'node:crypto'
import { Box, Button, Paper, Typography } from '@mui/material'
import { websiteQuestions } from '@/app/grammar/websiteQuestions'
import { PuzzleActivity, GrammarActivity, MemoryActivity } from './PracticeActivities'
export const metadata = {
  title: 'Learn Arabic',
  description: 'Practise Arabic with Memory flashcards, grammar activities, and vocabulary word searches.',
  alternates: { canonical: '/learn' },
}
export const dynamic = 'force-dynamic'
export default function LearnPage() {
  const question = websiteQuestions[randomInt(websiteQuestions.length)]
  const panels = [
    { name: 'Word Search activity', title: 'Word Search', content: <PuzzleActivity /> },
    { name: 'Grammar activity', title: 'Grammar practice', content: <><GrammarActivity question={question} /><Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 2 }}><Button href="/grammar?branch=nahw">Explore Naḥw</Button><Button href="/grammar?branch=sarf">Explore Ṣarf</Button></Box></> },
    { name: 'Memory activity', title: 'Memory practice', content: <MemoryActivity /> },
  ]
  return <Box sx={{ px: { xs: 1.5, sm: 3 }, py: 3, pb: 'var(--awm-mobile-bottom-clearance)' }}>
    <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: 30, mb: 1 }}>A little Arabic, every day</Typography>
    <Typography sx={{ color: 'var(--awm-muted)', mb: 3 }}>Three activities ready for you. Take them at your own pace.</Typography>
    <Box data-learn-workspace sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))' }, gap: 2, alignItems: 'start' }}>
      {panels.map(panel => <Paper key={panel.name} component="section" aria-label={panel.name} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: '12px' }}><Typography component="h2" sx={{ fontSize: 22, mb: 2 }}>{panel.title}</Typography>{panel.content}</Paper>)}
    </Box>
    <Box component="nav" aria-label="Learning areas" sx={{display:'flex',justifyContent:'center',gap:2,flexWrap:'wrap',mt:3}}><Button href="/grammar">Grammar</Button><Button href="/word-search">Word Search</Button><Button href="/memory">Memory</Button></Box>
  </Box>
}
