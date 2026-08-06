'use client'

import React, { useSyncExternalStore } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material'
import { Home, Movie } from '@mui/icons-material'

const NAV_ITEMS = [
  { value: '/', label: 'Home', icon: <Home sx={{ fontSize: 22 }} /> },
  { value: '/cartoons', label: 'Cartoons', icon: <Movie sx={{ fontSize: 22 }} /> },
]

function safePush(router: ReturnType<typeof useRouter>, url: string) {
  router.push(url)
}

function getActiveValue(pathname: string): string {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/cartoons')) return '/cartoons'
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
    return <Box sx={{ display: { xs: 'block', md: 'none' }, height: 64 }} />
  }

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    if (!newValue || newValue === activeValue) return
    safePush(router, newValue)
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          display: { xs: 'block', md: 'none' },
        }}
      >
        <BottomNavigation
          value={activeValue}
          onChange={handleChange}
          showLabels
          sx={{
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(184,134,11,0.15)',
            height: 56,
            pb: 'env(safe-area-inset-bottom)',
            '& .MuiBottomNavigationAction-root': {
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.62rem',
              fontWeight: 500,
              letterSpacing: '0.03em',
              color: '#7a6e65',
              minWidth: 0,
              padding: '6px 0',
              '&.Mui-selected': {
                color: '#b8860b',
                fontWeight: 600,
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.62rem',
            },
            '& .MuiSvgIcon-root': { fontSize: 22 },
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
      {/* Spacer: accounts for nav height (56) + safe-area — only on mobile */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, height: 64 }} />
    </>
  )
}
