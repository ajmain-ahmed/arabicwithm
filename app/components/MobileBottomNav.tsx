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
    return <Box sx={{ display: { xs: 'block', md: 'none' }, height: 64 }} />
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
      <BottomNavigation
        value={activeValue}
        onChange={handleChange}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          display: { xs: 'flex', md: 'none' },
          background: '#fff',
          borderTop: '1px solid rgba(184,134,11,0.15)',
          boxShadow: '0 -4px 20px rgba(44,26,14,0.08)',
          height: 64,
          '& .MuiBottomNavigationAction-root': {
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.6rem',
            fontWeight: 500,
            letterSpacing: '0.03em',
            color: '#7a6e65',
            minWidth: 0,
            padding: '6px 2px',
            '&.Mui-selected': { color: '#b8860b', fontWeight: 600 },
          },
          '& .MuiBottomNavigationAction-label': {
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.6rem',
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
      {/* Spacer so page content isn't hidden behind the fixed nav */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, height: 64 }} />
    </>
  )
}
