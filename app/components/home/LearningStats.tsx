'use client'

import { useState } from 'react'
import {
  AccessTimeRounded,
  AutoStories,
  CalendarMonthRounded,
  Close,
  ExploreOutlined,
  GridOnRounded,
  LocalFireDepartmentRounded,
  MenuBook,
  PsychologyOutlined,
} from '@mui/icons-material'
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Paper, SwipeableDrawer, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { summarizeLearningDashboard } from '@/app/lib/learningDashboard'
import { formatLearningTime, type LearningActivity } from '@/app/lib/activity'

export default function LearningStats({
  activity,
  streak,
  booksInProgress,
  now,
}: {
  activity: LearningActivity
  streak: number
  booksInProgress: number
  now: Date
}) {
  const theme = useTheme()
  const mobileDetail = useMediaQuery(theme.breakpoints.down('sm'))
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const summary = summarizeLearningDashboard(activity, now)
  const { week } = summary
  const comparison = week.comparisonPercent
  const comparisonText = comparison === null
    ? 'No previous-week comparison yet'
    : `${comparison >= 0 ? 'Up' : 'Down'} ${Math.abs(comparison)}% from last week`
  const metrics = [
    ...(activity.memory ? [{ id: 'memory', ...summary.memory, icon: PsychologyOutlined }] : []),
    ...(activity.wordSearch ? [{ id: 'word-search', ...summary.wordSearch, icon: GridOnRounded }] : []),
    { id: 'week', label: 'Learning this week', value: formatLearningTime(week.thisWeekSeconds), icon: CalendarMonthRounded, description: `${week.activeDays} active day${week.activeDays === 1 ? '' : 's'} this week. ${comparisonText}.` },
    { id: 'today', label: 'Active today', value: formatLearningTime(week.todaySeconds), icon: AccessTimeRounded, description: 'Active learning time recorded today while reading, watching, or practising.' },
    { id: 'reading', label: 'Reading this week', value: formatLearningTime(week.readingSeconds), icon: MenuBook, description: 'Time spent actively reading ArabicWithM books during the current week.' },
    { id: 'streak', label: 'Current streak', value: `${streak} day${streak === 1 ? '' : 's'}`, icon: LocalFireDepartmentRounded, description: 'Consecutive calendar days with recorded learning activity.' },
    { id: 'books', label: 'Books in progress', value: String(booksInProgress), icon: AutoStories, description: 'Books with saved reading progress on this account.' },
    { id: 'definitions', label: 'Words inspected this week', value: String(week.wordLookups), icon: ExploreOutlined, description: 'Arabic word definitions opened during the current week.' },
  ]
  const selected = metrics.find((metric) => metric.id === selectedMetric) ?? null
  const closeDetail = () => setSelectedMetric(null)
  const detailPanel = selected ? (() => {
    const DetailIcon = selected.icon
    return <Box sx={{ px: { xs: 2.5, sm: 3 }, pt: { xs: 1, sm: 0 }, pb: { xs: 'calc(24px + env(safe-area-inset-bottom))', sm: 3 } }}>
      <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: '14px', bgcolor: 'color-mix(in srgb, var(--awm-gold) 13%, transparent)', color: 'var(--awm-gold)' }}><DetailIcon sx={{ fontSize: 29 }} /></Box>
      <Typography sx={{ mt: 2, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{selected.label}</Typography>
      <Typography sx={{ mt: 0.5, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: 36, fontWeight: 600, lineHeight: 1.1 }}>{selected.value}</Typography>
      <Typography sx={{ mt: 1.25, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', lineHeight: 1.6 }}>{selected.description}</Typography>
    </Box>
  })() : null

  return (
    <>
    <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '15px', bgcolor: 'var(--awm-white)' }}>
      <Typography component="h2" sx={{ mb: { xs: 1.25, sm: 1.5 }, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 21, sm: 24 }, fontWeight: 600, lineHeight: 1.15 }}>Your learning activity</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(4,minmax(0,1fr))', sm: `repeat(${metrics.length},minmax(0,1fr))` }, gap: { xs: 0.65, sm: 0.8 } }}>
        {metrics.map((metric) => {
          const Icon = metric.icon
          return <Box component="button" type="button" key={metric.id} onClick={() => setSelectedMetric(metric.id)} aria-label={`${metric.label}: ${metric.value}. Show details`} sx={{ minWidth: 0, minHeight: { xs: 74, sm: 82 }, p: { xs: 0.7, sm: 1 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.65, border: '1px solid color-mix(in srgb, var(--awm-bark) 8%, transparent)', borderRadius: '10px', bgcolor: 'var(--awm-cream-light)', color: 'var(--awm-bark)', font: 'inherit', cursor: 'pointer', transition: 'border-color .15s ease, transform .15s ease, background-color .15s ease', '&:hover': { borderColor: 'color-mix(in srgb, var(--awm-gold) 48%, transparent)', bgcolor: 'color-mix(in srgb, var(--awm-gold) 7%, var(--awm-cream-light))', transform: { sm: 'translateY(-2px)' } }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', outlineOffset: 2 } }}>
            <Icon aria-hidden="true" sx={{ color: 'var(--awm-gold)', fontSize: { xs: 21, sm: 24 } }} />
            <Typography sx={{ maxWidth: '100%', color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 14, sm: 16 }, fontWeight: 700, lineHeight: 1.05, textAlign: 'center', overflowWrap: 'anywhere' }}>{metric.value}</Typography>
          </Box>
        })}
      </Box>
    </Paper>
    {mobileDetail ? (
      <SwipeableDrawer anchor="bottom" open={Boolean(selected)} onOpen={() => undefined} onClose={closeDetail} disableSwipeToOpen disableDiscovery slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-label': selected?.label ?? 'Learning activity detail', sx: { borderRadius: '22px 22px 0 0', bgcolor: 'var(--awm-white)', maxHeight: '82dvh' } } }}>
        <Box aria-hidden="true" sx={{ width: 42, height: 5, borderRadius: 999, bgcolor: 'color-mix(in srgb, var(--awm-bark) 24%, transparent)', mx: 'auto', mt: 1.25, mb: 1 }} />
        {detailPanel}
      </SwipeableDrawer>
    ) : (
      <Dialog open={Boolean(selected)} onClose={closeDetail} fullWidth maxWidth="xs" aria-labelledby="learning-metric-title" slotProps={{ paper: { sx: { borderRadius: '16px', bgcolor: 'var(--awm-white)' } } }}>
        <DialogTitle id="learning-metric-title" sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}><IconButton aria-label="Close details" onClick={closeDetail}><Close /></IconButton></DialogTitle>
        <DialogContent sx={{ p: 0 }}>{detailPanel}</DialogContent>
      </Dialog>
    )}
    </>
  )
}
