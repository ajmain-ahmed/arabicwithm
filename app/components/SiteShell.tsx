'use client'

import { usePathname } from 'next/navigation'
import { Box } from '@mui/material'
import Navbar from './navbar/index'
import Footer from './footer'
import MobileBottomNav from './MobileBottomNav'
import LazyFloatingVideoPlayer from './LazyFloatingVideoPlayer'
import GlobalDataInit from './GlobalDataInit'
import ErrorBoundary from './ErrorBoundary'
import LearningActivityTracker from './LearningActivityTracker'

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin') ?? false
  const isExploreRoute = pathname === '/explore'

  if (isAdminRoute) {
    return (
      <ErrorBoundary key={pathname}>
        <Box className="awm-site-pages">{children}</Box>
      </ErrorBoundary>
    )
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <LearningActivityTracker />
      <Box
        component="main"
        className={pathname === '/' ? undefined : 'awm-site-pages'}
        sx={{
          pt: 'var(--awm-navbar-height)',
          flex: '1 0 auto',
          pb: 0,
          minWidth: 0,
          overflowX: isExploreRoute ? 'hidden' : undefined,
          '& :target': {
            scrollMarginTop: { xs: 'calc(68px + env(safe-area-inset-top))', md: 'calc(76px + env(safe-area-inset-top))' },
          },
        }}
      >
        <ErrorBoundary key={pathname}>
          <GlobalDataInit>{children}</GlobalDataInit>
        </ErrorBoundary>
      </Box>
      {!isExploreRoute && <Footer />}
      <MobileBottomNav />
      {!isExploreRoute && <LazyFloatingVideoPlayer />}
    </Box>
  )
}
