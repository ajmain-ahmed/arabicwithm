'use client'

import AwmPageError from './AwmPageError'
import {useAuth} from '@/app/AuthContext'
import { usePathname } from 'next/navigation'
import { Box } from '@mui/material'
import Navbar from './navbar/index'
import Footer from './footer'
import MobileBottomNav from './MobileBottomNav'
import LazyFloatingVideoPlayer from './LazyFloatingVideoPlayer'
import GlobalDataInit from './GlobalDataInit'
import ErrorBoundary from './ErrorBoundary'
import LearningActivityTracker from './LearningActivityTracker'
import SiteDialogs from './SiteDialogs'

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const {error:authError}=useAuth()
  const isAdminRoute = pathname?.startsWith('/admin') ?? false
  const showFooter = pathname === '/' || pathname === '/learn'
  const isExploreRoute = pathname === '/explore'
  /* Profile has its own fixed bottom tab bar on mobile. */
  const isProfileRoute = pathname?.startsWith('/profile') ?? false

  if(authError)return <AwmPageError message="We couldn't restore your session. Reload the page to reconnect."/>

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
        className="awm-site-pages"
        sx={{
          pt: 'var(--awm-navbar-height)',
          flex: '1 0 auto',
          minHeight: '100dvh',
          // On Home the footer owns the floating-nav clearance; adding it to
          // this wrapper too creates an empty band above the footer.
          pb: pathname === '/' || isExploreRoute || pathname?.startsWith('/books/') || pathname === '/word-search' ? 0 : { xs: 'var(--awm-mobile-bottom-clearance)', md: 0 },
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
      {showFooter && <Footer homeMobileSpacing={pathname==='/'}/>}
      <SiteDialogs />
      {!isProfileRoute && <MobileBottomNav />}
      {!isExploreRoute && <LazyFloatingVideoPlayer />}
    </Box>
  )
}
