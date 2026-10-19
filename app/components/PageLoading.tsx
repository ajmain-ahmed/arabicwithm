'use client'

import { useEffect, useState } from 'react'
import { Box, CircularProgress, Container, Skeleton, Typography } from '@mui/material'

/** Determinate progress circle that eases toward 90% while the route's data
    streams in, then snaps to 100%. Paired with layout skeletons so every page
    shows structure instantly instead of a blank white screen. */
export function LoadingCircle({ size = 54, dark = false }: { size?: number; dark?: boolean }) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((value) => (value >= 100 ? 0 : Math.min(90, value + Math.max(0.8, (90 - value) * 0.08))))
    }, 120)
    return () => clearInterval(timer)
  }, [])
  return (
    <Box sx={{ textAlign: 'center' }}>
      <CircularProgress variant="determinate" value={progress} size={size} sx={{ color: '#d4a843' }} />
      <Typography sx={{ mt: 1, fontFamily: 'var(--font-sans), sans-serif', fontSize: 11.5, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.7)' : 'var(--awm-muted)' }}>
        {Math.round(progress)}%
      </Typography>
    </Box>
  )
}

const darkSkeleton = { bgcolor: 'rgba(255,255,255,0.08)' }

/** Generic light-page skeleton (homepage, books, profile, ...). */
export function GenericPageLoading() {
  return (
    <Box component="main" sx={{ minHeight: '60vh', bgcolor: 'var(--awm-cream-light)', py: { xs: 4, md: 6 } }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Skeleton variant="text" width="42%" height={44} />
        <Skeleton variant="text" width="64%" height={22} />
        <Box sx={{ mt: 2 }}>
          <LoadingCircle />
        </Box>
        <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2, mt: 2 }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" sx={{ height: { xs: 320, md: 360 }, borderRadius: '12px' }} />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

/** Dark watch-page skeleton matching the 3-column theater layout. */
export function WatchPageLoading() {
  return (
    <Box component="main" sx={{ minHeight: 'calc(100dvh - var(--awm-navbar-height))', bgcolor: '#0a0c0b', pt: { md: 4 }, pb: { md: 4 }, px: { xs: 0, md: 2.5, lg: 4 } }}>
      {/* Desktop: rail | video | transcript */}
      <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 6, alignItems: 'start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, justifySelf: 'end', width: '100%', maxWidth: 784, pt: '7px' }}>
          <Skeleton variant="text" width={90} height={22} sx={darkSkeleton} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: '14px' }}>
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} variant="rounded" sx={{ height: { md: 264 }, borderRadius: '4px', ...darkSkeleton }} />
            ))}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '7px' }}>
          <Skeleton variant="text" width={280} height={30} sx={darkSkeleton} />
          <Box sx={{ position: 'relative', height: 'calc(100dvh - 240px)', aspectRatio: '9 / 16', maxWidth: '100%', borderRadius: '20px', bgcolor: '#000', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center' }}>
            <LoadingCircle />
          </Box>
        </Box>
        <Box sx={{ justifySelf: 'start', width: '100%', maxWidth: 760 }}>
          <Skeleton variant="text" width={220} height={30} sx={darkSkeleton} />
          <Skeleton variant="rounded" sx={{ mt: 2, height: 'calc(100dvh - 240px)', borderRadius: '12px', ...darkSkeleton }} />
        </Box>
      </Box>
      {/* Mobile: stacked */}
      <Box sx={{ display: { md: 'none' }, px: 2.5, pt: 2 }}>
        <Skeleton variant="rounded" sx={{ width: '100%', aspectRatio: '16 / 9', borderRadius: '12px', ...darkSkeleton }} />
        <Box sx={{ display: 'grid', placeItems: 'center', mt: 3 }}>
          <LoadingCircle />
        </Box>
        <Skeleton variant="rounded" sx={{ mt: 3, height: 180, borderRadius: '12px', ...darkSkeleton }} />
      </Box>
    </Box>
  )
}

/** Dark immersive-stage skeleton (explore). */
export function ExplorePageLoading() {
  return (
    <Box component="main" sx={{ height: 'calc(100dvh - var(--awm-navbar-height))', bgcolor: '#0a0c0b', display: 'grid', placeItems: 'center' }}>
      <LoadingCircle size={62} dark />
    </Box>
  )
}

/** Show page: header + filter sidebar + 4/5 episode card grid. */
export function ShowPageLoading() {
  return (
    <Box component="main" sx={{ minHeight: '100dvh', bgcolor: 'var(--awm-cream-light)', pb: { xs: 0, md: 8 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 4 } }}>
        {/* Header: title + My List pill */}
        <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Skeleton variant="text" width="32%" height={46} />
            <Skeleton variant="text" width="56%" height={18} sx={{ mt: 0.5 }} />
          </Box>
          <Skeleton variant="rounded" width={152} height={40} sx={{ borderRadius: '9999px', flexShrink: 0 }} />
        </Box>
        {/* Breadcrumbs (desktop) */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, mt: { xs: 2, md: 3 } }}>
          <Skeleton variant="text" width={48} height={18} />
          <Skeleton variant="text" width={68} height={18} />
          <Skeleton variant="text" width={120} height={18} />
        </Box>
        {/* Mobile filters row */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Skeleton variant="rounded" width={96} height={40} sx={{ borderRadius: '6px' }} />
          <Skeleton variant="text" width={76} height={18} />
        </Box>
        {/* Sidebar + episode grid */}
        <Box sx={{ display: 'flex', gap: 3, mt: { xs: 2, md: 2.5 } }}>
          <Box sx={{ width: 240, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 100 }}>
              <Skeleton variant="rounded" height={24} width="55%" sx={{ mb: 1.5 }} />
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={34} sx={{ borderRadius: '9999px', mb: 1 }} />
              ))}
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', mb: 2 }}>
              <Skeleton variant="text" width={90} height={18} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 0.75, sm: 1 } }}>
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" sx={{ height: { xs: 180, sm: 300, lg: 320, xl: 340 }, borderRadius: '10px' }} />
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

/** Light grid skeleton for the cartoons catalogue pages. */
export function CataloguePageLoading() {
  return (
    <Box component="main" sx={{ minHeight: '60vh', bgcolor: 'var(--awm-cream-light)', py: { xs: 3, md: 5 }, px: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 2200, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Skeleton variant="text" width={260} height={40} />
          <Skeleton variant="rounded" width={180} height={40} sx={{ borderRadius: '9999px' }} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3,1fr)', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)', xl: 'repeat(6,1fr)' }, gap: 1 }}>
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" sx={{ height: { xs: 180, sm: 240, lg: 260, xl: 280 }, borderRadius: '10px' }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}>
          <LoadingCircle />
        </Box>
      </Box>
    </Box>
  )
}
