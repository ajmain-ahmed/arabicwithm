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
  /* Profile has its own fixed bottom tab bar on mobile. */
  const isProfileRoute = pathname?.startsWith('/profile') ?? false
  /* Episode watch pages are immersive, full-height stages like /explore. */
  const isEpisodeRoute = /^\/cartoons\/[^/]+\/[^/]+$/.test(pathname ?? '')
  const hideFooter = isExploreRoute || isEpisodeRoute

  if (isAdminRoute) {
    return (
      <ErrorBoundary key={pathname}>
        <Box className="awm-site-pages">{children}</Box>
        <Footer />
      </ErrorBoundary>
    )
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <LearningActivityTracker />
      <Box
        component="main"
        className="awm-site-pages"
        data-no-site-texture={isProfileRoute ? 'true' : undefined}
        sx={{
          pt: 'var(--awm-navbar-height)',
          flex: '1 0 auto',
          minHeight: '100dvh',
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
      {!hideFooter && <Footer />}
      {!isProfileRoute && <MobileBottomNav />}
      {!isExploreRoute && <LazyFloatingVideoPlayer />}
    </Box>
  )
}
