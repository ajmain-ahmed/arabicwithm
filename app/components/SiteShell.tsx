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
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    )
  }

  return (
    <>
      <Navbar />
      <LearningActivityTracker />
      <Box
        component="main"
        sx={{
          pt: isExploreRoute ? 0 : { xs: 'calc(56px + env(safe-area-inset-top))', md: 'calc(64px + env(safe-area-inset-top))' },
          pb: 0,
          minWidth: 0,
          overflowX: isExploreRoute ? 'hidden' : undefined,
          '& :target': {
            scrollMarginTop: { xs: 'calc(68px + env(safe-area-inset-top))', md: 'calc(76px + env(safe-area-inset-top))' },
          },
        }}
      >
        <ErrorBoundary>
          <GlobalDataInit>{children}</GlobalDataInit>
        </ErrorBoundary>
      </Box>
      {!isExploreRoute && <Footer />}
      {!isExploreRoute && <MobileBottomNav />}
      {!isExploreRoute && <LazyFloatingVideoPlayer />}
    </>
  )
}
