'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material'
import { Home, School, MenuBook, Movie, Person } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'

const NAV_ITEMS = [
  { value: '/', label: 'Home', icon: <Home sx={{ fontSize: 22 }} /> },
  { value: '/flashcards', label: 'Study', icon: <School sx={{ fontSize: 22 }} /> },
  { value: '/news', label: 'News', icon: <MenuBook sx={{ fontSize: 22 }} /> },
  { value: '/cartoons', label: 'Cartoons', icon: <Movie sx={{ fontSize: 22 }} /> },
  { value: '/profile', label: 'Profile', icon: <Person sx={{ fontSize: 22 }} /> },
]

function safePush(router: ReturnType<typeof useRouter>, url: string) {
  if (typeof window !== 'undefined' && (window as any).__customSessionActive && url !== '/revision') {
    window.dispatchEvent(new CustomEvent('revision-leave-requested', { detail: { url } }))
    return
  }
  router.push(url)
}

function getActiveValue(pathname: string): string {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/flashcards')) return '/flashcards'
  if (pathname.startsWith('/news')) return '/news'
  if (pathname.startsWith('/cartoons')) return '/cartoons'
  if (pathname.startsWith('/profile')) return '/profile'
  return ''
}

export default function MobileBottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const activeValue = getActiveValue(pathname)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Box sx={{ display: { xs: 'block', md: 'none' }, height: 100 }} />
  }

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    if (!newValue || newValue === activeValue) return
    if (newValue === '/profile' && !user) {
      window.dispatchEvent(new CustomEvent('open-auth-dialog'))
      return
    }
    safePush(router, newValue)
  }

  return (
    <>
      {/* Floating pill container */}
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 'calc(12px + env(safe-area-inset-bottom))', sm: 'calc(16px + env(safe-area-inset-bottom))' },
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1200,
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(16px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
          borderRadius: '9999px',
          border: '1px solid rgba(184,134,11,0.18)',
          boxShadow: '0 12px 40px rgba(44,26,14,0.15), 0 2px 8px rgba(44,26,14,0.08)',
          px: { xs: 1.5, sm: 2.5 },
          py: 1,
          maxWidth: 'calc(100vw - 24px)',
        }}
      >
        <BottomNavigation
          value={activeValue}
          onChange={handleChange}
          showLabels
          sx={{
            background: 'transparent',
            height: 56,
            minWidth: 0,
            width: 'auto',
            '& .MuiBottomNavigationAction-root': {
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.62rem',
              fontWeight: 500,
              letterSpacing: '0.03em',
              color: '#7a6e65',
              minWidth: { xs: 60, sm: 72 },
              maxWidth: { xs: 72, sm: 84 },
              padding: '6px 8px',
              borderRadius: '9999px',
              transition: 'all 0.2s ease',
              gap: 0.5,
              '&.Mui-selected': {
                color: '#b8860b',
                fontWeight: 600,
                background: 'rgba(184,134,11,0.1)',
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
      {/* Spacer: accounts for pill height + float offset + safe-area */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, height: 100 }} />
    </>
  )
}
