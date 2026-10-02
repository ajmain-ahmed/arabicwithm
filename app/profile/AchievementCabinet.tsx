'use client'
import { useState } from 'react'
import { AutoStories, EmojiEventsRounded, ExploreOutlined, LocalFireDepartmentRounded, MilitaryTechRounded, PsychologyOutlined, ScheduleRounded, SmartDisplayOutlined, StarsRounded, GridOnRounded } from '@mui/icons-material'
import { Box, Button, Chip, LinearProgress, Paper, Tooltip, Typography } from '@mui/material'
import { ACHIEVEMENT_FAMILIES, achievementMetrics, achievementPage, type AchievementCategory } from '@/app/lib/achievements'
import type { LearningActivity } from '@/app/lib/activity'
const icons = { levels: MilitaryTechRounded, xp: StarsRounded, time: ScheduleRounded, words: ExploreOutlined, memory: PsychologyOutlined, reading: AutoStories, watching: SmartDisplayOutlined, streaks: LocalFireDepartmentRounded, puzzles: GridOnRounded, breadth: EmojiEventsRounded }

export default function AchievementCabinet({ activity }: { activity: LearningActivity }) {
  const [category, setCategory] = useState<AchievementCategory | undefined>(), [page, setPage] = useState(0)
  const metrics = achievementMetrics(activity)
  const cabinet = achievementPage(metrics, category, page)
  return <Box component="section" aria-labelledby="achievements-heading" sx={{ mt: 5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><Typography id="achievements-heading" component="h2" variant="h4">Trophy cabinet</Typography><Chip label={`${cabinet.earnedTotal} earned`} icon={<EmojiEventsRounded />} /></Box>
    <Typography sx={{ mt: 1, color: 'var(--awm-muted)' }}>{cabinet.earnedTotal ? 'Every milestone reflects your recorded learning. Keep building your collection.' : 'Your first milestone is ahead. Read, watch or practise to start your collection.'}</Typography>
    <Box aria-label="Achievement categories" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
      <Button size="small" aria-pressed={!category} variant={!category ? 'contained' : 'outlined'} onClick={() => { setCategory(undefined); setPage(0) }}>Highlights</Button>
      {ACHIEVEMENT_FAMILIES.map(f => <Button key={f.id} size="small" aria-pressed={category === f.id} variant={category === f.id ? 'contained' : 'outlined'} onClick={() => { setCategory(f.id); setPage(0) }}>{({ levels: 'Levels', xp: 'XP', time: 'Time', words: 'Words', memory: 'Memory', reading: 'Reading', watching: 'Watching', streaks: 'Streaks', puzzles: 'Word Search', breadth: 'Exploration' })[f.id]}</Button>)}
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(3,minmax(0,1fr))', md: 'repeat(4,minmax(0,1fr))' }, gap: 1.5 }}>
      {cabinet.items.map(item => {
        const Icon = icons[item.category]
        const progress = Number(item.progress.toFixed(1)).toLocaleString('en-GB')
        const explanation = `${item.earned ? 'Earned' : 'Next milestone'}: ${item.requirement} ${progress} / ${item.threshold.toLocaleString('en-GB')}.`
        return <Tooltip title={explanation} key={item.id} describeChild enterTouchDelay={0}>
          <Paper tabIndex={0} aria-label={`${item.name}. ${explanation}`} elevation={0} sx={{ minWidth: 0, p: { xs: 1.75, sm: 2.5 }, textAlign: 'center', borderRadius: '14px', border: `1px solid color-mix(in srgb, var(--awm-${item.earned ? 'gold' : 'bark'}) ${item.earned ? 40 : 12}%, transparent)`, background: item.earned ? 'linear-gradient(145deg, var(--awm-white), color-mix(in srgb, var(--awm-gold) 10%, var(--awm-white)))' : 'var(--awm-white)', boxShadow: item.earned ? '0 4px 18px color-mix(in srgb, var(--awm-gold) 12%, transparent)' : 'none', transition: 'transform .18s ease, box-shadow .18s ease', '&:hover, &:focus-visible': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px color-mix(in srgb, var(--awm-gold) 15%, transparent)' }, '&:focus-visible': { outline: '3px solid var(--awm-gold)', outlineOffset: 2 }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover, &:focus-visible': { transform: 'none' } } }}>
            <Box sx={{ width: 64, height: 64, mx: 'auto', display: 'grid', placeItems: 'center', bgcolor: item.earned ? 'color-mix(in srgb, var(--awm-gold) 15%, transparent)' : 'var(--awm-cream-light)', borderRadius: item.category === 'levels' ? '18px' : '50%', border: '1px solid color-mix(in srgb, var(--awm-gold) 25%, transparent)' }}><Icon aria-hidden="true" sx={{ fontSize: 36, color: item.earned ? 'var(--awm-gold)' : 'var(--awm-muted)' }} /></Box>
            <Typography sx={{ mt: 1.5, fontWeight: 700, color: 'var(--awm-bark)', fontSize: 14 }}>{item.name}</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12, color: 'var(--awm-muted)', minHeight: 36 }}>{item.requirement}</Typography>
            <Typography sx={{ my: 1, fontSize: 12, color: 'var(--awm-muted)' }}>{item.earned ? 'Earned' : `${progress} / ${item.threshold.toLocaleString('en-GB')}`}</Typography>
            <LinearProgress aria-label={`${item.name} progress`} variant="determinate" value={item.progress / item.threshold * 100} sx={{ height: 5, borderRadius: 99 }} />
          </Paper>
        </Tooltip>
      })}
    </Box>
    {category && <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}><Button disabled={!page} onClick={() => setPage(p => p - 1)}>Previous milestones</Button><Typography>Page {page + 1}</Typography><Button disabled={!cabinet.hasNext} onClick={() => setPage(p => p + 1)}>Next milestones</Button></Box>}
  </Box>
}
