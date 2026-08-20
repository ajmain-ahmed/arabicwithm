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
          pt: { xs: '56px', md: '64px' },
          pb: { xs: '56px', md: 0 },
        }}
      >
        <ErrorBoundary>
          <GlobalDataInit>{children}</GlobalDataInit>
        </ErrorBoundary>
      </Box>
      <Footer />
      <MobileBottomNav />
      <LazyFloatingVideoPlayer />
    </>
  )
}
