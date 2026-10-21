'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Box, Fade, IconButton, Typography } from '@mui/material'
import { Close, ExploreOutlined, PersonOutlineRounded } from '@mui/icons-material'
import ExploreFeed from './ExploreFeed'
import ForYouFeed from './ForYouFeed'

type ExploreView = 'explore' | 'foryou'

function ViewSwitch({ view, onChange, hint, onDismiss, mobile = false, horizontal = false, trailing }: { view: ExploreView; onChange: (view: ExploreView) => void; hint: boolean; onDismiss: () => void; mobile?: boolean; horizontal?: boolean; trailing?: ReactNode }) {
  return <Box sx={{ position: 'relative', display: 'flex', flexDirection: mobile || horizontal ? 'row' : 'column', alignItems: horizontal ? 'flex-start' : 'center', gap: 1, minWidth: 0 }}>
    {([{ id: 'explore', label: 'Explore', Icon: ExploreOutlined }, { id: 'foryou', label: 'For You', Icon: PersonOutlineRounded }] as const).map(({ id, label, Icon }) => <Box key={id} sx={{ position: 'relative', textAlign: 'center' }}>
      <IconButton aria-label={`${label} feed`} aria-pressed={view === id} onClick={() => onChange(id)} sx={{ width: mobile ? 44 : 50, height: mobile ? 44 : 50, color: mobile ? 'var(--awm-forest)' : '#fff', bgcolor: view === id ? 'rgba(184,134,11,.24)' : mobile ? 'transparent' : 'rgba(255,255,255,.14)', border: view === id ? '1px solid var(--awm-gold)' : '1px solid transparent', '&:hover': { bgcolor: 'rgba(184,134,11,.3)' }, '&:focus-visible': { outline: '2px solid var(--awm-gold)', outlineOffset: 2 } }}><Icon /></IconButton>
      {!mobile && <Typography sx={{ fontSize: 11, color: '#fff', mt: .5 }}>{label}</Typography>}
      {view !== id && <Fade in={hint} unmountOnExit><Box role="note" sx={{ position: 'absolute', left: mobile ? (id === 'foryou' ? 'auto' : 0) : 'calc(100% + 14px)', right: mobile && id === 'foryou' ? 0 : 'auto', top: mobile ? 'calc(100% + 10px)' : 0, width: mobile ? 156 : 178, p: 1.25, pr: 3.5, borderRadius: '10px', bgcolor: '#174832', color: '#fff', zIndex: 20, boxShadow: '0 4px 16px #0004', '&:before': { content: '""', position: 'absolute', left: mobile ? 20 : -5, top: mobile ? -5 : 18, width: 10, height: 10, bgcolor: 'inherit', transform: 'rotate(45deg)' } }}>
        <Typography sx={{ color: 'inherit', fontSize: 12, lineHeight: 1.5, textAlign: 'center' }}>{view === 'explore' ? 'Click here for different content' : 'Click here to return to Explore'}</Typography>
        <IconButton aria-label="Dismiss navigation hint" onClick={onDismiss} sx={{ position: 'absolute', right: 0, top: 0, width: 28, height: 28, color: 'inherit' }}><Close sx={{ fontSize: 15 }} /></IconButton>
      </Box></Fade>}
    </Box>)}
    {trailing}

  </Box>
}

export default function ExploreViews() {
  const [view, setView] = useState<ExploreView>('explore')
  const [hintFor, setHintFor] = useState<ExploreView | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const key = `awm-discovery-v2-${view}`
      try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, 'seen') } catch {}
      setHintFor(view)
      timer.current = setTimeout(() => setHintFor(null), window.matchMedia('(max-width:899.95px)').matches ? 2500 : 4000)
    })
    return () => { cancelAnimationFrame(frame); if (timer.current) clearTimeout(timer.current) }
  }, [view])
  const dismiss = () => { setHintFor(null); if (timer.current) clearTimeout(timer.current) }
  const rail = <ViewSwitch view={view} onChange={setView} hint={hintFor === view} onDismiss={dismiss} />
  return <Box sx={{ '--awm-explore-switch-height': { xs: '56px', md: '0px' } }}>
    <Box sx={{ display: { xs: 'flex', md: 'none' }, px: 1.5, height: 56, alignItems: 'center', bgcolor: 'var(--awm-cream-light)' }}><ViewSwitch mobile view={view} onChange={setView} hint={hintFor === view} onDismiss={dismiss} /></Box>
    {view === 'explore' ? <ExploreFeed railTop={<Box sx={{ display: { xs: 'none', md: 'block' } }}>{rail}</Box>} /> : <ForYouFeed desktopControls={settings => <ViewSwitch view={view} onChange={setView} hint={hintFor === view} onDismiss={dismiss} trailing={settings} />} />}
  </Box>
}
