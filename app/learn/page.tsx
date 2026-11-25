import { randomInt } from 'node:crypto'
import { Box, Button, Typography } from '@mui/material'
import PracticePanel from './PracticePanel'
import LearnNavigationTiles from './LearnNavigationTiles'
import { websiteQuestions } from '@/app/grammar/websiteQuestions'
import { PuzzleActivity, GrammarActivity, MemoryActivity } from './PracticeActivities'
import {UiText} from '@/app/components/WebsiteLocaleProvider'
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
    { name: 'Grammar activity', title: 'Grammar practice', content: <><GrammarActivity question={question} /><Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 2 }}><Button href="/grammar?branch=nahw"><UiText>{"Explore Naḥw"}</UiText></Button><Button href="/grammar?branch=sarf"><UiText>{"Explore Ṣarf"}</UiText></Button></Box></> },
    { name: 'Memory activity', title: 'Memory practice', content: <MemoryActivity /> },
  ]
  return <Box sx={{ px: { xs: 1.5, sm: 3 }, py: 3, pb: 'var(--awm-mobile-bottom-clearance)' }}>
    <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: 30, mb: 1 }}><UiText>{"A little Arabic, every day"}</UiText></Typography>
    <Typography sx={{ color: 'var(--awm-muted)', mb: 3 }}><UiText>{"Three activities ready for you. Take them at your own pace."}</UiText></Typography>
    <Box data-learn-workspace dir="ltr" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(3,minmax(0,1fr))' }, gap: 2, alignItems: 'start' }}>
      {panels.map(panel => <Box key={panel.name} data-learn-column={panel.name} sx={{minWidth:0}}><PracticePanel name={panel.name} title={panel.title}>{panel.content}</PracticePanel>{panel.name==='Grammar activity'&&<Box sx={{display:{xs:'none',md:'block'}}}><LearnNavigationTiles/></Box>}</Box>)}
    </Box>
    <Box sx={{display:{xs:'block',md:'none'}}}><LearnNavigationTiles/></Box>
  </Box>
}
