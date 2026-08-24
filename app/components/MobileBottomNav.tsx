'use client'

import React, { useSyncExternalStore } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material'
import { ExploreOutlined, Home, MenuBook, Movie } from '@mui/icons-material'

const NAV_ITEMS = [
  { value: '/', label: 'Home', icon: <Home sx={{ fontSize: 19 }} /> },
  { value: '/explore', label: 'Explore', icon: <ExploreOutlined sx={{ fontSize: 19 }} /> },
  { value: '/cartoons', label: 'Watch', icon: <Movie sx={{ fontSize: 19 }} /> },
  { value: '/books', label: 'Read', icon: <MenuBook sx={{ fontSize: 19 }} /> },
]

function safePush(router: ReturnType<typeof useRouter>, url: string) {
  router.push(url)
}

function getActiveValue(pathname: string): string {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/cartoons')) return '/cartoons'
  if (pathname.startsWith('/books')) return '/books'
  if (pathname.startsWith('/explore')) return '/explore'
  return ''
}

export default function MobileBottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const activeValue = getActiveValue(pathname)

  if (!mounted) {
    return null
  }

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    if (!newValue || newValue === activeValue) return
    safePush(router, newValue)
  }

  return (
    <Box
      component="nav"
      aria-label="Primary mobile navigation"
      sx={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 10px)',
        left: 12,
        right: 12,
        zIndex: 1250,
        display: { xs: 'block', md: 'none' },
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 12px 34px color-mix(in srgb, var(--awm-bark) 22%, transparent)',
      }}
    >
      <BottomNavigation
        value={activeValue}
        onChange={handleChange}
        showLabels
        sx={{
            background: 'color-mix(in srgb, var(--awm-white) 78%, transparent)',
            backdropFilter: 'blur(18px) saturate(145%)',
            WebkitBackdropFilter: 'blur(18px) saturate(145%)',
            border: '1px solid color-mix(in srgb, var(--awm-gold) 24%, transparent)',
            borderRadius: '20px',
            height: 60,
            '& .MuiBottomNavigationAction-root': {
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.58rem',
              fontWeight: 500,
              letterSpacing: '0.03em',
              color: 'var(--awm-muted)',
              minWidth: 0,
              minHeight: 48,
              padding: '6px 0',
              '&.Mui-selected': {
                color: '#b8860b',
                fontWeight: 600,
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.58rem',
            },
            '& .MuiSvgIcon-root': { fontSize: 19 },
        }}
      >
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.value}
            value={item.value}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Box>
  )
}
