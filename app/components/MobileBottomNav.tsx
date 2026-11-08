'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Box, Button, Fab, Popover, useMediaQuery } from '@mui/material'
import { Close, ExploreOutlined, Home, MenuBook, Menu, Movie, SchoolOutlined } from '@mui/icons-material'
/* The floating bottom nav keeps direct one-tap destinations; the Learn
   grouping lives in the main navbar dropdown. */
const destinations = [
  { label: 'Home', href: '/', Icon: Home },
  { label: 'Explore', href: '/explore', Icon: ExploreOutlined },
  { label: 'Watch', href: '/cartoons', Icon: Movie },
  { label: 'Read', href: '/books', Icon: MenuBook },
  { label: 'Learn', href: '/learn', Icon: SchoolOutlined },
]
const introDestinations = destinations.filter(({label}) => ['Explore', 'Watch', 'Read', 'Learn'].includes(label))
const INTRO_SESSION_KEY = 'awm-mobile-nav-intro-seen'
const EXPAND_MS = 450
const HOLD_MS = 5000
const COLLAPSE_MS = 800
let seenWithoutStorage = false

export default function MobileBottomNav() {
  const mobile = useMediaQuery('(max-width:899.95px)')
  const router = useRouter()
  const pathname = usePathname()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [hidden, setHidden] = useState(false)
  const [intro, setIntro] = useState<'idle'|'start'|'expanded'|'closing'>('idle')
  const frame = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelIntroTimers = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    if (timer.current !== null) clearTimeout(timer.current)
    if (finishTimer.current !== null) clearTimeout(finishTimer.current)
    frame.current = null; timer.current = null; finishTimer.current = null
  }, [])
  const dismissIntro = useCallback(() => { cancelIntroTimers(); setIntro('idle') }, [cancelIntroTimers])
  useEffect(() => {
    cancelIntroTimers()
    const reset = () => { frame.current = requestAnimationFrame(() => setIntro('idle')) }
    if (!mobile || hidden) { reset(); return cancelIntroTimers }
    try {
      if (sessionStorage.getItem(INTRO_SESSION_KEY)) { reset(); return cancelIntroTimers }
      sessionStorage.setItem(INTRO_SESSION_KEY, '1')
    } catch {
      if (seenWithoutStorage) { reset(); return cancelIntroTimers }
      seenWithoutStorage = true
    }
    frame.current = requestAnimationFrame(() => {
      setIntro('start')
      frame.current = requestAnimationFrame(() => {
        setIntro('expanded')
        timer.current = setTimeout(() => {
          setIntro('closing')
          finishTimer.current = setTimeout(() => setIntro('idle'), COLLAPSE_MS)
        }, EXPAND_MS + HOLD_MS)
      })
    })
    return cancelIntroTimers
  }, [mobile, hidden, pathname, cancelIntroTimers])
  useEffect(() => {
    window.addEventListener('popstate', dismissIntro)
    return () => window.removeEventListener('popstate', dismissIntro)
  }, [dismissIntro])
  useEffect(() => {
    const listener = (event: Event) => { const open = (event as CustomEvent<boolean>).detail; setHidden(open); if (open) setAnchor(null) }
    window.addEventListener('awm-watch-definition', listener)
    return () => window.removeEventListener('awm-watch-definition', listener)
  }, [])
  if (hidden || !mobile) return null
  const expanded = intro === 'expanded'
  const floatingSurface = 'linear-gradient(145deg, color-mix(in srgb, var(--awm-cream) 94%, transparent), color-mix(in srgb, var(--awm-gold-light) 82%, transparent))'
  return <Box sx={{ display: { xs: 'block', md: 'none' } }}>
    <Box data-mobile-nav-float data-intro-state={intro} sx={{position:'fixed',right:'max(16px, env(safe-area-inset-right))',bottom:'calc(20px + env(safe-area-inset-bottom))',height:52,width:expanded?'min(360px, calc(100vw - max(16px, env(safe-area-inset-right)) - max(12px, env(safe-area-inset-left))))':52,zIndex:1301,pointerEvents:'none',transition:`width ${expanded?EXPAND_MS:COLLAPSE_MS}ms cubic-bezier(.22,.61,.36,1)`,'@media (prefers-reduced-motion: reduce)':{transition:'none'}}}>
      {intro !== 'idle' && <Box sx={{position:'absolute',inset:0,borderRadius:'9999px',overflow:'hidden',background:floatingSurface,border:'1px solid var(--awm-gold)',backdropFilter:'blur(12px)',boxShadow:3,pointerEvents:expanded?'auto':'none'}}>
        <Box component="nav" aria-label="Navigation introduction" aria-hidden={!expanded} onFocusCapture={cancelIntroTimers} onPointerDownCapture={cancelIntroTimers} sx={{height:'100%',pr:'52px',pl:.75,display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',alignItems:'center',gap:expanded ? .25 : 0,opacity:expanded?1:0,transform:expanded?'translateX(0)':'translateX(16px)',transition:`opacity ${expanded?300:220}ms ease, transform ${expanded?EXPAND_MS:COLLAPSE_MS}ms ease, gap ${COLLAPSE_MS}ms ease`,'@media (prefers-reduced-motion: reduce)':{transition:'none',transform:'none'}}}>
          {introDestinations.map(({href,label}) => <Button key={href} tabIndex={expanded?0:-1} onClick={() => {dismissIntro();router.push(href)}} sx={{minWidth:0,minHeight:44,p:.5,fontSize:12,fontWeight:600,textTransform:'none',whiteSpace:'nowrap',borderRadius:'9999px',color:'var(--awm-bark)','&:focus-visible':{outline:'2px solid var(--awm-bark)',outlineOffset:-2}}}>{label}</Button>)}
        </Box>
      </Box>}
    </Box>
    <Fab aria-label={anchor ? 'Close navigation' : 'Open navigation'} aria-expanded={Boolean(anchor)} aria-controls={anchor ? 'mobile-navigation' : undefined} onClick={event => {dismissIntro();setAnchor(anchor ? null : event.currentTarget)}} sx={{ position: 'fixed', right: 'max(16px, env(safe-area-inset-right))', bottom: 'calc(20px + env(safe-area-inset-bottom))', width: 52, height: 52, zIndex: 1301, color: 'var(--awm-bark)', background: floatingSurface, backdropFilter: 'blur(12px)', border: '1px solid var(--awm-gold)' }}>{anchor ? <Close /> : <Menu />}</Fab>
    <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'bottom', horizontal: 'right' }} slotProps={{ paper: { sx: { mb: 1.5, borderRadius: '16px', p: 1, maxHeight: 'calc(100dvh - 110px)', width: 180 } } }}>
      <Box component="nav" id="mobile-navigation" aria-label="Mobile navigation" sx={{ display: 'flex', flexDirection: 'column' }}>
        {destinations.map(({href,label,Icon}) => <Button key={href} startIcon={<Icon />} aria-current={pathname === href ? 'page' : undefined} onClick={() => { setAnchor(null); router.push(href) }} sx={{ minHeight: 44, justifyContent: 'flex-start', color: 'var(--awm-bark)', bgcolor: pathname === href ? 'var(--awm-cream)' : undefined }}>{label}</Button>)}
      </Box>
    </Popover>
  </Box>
}
