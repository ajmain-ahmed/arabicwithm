'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Box, Button, Fab, Popover, useMediaQuery } from '@mui/material'
import { Close, ExploreOutlined, Home, MenuBook, Menu, Movie, PsychologyOutlined } from '@mui/icons-material'
const destinations = [
  { href: '/', label: 'Home', Icon: Home }, { href: '/explore', label: 'Explore', Icon: ExploreOutlined },
  { href: '/cartoons', label: 'Watch', Icon: Movie }, { href: '/books', label: 'Read', Icon: MenuBook },
  { href: '/memory', label: 'Memory', Icon: PsychologyOutlined },
]
export default function MobileBottomNav() {
  const mobile = useMediaQuery('(max-width:899.95px)')
  const router = useRouter()
  const pathname = usePathname()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const listener = (event: Event) => { const open = (event as CustomEvent<boolean>).detail; setHidden(open); if (open) setAnchor(null) }
    window.addEventListener('awm-watch-definition', listener)
    return () => window.removeEventListener('awm-watch-definition', listener)
  }, [])
  if (hidden || !mobile) return null
  return <Box sx={{ display: { xs: 'block', md: 'none' } }}>
    <Fab aria-label={anchor ? 'Close navigation' : 'Open navigation'} aria-expanded={Boolean(anchor)} aria-controls={anchor ? 'mobile-navigation' : undefined} onClick={event => setAnchor(anchor ? null : event.currentTarget)} sx={{ position: 'fixed', right: 'max(16px, env(safe-area-inset-right))', bottom: 'calc(20px + env(safe-area-inset-bottom))', width: 52, height: 52, zIndex: 1301, color: 'var(--awm-bark)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--awm-cream) 94%, transparent), color-mix(in srgb, var(--awm-gold-light) 82%, transparent))', backdropFilter: 'blur(12px)', border: '1px solid var(--awm-gold)' }}>{anchor ? <Close /> : <Menu />}</Fab>
    <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'bottom', horizontal: 'right' }} slotProps={{ paper: { sx: { mb: 1.5, borderRadius: '16px', p: 1, maxHeight: 'calc(100dvh - 110px)', width: 180 } } }}>
      <Box component="nav" id="mobile-navigation" aria-label="Mobile navigation" sx={{ display: 'flex', flexDirection: 'column' }}>
        {destinations.map(({href,label,Icon}) => <Button key={href} startIcon={<Icon />} aria-current={pathname === href ? 'page' : undefined} onClick={() => { setAnchor(null); router.push(href) }} sx={{ minHeight: 44, justifyContent: 'flex-start', color: 'var(--awm-bark)', bgcolor: pathname === href ? 'var(--awm-cream)' : undefined }}>{label}</Button>)}
      </Box>
    </Popover>
  </Box>
}
