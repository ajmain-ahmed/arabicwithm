'use client'

import { useId, useState } from 'react'
import { AutoStories, Close, LocalFireDepartmentRounded, PsychologyOutlined, ScheduleRounded, StarsRounded, TravelExploreOutlined } from '@mui/icons-material'
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Paper, SwipeableDrawer, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { PublicProfile } from '@/app/actions/profiles'
import { formatLearningTime, type DailyLearningActivity } from '@/app/lib/activity'

export default function LearningProgress({ profile }: { profile: PublicProfile }) {
  const { learning, summary } = profile
  const [selected, setSelected] = useState<string | null>(null)
  const id = useId(), mobile = useMediaQuery(useTheme().breakpoints.down('sm'))
  const metrics = [
    { id: 'xp', label: 'Total XP', value: profile.xp.toLocaleString('en-GB'), detail: `${profile.weekXp} XP this week`, icon: StarsRounded, daily: (d: DailyLearningActivity) => `${d.xp ?? 0} XP` },
    { id: 'time', label: 'Total learning time', value: summary.time, detail: `${formatLearningTime(summary.week.thisWeekSeconds)} this week`, icon: ScheduleRounded, daily: (d: DailyLearningActivity) => formatLearningTime(d.activeSeconds) },
    { id: 'words', label: 'Total words inspected', value: (learning.lifetime?.wordLookups ?? 0).toLocaleString('en-GB'), detail: `${summary.week.wordLookups} this week`, icon: TravelExploreOutlined, daily: (d: DailyLearningActivity) => `${d.wordLookups} inspections` },
    { id: 'streak', label: 'Longest recorded streak', value: `${summary.longestStreak} days`, detail: 'At least 1 minute of active learning each day', icon: LocalFireDepartmentRounded, daily: null },
    { id: 'reading', label: 'Total reading time', value: formatLearningTime(learning.lifetime?.readingSeconds ?? 0), detail: `${formatLearningTime(summary.week.readingSeconds)} this week`, icon: AutoStories, daily: (d: DailyLearningActivity) => formatLearningTime(d.readingSeconds) },
    { id: 'watching', label: 'Total watch time', value: formatLearningTime(learning.lifetime?.videoSeconds ?? 0), detail: `${formatLearningTime(summary.week.videoSeconds)} this week`, icon: ScheduleRounded, daily: (d: DailyLearningActivity) => formatLearningTime(d.videoSeconds) },
    { id: 'memory', label: 'Memory cards reviewed', value: profile.memoryCards.toLocaleString('en-GB'), detail: `${learning.memory?.weekCards ?? 0} reviews this week`, icon: PsychologyOutlined, daily: (d: DailyLearningActivity) => `${d.memoryCards ?? 0} reviews` },
    { id: 'puzzles', label: 'Word Searches completed', value: (learning.wordSearch?.total ?? 0).toLocaleString('en-GB'), detail: `${learning.wordSearch?.weekCompleted ?? 0} this week`, icon: TravelExploreOutlined, daily: (d: DailyLearningActivity) => `${d.wordSearches ?? 0} puzzles` },
  ]
  const metric = metrics.find(item => item.id === selected)
  const content = metric && <Box sx={{ p: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}><Typography id={id} component="h2" variant="h5">{metric.label}</Typography><IconButton aria-label="Close activity details" onClick={() => setSelected(null)}><Close /></IconButton></Box>
    <Typography sx={{ mt: 1.5, fontSize: 32, fontWeight: 700 }}>{metric.value}</Typography><Typography sx={{ color: 'var(--awm-muted)' }}>{metric.detail}</Typography>
    {metric.daily ? <><Typography sx={{ mt: 2, fontWeight: 600 }}>Recent recorded days</Typography>{learning.daily.length ? <Box component="table" sx={{ width: '100%', mt: 1, fontSize: 14, '& th, & td': { py: 0.75, textAlign: 'left' } }}><thead><tr><th scope="col">Date</th><th scope="col">Activity</th></tr></thead><tbody>{learning.daily.slice(-14).reverse().map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{metric.daily!(day)}</td></tr>)}</tbody></Box> : <Typography sx={{ mt: 1 }}>No daily activity recorded yet.</Typography>}<Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontSize: 12 }}>Dated activity only. Historical progress without a recorded date remains in lifetime totals.</Typography></> : <><Typography sx={{ mt: 2 }}>Current streak: {summary.streak} days</Typography><Typography sx={{ mt: 1, color: 'var(--awm-muted)' }}>{learning.activeDates.length ? `Recent qualifying days: ${learning.activeDates.slice(-14).join(', ')}` : 'No qualifying active days yet.'}</Typography></>}
  </Box>
  return <>
    <Box component="section" aria-label="Learning statistics" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' }, gap: 2, my: 3 }}>
      {['Learning progress', 'Learning activity'].map((title, index) => <Paper component="section" key={title} elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '16px', bgcolor: 'var(--awm-white)' }}><Typography component="h2" variant="h5">{title}</Typography><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 1, mt: 2 }}>
        {metrics.slice(index * 4, index * 4 + 4).map(item => <Box component="button" type="button" key={item.id} onClick={() => setSelected(item.id)} aria-label={`${item.label}: ${item.value}. Show activity details`} sx={{ minWidth: 0, p: 1.5, border: 0, borderRadius: '12px', bgcolor: 'var(--awm-cream-light)', color: 'var(--awm-bark)', font: 'inherit', textAlign: 'left', cursor: 'pointer', '&:hover': { bgcolor: 'color-mix(in srgb, var(--awm-gold) 12%, var(--awm-white))' }, '&:focus-visible': { outline: '3px solid var(--awm-gold)', outlineOffset: 2 } }}><item.icon aria-hidden="true" sx={{ color: 'var(--awm-gold)' }} /><Typography sx={{ fontSize: 12, mt: 0.5 }}>{item.label}</Typography><Typography sx={{ fontSize: { xs: 24, sm: 30 }, fontWeight: 600, overflowWrap: 'anywhere' }}>{item.value}</Typography><Typography sx={{ color: 'var(--awm-muted)', fontSize: 12 }}>{item.detail}</Typography></Box>)}
      </Box></Paper>)}
    </Box>
    {mobile ? <SwipeableDrawer anchor="bottom" open={Boolean(metric)} onClose={() => setSelected(null)} onOpen={() => undefined} disableSwipeToOpen slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': id, sx: { borderRadius: '18px 18px 0 0', maxHeight: '85dvh', pb: 'env(safe-area-inset-bottom)' } } }}>{content}</SwipeableDrawer> : <Dialog open={Boolean(metric)} onClose={() => setSelected(null)} aria-labelledby={id} maxWidth="sm" fullWidth><DialogTitle sx={{ display: 'none' }}>Activity details</DialogTitle><DialogContent sx={{ p: 0 }}>{content}</DialogContent></Dialog>}
  </>
}
