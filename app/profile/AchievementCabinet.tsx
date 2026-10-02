'use client'
import { useState } from 'react'
import { AutoStories, Close, EmojiEventsRounded, ExploreOutlined, LocalFireDepartmentRounded, MilitaryTechRounded, PsychologyOutlined, ScheduleRounded, SmartDisplayOutlined, StarsRounded, GridOnRounded } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, LinearProgress, Paper, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ACHIEVEMENT_FAMILIES, achievementMetrics, achievementPage, achievementPreview, type Achievement } from '@/app/lib/achievements'
import type { LearningActivity } from '@/app/lib/activity'
import { supabase } from '@/app/lib/supabase/client'
const icons = { levels: MilitaryTechRounded, xp: StarsRounded, time: ScheduleRounded, words: ExploreOutlined, memory: PsychologyOutlined, reading: AutoStories, watching: SmartDisplayOutlined, streaks: LocalFireDepartmentRounded, puzzles: GridOnRounded, breadth: EmojiEventsRounded }

function Trophy({ item, compact = false }: { item: Achievement; compact?: boolean }) {
  const Icon = icons[item.category]
  const progress = (Math.floor(item.progress * 10) / 10).toLocaleString('en-GB')
  const explanation = `${item.earned ? 'Earned' : 'Next milestone'}: ${item.requirement} ${progress} / ${item.threshold.toLocaleString('en-GB')}.`
  return <Tooltip title={explanation} describeChild enterTouchDelay={0}><Box tabIndex={compact ? undefined : 0} aria-label={`${item.name}. ${explanation}`} sx={{ minWidth: 0, p: compact ? 1 : 2, textAlign: 'center', borderRadius: '14px', bgcolor: item.earned ? 'color-mix(in srgb, var(--awm-gold) 10%, var(--awm-white))' : 'var(--awm-cream-light)', boxShadow: item.earned ? '0 4px 18px color-mix(in srgb, var(--awm-gold) 12%, transparent)' : 'none', '&:focus-visible': { outline: '3px solid var(--awm-gold)', outlineOffset: 2 } }}>
    <Icon aria-hidden="true" sx={{ fontSize: compact ? 34 : 42, color: item.earned ? 'var(--awm-gold)' : 'var(--awm-muted)' }} />
    <Typography sx={{ mt: 1, fontWeight: 700, fontSize: compact ? 12 : 14 }}>{item.name}</Typography>
    {!compact && <Typography sx={{ mt: 0.5, fontSize: 12, color: 'var(--awm-muted)' }}>{item.requirement}</Typography>}
    <Typography sx={{ my: 1, fontSize: 12, color: 'var(--awm-muted)' }}>{item.earned ? 'Earned' : `${progress} / ${item.threshold.toLocaleString('en-GB')}`}</Typography>
    {!compact && <LinearProgress aria-label={`${item.name} progress`} variant="determinate" value={item.progress / item.threshold * 100} sx={{ height: 5, borderRadius: 99 }} />}
  </Box></Tooltip>
}

export default function AchievementCabinet({ activity, userId, editable = false, featuredTrophies = [] }: { activity: LearningActivity; userId?: string; editable?: boolean; featuredTrophies?: string[] }) {
  const [open, setOpen] = useState(false), [pages, setPages] = useState<Record<string, number>>({})
  const [featured, setFeatured] = useState(featuredTrophies), [choices, setChoices] = useState<string[]>([])
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const metrics = achievementMetrics(activity), cabinet = achievementPage(metrics), preview = achievementPreview(metrics, featured)
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'))
  const show = () => { setChoices(preview.filter(item => item.earned).map(item => item.id)); setMessage(''); setOpen(true) }
  const select = (id: string) => setChoices(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 4 ? [...current, id] : current)
  async function save() {
    setBusy(true); setMessage('')
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !userId || data.user?.id !== userId) throw new Error('Sign in again to choose your trophies.')
      const { error: saveError } = await supabase.auth.updateUser({ data: { featured_trophies: choices } })
      if (saveError) throw new Error('Unable to save trophy highlights. Please try again.')
      setFeatured(choices); setMessage('Trophy highlights saved.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save trophies.') }
    finally { setBusy(false) }
  }
  return <Box component="section" sx={{ mt: 4 }}>
    <Paper component="button" type="button" onClick={show} aria-label="Open Trophy Cabinet" elevation={0} sx={{ width: '100%', textAlign: 'left', p: { xs: 2, sm: 3 }, border: '1px solid color-mix(in srgb, var(--awm-gold) 30%, transparent)', borderRadius: '16px', bgcolor: 'var(--awm-white)', color: 'var(--awm-bark)', font: 'inherit', cursor: 'pointer', '&:hover': { boxShadow: '0 8px 24px color-mix(in srgb, var(--awm-gold) 12%, transparent)' }, '&:focus-visible': { outline: '3px solid var(--awm-gold)', outlineOffset: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Typography component="h2" variant="h5">Trophy Cabinet</Typography><Chip label={`${cabinet.earnedTotal} earned`} icon={<EmojiEventsRounded />} /></Box>
      <Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontSize: 14 }}>{cabinet.earnedTotal ? 'Your earned highlights. Open your complete collection.' : 'Your first milestone is ahead. Read, watch or practise to start your collection.'}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(4,minmax(0,1fr))' }, gap: 1.5, mt: 2 }}>{preview.map(item => <Trophy key={item.id} item={item} compact />)}</Box>
      <Typography sx={{ mt: 2, color: 'var(--awm-forest)', fontWeight: 700 }}>View all trophies →</Typography>
    </Paper>
    <Dialog open={open} onClose={() => setOpen(false)} fullScreen={mobile} fullWidth maxWidth="md" aria-labelledby="full-cabinet-title">
      <DialogTitle id="full-cabinet-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Trophy Cabinet<IconButton aria-label="Close Trophy Cabinet" onClick={() => setOpen(false)}><Close /></IconButton></DialogTitle>
      <DialogContent>
        {editable && <Box sx={{ mb: 3 }}><Typography>Choose up to four earned trophies for your profile ({choices.length}/4).</Typography><Button disabled={busy} onClick={() => void save()} variant="contained" sx={{ mt: 1 }}>{busy ? 'Saving…' : 'Save trophy highlights'}</Button>{message && <Alert severity={message === 'Trophy highlights saved.' ? 'success' : 'error'} sx={{ mt: 1 }}>{message}</Alert>}</Box>}
        {ACHIEVEMENT_FAMILIES.map(family => {
          const page = pages[family.id] ?? 0, collection = achievementPage(metrics, family.id, page)
          return <Box component="section" key={family.id} sx={{ mb: 4 }}><Typography component="h3" variant="h6" sx={{ mb: 1.5 }}>{family.name}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(3,minmax(0,1fr))' }, gap: 1.5 }}>{collection.items.map(item => <Box key={item.id} sx={{ minWidth: 0 }}><Trophy item={item} />{editable && item.earned && <Button size="small" fullWidth aria-pressed={choices.includes(item.id)} disabled={busy || (!choices.includes(item.id) && choices.length >= 4)} onClick={() => select(item.id)}>{choices.includes(item.id) ? 'Featured' : 'Feature trophy'}</Button>}</Box>)}</Box>
            {(page > 0 || collection.hasNext) && <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}><Button aria-label={`Previous ${family.name} milestones`} disabled={!page} onClick={() => setPages(current => ({ ...current, [family.id]: page - 1 }))}>Previous</Button><Typography sx={{ fontSize: 13 }}>Page {page + 1}</Typography><Button aria-label={`Next ${family.name} milestones`} disabled={!collection.hasNext} onClick={() => setPages(current => ({ ...current, [family.id]: page + 1 }))}>Next</Button></Box>}
          </Box>
        })}
      </DialogContent>
    </Dialog>
  </Box>
}
