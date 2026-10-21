'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

/** Only one live player is mounted. Adjacent snap panels request a single step;
 * transcript/settings retain their own scrolling and never call navigation. */
export default function MobileClipNavigator({ clipKey, canPrevious, busy, step, children }: { clipKey: string; canPrevious: boolean; busy: boolean; step: (direction: 1 | -1) => void; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const current = useRef<HTMLDivElement>(null)
  const locked = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const node = viewport.current, panel = current.current
    if (!node || !panel) return
    locked.current = Date.now() + 900
    node.scrollTop = panel.offsetTop - node.offsetTop
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [clipKey, canPrevious])
  function settle() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const node = viewport.current, panel = current.current
      if (!node || !panel || !matchMedia('(max-width:899.95px)').matches) return
      if (busy || Date.now() < locked.current) { node.scrollTop=panel.offsetTop-node.offsetTop;return }
      const distance = node.scrollTop - (panel.offsetTop - node.offsetTop)
      if (Math.abs(distance) < node.clientHeight * .55) return
      locked.current = Date.now() + 900
      step(distance > 0 ? 1 : -1)
      // Also reset when there is no next candidate or we are already at the end.
      node.scrollTop = panel.offsetTop - node.offsetTop
    }, 160)
  }
  return <Box ref={viewport} data-mobile-clip-feed onScroll={settle} sx={{ position: 'relative', height: { xs: 'calc(100dvh - var(--awm-navbar-height) - 160px)', md: 'auto' }, minHeight: { xs: 380, md: 0 }, overflowY: { xs: 'auto', md: 'visible' }, scrollSnapType: { xs: 'y mandatory', md: 'none' }, overscrollBehaviorY: 'contain', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
    {canPrevious && <Box aria-hidden sx={{ display: { xs: 'grid', md: 'none' }, height: '100%', scrollSnapAlign: 'start', placeItems: 'center' }}><Typography>↑ Previous clip</Typography></Box>}
    <Box ref={current} sx={{ minHeight: { xs: '100%', md: 0 }, scrollSnapAlign: 'start', py: { xs: 1, md: 0 } }}>{children}<Typography sx={{ display: { xs: 'block', md: 'none' }, textAlign: 'center', fontSize: 12, mt: 3, color: 'text.secondary' }}>Swipe up for the next clip · swipe down to go back</Typography></Box>
    <Box aria-hidden sx={{ display: { xs: 'grid', md: 'none' }, height: '100%', scrollSnapAlign: 'start', placeItems: 'center' }}><Typography>{busy ? 'Loading…' : '↓ Next clip'}</Typography></Box>
  </Box>
}
