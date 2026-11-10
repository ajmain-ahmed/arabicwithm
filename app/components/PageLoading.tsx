'use client'

import { useEffect, useState } from 'react'
import { Box, CircularProgress, Container, Paper, Skeleton, Typography } from '@mui/material'
import { FEATURED_DESKTOP_RATIO, FEATURED_MOBILE_HEIGHT } from '@/app/lib/featuredFraming'

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

function HomeRowSkeleton() {
  return (
    <Box sx={{ mb: 4 }}>
      <Skeleton variant="text" width={180} height={30} sx={{ mb: 1.5 }} />
      <Box sx={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: { xs: 'clamp(150px, 46vw, 182px)', sm: 198, md: 222, lg: 238 }, gap: { xs: 1, md: 1.5 }, overflow: 'hidden' }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Box key={index} sx={{ width: '100%', aspectRatio: '4 / 5' }}><Skeleton variant="rounded" sx={{ width: '100%', height: '100%', borderRadius: '10px' }} /></Box>
        ))}
      </Box>
    </Box>
  )
}

export function HomePageLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ minHeight: '100dvh', bgcolor: 'var(--awm-cream-light)' }}>
      <Box sx={{ pt: '32px', pb: { xs: 1.5, md: 2.5 }, px: { xs: 2, md: 4 } }}>
        <Box sx={{ position: 'relative', height: { xs: FEATURED_MOBILE_HEIGHT, md: 'auto' }, aspectRatio: { md: FEATURED_DESKTOP_RATIO }, mx: 'auto', borderRadius: { xs: '14px', md: '18px' }, overflow: 'hidden', bgcolor: '#0a0f0d' }}>
          <Box sx={{ position: 'absolute', left: { xs: 20, md: 48 }, right: 20, bottom: { xs: 20, md: 30 }, maxWidth: 420 }}>
            <Skeleton variant="text" width="70%" height={60} sx={darkSkeleton} />
            <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
              <Skeleton variant="rounded" width={120} height={50} sx={{ borderRadius: '9999px', ...darkSkeleton }} />
              <Skeleton variant="rounded" width={130} height={50} sx={{ borderRadius: '9999px', ...darkSkeleton }} />
            </Box>
          </Box>
        </Box>
      </Box>
      <Box className="awm-pattern-section" sx={{ px: { xs: 2, md: 4 }, pt: { xs: 3.5, md: 4.5 }, pb: 4 }}>
        <HomeRowSkeleton />
        <HomeRowSkeleton />
        <HomeRowSkeleton />
      </Box>
    </Box>
  )
}

function BookSkeleton() {
  return (
    <Box>
      <Box sx={{ width: '100%', aspectRatio: '2 / 3' }}><Skeleton variant="rounded" sx={{ width: '100%', height: '100%', borderRadius: '10px' }} /></Box>
      <Skeleton variant="text" width="75%" height={22} sx={{ mx: 'auto', mt: 0.65 }} />
    </Box>
  )
}

export function BooksPageLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pb: { xs: 5, md: 9 } }}>
      <Container maxWidth={false} sx={{ pt: { xs: 2.5, md: 5 }, px: { xs: 1.5, sm: 3, xl: 6 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: { xs: 2, sm: 3 } }}>
          <Skeleton variant="text" width={150} height={48} sx={{ display: { xs: 'none', md: 'block' } }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
            <Skeleton variant="rounded" sx={{ width: { xs: '100%', sm: 210, md: 300, lg: 420 }, height: { xs: 40, md: 52 }, borderRadius: { xs: '8px', md: '9999px' } }} />
            <Skeleton variant="rounded" width={190} height={52} sx={{ borderRadius: '9999px' }} />
            <Skeleton variant="rounded" width={105} height={52} sx={{ borderRadius: { xs: '8px', md: '9999px' } }} />
          </Box>
        </Box>
        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
          <Skeleton variant="text" width={130} height={34} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.25 }}>
            {Array.from({ length: 6 }).map((_, index) => <BookSkeleton key={index} />)}
          </Box>
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: { sm: 'repeat(auto-fill, minmax(175px, 1fr))', lg: 'repeat(auto-fill, minmax(200px, 1fr))' }, gap: 3, py: 1 }}>
          {Array.from({ length: 10 }).map((_, index) => <BookSkeleton key={index} />)}
        </Box>
      </Container>
    </Box>
  )
}

export function MemoryPageLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ minHeight: 'calc(100dvh - var(--awm-navbar-height))', bgcolor: 'var(--awm-cream-light)', pb: { xs: 4, md: 8 } }}>
      <Container maxWidth="md" sx={{ pt: { xs: 2.5, md: 5 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: '12px' }} />
          <Box><Skeleton variant="text" width={160} height={48} /><Skeleton variant="text" width={300} height={20} /></Box>
        </Box>
        <Paper elevation={0} sx={{ mt: 3, p: { xs: 2, sm: 2.5 }, border: '1px solid color-mix(in srgb, var(--awm-bark) 11%, transparent)', borderRadius: '14px' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) auto' }, gap: 1.5 }}>
            <Skeleton variant="rounded" height={42} />
            <Skeleton variant="rounded" width={160} height={42} sx={{ maxWidth: '100%' }} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2 }}>
            <Skeleton variant="rounded" width={280} height={40} sx={{ maxWidth: '65%' }} />
            <Skeleton variant="text" width={110} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 1, mt: 3 }}>
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} variant="rounded" height={48} />)}
          </Box>
        </Paper>
        <Paper elevation={0} sx={{ mt: 3, minHeight: { xs: 330, md: 390 }, p: { xs: 3, md: 5 }, display: 'grid', placeItems: 'center', borderRadius: '18px', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)' }}>
          <Box sx={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
            <Skeleton variant="text" width="45%" sx={{ mx: 'auto' }} />
            <Skeleton variant="text" width="85%" height={52} sx={{ mx: 'auto' }} />
            <Skeleton variant="text" width="100%" sx={{ mx: 'auto' }} />
            <Skeleton variant="rounded" width={140} height={48} sx={{ mx: 'auto', mt: 3, borderRadius: '9999px' }} />
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export function WatchPageLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ minHeight: 'calc(100dvh - var(--awm-navbar-height))', bgcolor: { xs: 'var(--awm-cream-light)', md: '#0a0c0b' }, pt: { md: 4 }, pb: { xs: 6, md: 4 } }}>
      <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: { md: 'auto minmax(0, 1fr)', lg: 'minmax(0, 1fr) auto minmax(0, 1fr)' }, gap: { md: 3, lg: 6 }, px: { md: 2.5, lg: 4 }, alignItems: 'start' }}>
        <Box sx={{ display: { md: 'none', lg: 'flex' }, flexDirection: 'column', gap: 1.1, justifySelf: 'end', width: '100%', maxWidth: 784, pt: '7px' }}>
          <Skeleton variant="text" width={90} height={22} sx={darkSkeleton} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: '14px' }}>
            {Array.from({ length: 9 }).map((_, index) => <Skeleton key={index} variant="rounded" sx={{ height: 264, borderRadius: '4px', ...darkSkeleton }} />)}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '7px' }}>
          <Skeleton variant="text" width={280} height={30} sx={darkSkeleton} />
          <Box sx={{ position: 'relative', height: { md: 'min(calc(100dvh - 179px), 760px)', lg: 'calc(100dvh - var(--awm-navbar-height) - 114px)' }, aspectRatio: '9 / 16', maxWidth: '100%', borderRadius: '20px', bgcolor: '#000', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center' }}>
            <LoadingCircle dark />
          </Box>
        </Box>
        <Box sx={{ justifySelf: 'start', width: '100%', maxWidth: { md: 620, lg: 760 } }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, minHeight: 34 }}>
            <Skeleton variant="text" width={90} sx={darkSkeleton} />
            <Skeleton variant="text" width={90} sx={darkSkeleton} />
          </Box>
          <Box sx={{ p: 4, borderRadius: '12px', bgcolor: 'var(--awm-white)' }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Skeleton variant="text" width="45%" height={18} />
                <Skeleton variant="text" width="92%" height={32} />
                <Skeleton variant="text" width="72%" height={32} />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: { md: 'none' } }}>
        <Skeleton variant="rectangular" sx={{ width: '100%', height: 'clamp(200px, 36dvh, 340px)', bgcolor: '#111' }} />
        <Skeleton variant="rectangular" sx={{ width: '100%', height: 54, bgcolor: 'var(--awm-white)' }} />
        <Box sx={{ px: 2, py: 3, bgcolor: 'var(--awm-white)' }}>
          <Skeleton variant="text" width="65%" height={34} sx={{ mx: 'auto', mb: 3 }} />
          {Array.from({ length: 4 }).map((_, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              <Skeleton variant="text" width="35%" height={16} />
              <Skeleton variant="text" width="95%" height={30} />
              <Skeleton variant="text" width="70%" height={30} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export function ExplorePageLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ position: 'relative', height: { xs: 'calc(100dvh - var(--awm-navbar-height) - env(safe-area-inset-bottom, 0px))', md: 'calc(100dvh - var(--awm-navbar-height) - var(--awm-explore-switch-height, 0px))' }, bgcolor: { xs: 'var(--awm-cream-light)', md: '#0a0c0b' } }}>
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.25, px: { md: 3 }, py: { md: 2 } }}>
        <Box sx={{ position: 'relative', height: { xs: '100%', md: '100%' }, maxHeight: '100%', aspectRatio: { md: '9 / 16' }, width: { xs: '100%', md: 'auto' }, overflow: 'hidden', borderRadius: { xs: 0, md: '20px' }, bgcolor: '#141816', border: { md: '1px solid rgba(255,255,255,0.08)' }, display: 'grid', placeItems: 'center' }}>
          <LoadingCircle size={62} dark />
          <Box sx={{ position: 'absolute', left: 20, right: 20, bottom: 24 }}>
            <Skeleton variant="text" width={90} height={24} sx={darkSkeleton} />
            <Skeleton variant="text" width="75%" height={32} sx={darkSkeleton} />
            <Skeleton variant="text" width="45%" height={20} sx={darkSkeleton} />
          </Box>
        </Box>
        <Box sx={{ position: { xs: 'absolute', md: 'static' }, right: { xs: 12, md: 'auto' }, top: { xs: '50%', md: 'auto' }, transform: { xs: 'translateY(-50%)', md: 'none' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} variant="circular" width={50} height={50} sx={darkSkeleton} />)}
        </Box>
      </Box>
    </Box>
  )
}

export function ShowPageLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ minHeight: '100dvh', bgcolor: 'var(--awm-cream-light)', pb: { xs: 0, md: 8 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Skeleton variant="text" width="32%" height={46} />
            <Skeleton variant="text" width="56%" height={18} sx={{ mt: 0.5 }} />
          </Box>
          <Skeleton variant="rounded" width={152} height={40} sx={{ borderRadius: '9999px', flexShrink: 0 }} />
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, mt: { xs: 2, md: 3 } }}>
          <Skeleton variant="text" width={48} height={18} />
          <Skeleton variant="text" width={68} height={18} />
          <Skeleton variant="text" width={120} height={18} />
        </Box>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Skeleton variant="rounded" width={96} height={40} sx={{ borderRadius: '6px' }} />
          <Skeleton variant="text" width={76} height={18} />
        </Box>
        <Box sx={{ display: 'flex', gap: 3, mt: { xs: 2, md: 2.5 } }}>
          <Box sx={{ width: 240, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 100 }}>
              <Skeleton variant="rounded" height={24} width="55%" sx={{ mb: 1.5 }} />
              {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} variant="rounded" height={34} sx={{ borderRadius: '9999px', mb: 1 }} />)}
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', mb: 2 }}><Skeleton variant="text" width={90} height={18} /></Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 0.75, sm: 1 } }}>
              {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} variant="rounded" sx={{ height: { xs: 180, sm: 300, lg: 320, xl: 340 }, borderRadius: '10px' }} />)}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export function CataloguePageLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ minHeight: { xs: 'calc(100vh - 56px)', md: '100vh' }, bgcolor: 'var(--awm-cream-light)', pb: { xs: 2, md: 8 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 3, md: 4 } }}>
        <Box sx={{ display: { xs: 'none', md: 'block' }, mb: 2 }}><Skeleton width={140} /></Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: { xs: 1.5, md: 3 } }}>
          <Skeleton variant="rounded" width={360} height={44} sx={{ borderRadius: '9999px', maxWidth: '60%' }} />
          <Skeleton variant="rounded" width={110} height={44} sx={{ display: { xs: 'none', md: 'block' } }} />
        </Box>
        <Box sx={{ display: 'flex', gap: { md: 4, lg: 5 } }}>
          <Box sx={{ width: 240, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 100, display: 'grid', gap: 1.75, pt: 0.5 }}>
              {Array.from({ length: 9 }).map((_, index) => <Skeleton key={index} height={32} />)}
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton sx={{ display: { xs: 'none', md: 'block' }, mb: 2, ml: 'auto' }} width={90} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3,minmax(0,1fr))', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))', xl: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 0.75, sm: 1 } }}>
              {Array.from({ length: 12 }).map((_, index) => <Box key={index} sx={{ width: '100%', aspectRatio: '4 / 5' }}><Skeleton variant="rectangular" sx={{ width: '100%', height: '100%', borderRadius: '4px', bgcolor: 'rgba(44,26,14,0.08)' }} /></Box>)}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export function GenericPageLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ minHeight: '60vh', bgcolor: 'var(--awm-cream-light)', py: { xs: 4, md: 6 } }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Skeleton variant="text" width="42%" height={44} />
        <Skeleton variant="text" width="64%" height={22} />
        <Box sx={{ mt: 2 }}><LoadingCircle /></Box>
        <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2, mt: 2 }}>
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} variant="rounded" sx={{ height: { xs: 320, md: 360 }, borderRadius: '12px' }} />)}
        </Box>
      </Box>
    </Box>
  )
}
