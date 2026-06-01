'use client'

import React from 'react'
import { Box, Typography, Avatar } from '@mui/material'
import { useRouter, usePathname } from 'next/navigation'
import HomeIcon from '@mui/icons-material/Home'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import CreateIcon from '@mui/icons-material/Create'
import SearchIcon from '@mui/icons-material/Search'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import StickyNote2Icon from '@mui/icons-material/StickyNote2'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { DashboardData } from '@/app/actions/dashboard'

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: <HomeIcon sx={{ fontSize: 20 }} />, href: '/' },
  { key: 'learn', label: 'Learn', icon: <MenuBookIcon sx={{ fontSize: 20 }} />, href: '/flashcards' },
  { key: 'practice', label: 'Practice', icon: <CreateIcon sx={{ fontSize: 20 }} />, href: '/revision' },
  { key: 'dictionary', label: 'Dictionary', icon: <SearchIcon sx={{ fontSize: 20 }} />, href: '/flashcards' },
  { key: 'saved', label: 'Saved', icon: <BookmarkIcon sx={{ fontSize: 20 }} />, href: '/profile' },
  { key: 'progress', label: 'Progress', icon: <TrendingUpIcon sx={{ fontSize: 20 }} />, href: '/profile' },
  { key: 'notes', label: 'Notes', icon: <StickyNote2Icon sx={{ fontSize: 20 }} />, href: '/profile' },
]

export default function DashboardSidebar({ data }: { data: DashboardData }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Box
      sx={{
        width: { md: 220, lg: 240 },
        minWidth: { md: 220, lg: 240 },
        background: '#f8f6f2',
        minHeight: '100vh',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        py: { md: 3, lg: 4 },
        px: { md: 2, lg: 2.5 },
        borderRight: '1px solid rgba(14,46,31,0.06)',
      }}
    >
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { md: 4, lg: 5 }, px: 0.5 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            background: '#0e2e1f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#fff',
            }}
          >
            ق
          </Typography>
        </Box>
        <Box>
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--bark)',
              lineHeight: 1.2,
            }}
          >
            Arabic
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--muted)',
              lineHeight: 1.2,
            }}
          >
            with M
          </Typography>
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
          return (
            <Box
              key={item.key}
              onClick={() => router.push(item.href)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.25,
                py: 1,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                color: isActive ? '#2d6a4f' : 'var(--muted)',
                background: isActive ? '#e8f5ee' : 'transparent',
                '&:hover': {
                  background: isActive ? '#e8f5ee' : 'rgba(14,46,31,0.03)',
                  color: 'var(--bark)',
                },
              }}
            >
              <Box sx={{ display: 'flex', opacity: isActive ? 1 : 0.7 }}>{item.icon}</Box>
              <Typography
                sx={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* User profile */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 1,
          py: 1.5,
          borderRadius: '12px',
          cursor: 'pointer',
          '&:hover': { background: 'rgba(14,46,31,0.03)' },
        }}
        onClick={() => router.push('/profile')}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            background: '#0e2e1f',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {data.user.name?.charAt(0).toUpperCase() || 'M'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--bark)',
            }}
          >
            {data.user.name || 'Learner'}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--muted)',
            }}
          >
            View Profile
          </Typography>
        </Box>
        <ChevronRightIcon sx={{ fontSize: 16, color: 'var(--muted)', opacity: 0.5 }} />
      </Box>

      {/* Arabic quote card */}
      <Box
        sx={{
          mt: 2,
          background: '#fff',
          borderRadius: '14px',
          p: 2,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(14,46,31,0.06)',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--bark)',
            lineHeight: 1.4,
            direction: 'rtl',
          }}
        >
          العلم نور
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.78rem',
            fontWeight: 500,
            color: 'var(--muted)',
            mt: 0.5,
          }}
        >
          Knowledge is light.
        </Typography>
        {/* Lantern SVG */}
        <Box
          component="svg"
          width="32"
          height="40"
          viewBox="0 0 32 40"
          fill="none"
          sx={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.15 }}
        >
          <path d="M16 2L28 10V28L16 36L4 28V10L16 2Z" stroke="#0e2e1f" strokeWidth="2" />
          <path d="M16 12L20 15V22L16 25L12 22V15L16 12Z" fill="#b8860b" />
          <path d="M16 36V38M12 38H20" stroke="#0e2e1f" strokeWidth="1.5" />
        </Box>
      </Box>
    </Box>
  )
}
