'use client'
import { useId, useState } from 'react'
import Link from 'next/link'
import { Box, Button, Paper, Typography } from '@mui/material'
import type { LearningActivity } from '@/app/lib/activity'
import { formatLearningTime } from '@/app/lib/activity'
import { learningChartDays } from '@/app/lib/learningChart'
export default function ActivityChart({ activity }: { activity: LearningActivity }) {
  const [days, setDays] = useState(7), [metric, setMetric] = useState<'time' | 'xp'>('time')
  const id = useId(), rows = learningChartDays(activity, days)
  const values = rows.map(row => metric === 'time' ? row.seconds / 60 : row.xp)
  const max = Math.max(1, ...values), hasActivity = values.some(v => v > 0), gap = 650 / days
  return <Paper component="section" elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '16px' }}>
    <Typography component="h2" variant="h5">Your learning rhythm</Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5, mb: 2 }}>
      {[7, 28].map(n => <Button key={n} size="small" aria-pressed={days === n} variant={days === n ? 'contained' : 'outlined'} onClick={() => setDays(n)}>Last {n} days</Button>)}
      {(['time', 'xp'] as const).map(m => <Button key={m} size="small" aria-pressed={metric === m} variant={metric === m ? 'contained' : 'outlined'} onClick={() => setMetric(m)}>{m === 'time' ? 'Recorded time' : 'XP earned'}</Button>)}
    </Box>
    {hasActivity ? <Box component="svg" role="img" aria-labelledby={`${id}-title ${id}-desc`} viewBox="0 0 700 190" sx={{ display: 'block', width: '100%', overflow: 'visible' }}>
      <title id={`${id}-title`}>{metric === 'time' ? 'Recorded learning minutes' : 'XP earned'} in the last {days} days</title>
      <desc id={`${id}-desc`}>Each bar represents a calendar day. Exact values are available in the activity table below.</desc>
      <line x1="35" x2="695" y1="155" y2="155" stroke="var(--awm-muted-light)" />
      <text x="0" y="18" fill="var(--awm-muted)" fontSize="11">{Math.ceil(max)}</text><text x="15" y="155" fill="var(--awm-muted)" fontSize="11">0</text>
      {rows.map((row, index) => <g key={row.date}><rect x={35 + index * gap + 4} y={155 - values[index] / max * 130} width={Math.max(3, gap - 8)} height={values[index] / max * 130} rx="4" fill="var(--awm-gold)"><title>{row.date}: {metric === 'time' ? formatLearningTime(row.seconds) : `${row.xp} XP`}</title></rect>{(days === 7 || index % 7 === 0 || index === days - 1) && <text x={35 + index * gap + gap / 2} y="177" textAnchor="middle" fill="var(--awm-muted)" fontSize="11">{row.date.slice(5)}</text>}</g>)}
    </Box> : <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'var(--awm-cream-light)', borderRadius: '12px' }}><Typography>No {metric === 'time' ? 'learning time' : 'XP'} recorded in the last {days} days.</Typography><Button component={Link} href="/books">Find your next read</Button></Box>}
    <Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontSize: 12 }}>Calendar: Europe/London. Historical XP without a recorded date appears only in lifetime totals.</Typography>
    <Box component="details" sx={{ mt: 2 }}><Box component="summary" sx={{ cursor: 'pointer', color: 'var(--awm-forest)' }}>View daily activity values</Box><Box sx={{ overflowX: 'auto', mt: 1 }}><Box component="table" sx={{ width: '100%', fontSize: 13, textAlign: 'left', '& th, & td': { p: 0.75 } }}><thead><tr><th scope="col">Date</th><th scope="col">Recorded time</th><th scope="col">XP earned</th></tr></thead><tbody>{rows.map(row => <tr key={row.date}><th scope="row">{row.date}</th><td>{formatLearningTime(row.seconds)}</td><td>{row.xp}</td></tr>)}</tbody></Box></Box></Box>
  </Paper>
}
