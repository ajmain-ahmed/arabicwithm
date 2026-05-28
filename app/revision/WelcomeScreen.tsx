'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Box, Typography, Skeleton, CircularProgress } from '@mui/material'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import CustomSessionConfig from './CustomSessionConfig'
import { useRevisionStore } from '@/store/revisionStore'
import { getLevelProgressStats } from '@/app/actions/revision'
import type { RevisionCard } from '@/app/actions/revision'
import type { LevelProgressStat } from '@/app/actions/revision'
import type { ModeConfig } from './types'

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,700;1,700&family=Jost:wght@300;400;500;600;700&display=swap');

  .revision-banner-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  .revision-banner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(44,26,14,0.45) 0%,
      rgba(44,26,14,0.65) 55%,
      rgba(44,26,14,0.90) 100%
    );
  }
  .revision-banner-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle,
      rgba(0,0,0,0) 0%,
      rgba(0,0,0,0.45) 70%,
      rgba(0,0,0,0.75) 100%
    );
  }
  .revision-banner-content {
    position: relative;
    z-index: 1;
  }
`

interface WelcomeScreenProps {
  onStartDaily: () => void
  onStartCustom: (cards: RevisionCard[], modeConfig: ModeConfig) => void
}

function classifyForCount(card: RevisionCard): 'new' | 'learning' | 'review' {
  const lastReview = card.last_review_at
  const interval = card.interval_days ?? 0
  const reps = card.repetitions ?? 0
  if (!lastReview && reps === 0) return 'new'
  if (interval === 0) return 'learning'
  return 'review'
}

export default function WelcomeScreen({ onStartDaily, onStartCustom }: WelcomeScreenProps) {
  const { user } = useAuth()
  const [starting, setStarting] = useState(false)
  const [levelProgress, setLevelProgress] = useState<LevelProgressStat[]>([])
  const [progressLoading, setProgressLoading] = useState(true)

  const getSession = useRevisionStore((s) => s.getSession)
  const sessionCache = useRevisionStore((s) => s.sessionCache)
  const sessionLoading = useRevisionStore((s) => s.sessionLoading)

  const metadata = useRevisionStore((s) => s.customMetadata)
  const customMetadataLoading = useRevisionStore((s) => s.customMetadataLoading)
  const fetchCustomMetadata = useRevisionStore((s) => s.fetchCustomMetadata)

  useEffect(() => {
    getSession()
  }, [getSession])

  useEffect(() => {
    fetchCustomMetadata()
  }, [fetchCustomMetadata])

  useEffect(() => {
    setProgressLoading(true)
    getLevelProgressStats()
      .then((data) => setLevelProgress(data))
      .catch((err) => console.error('Failed to fetch level progress:', err))
      .finally(() => setProgressLoading(false))
  }, [])

  const handleStartDaily = () => {
    setStarting(true)
    setTimeout(() => onStartDaily(), 500)
  }

  const handleStartCustom = (cards: RevisionCard[], modeConfig: ModeConfig) => {
    setStarting(true)
    setTimeout(() => onStartCustom(cards, modeConfig), 500)
  }

  const dueCards = sessionCache?.dueCards ?? []
  const counts = useMemo(() => {
    const c = { newCount: 0, learningCount: 0, reviewCount: 0 }
    for (const card of dueCards) {
      const queue = classifyForCount(card)
      if (queue === 'new') c.newCount++
      else if (queue === 'learning') c.learningCount++
      else c.reviewCount++
    }
    return c
  }, [dueCards])

  const fetching = sessionLoading || customMetadataLoading

  return (
    <>
      <style>{PAGE_CSS}</style>
      <Box component="main" sx={{ minHeight: '100vh', background: '#f5ede0', pt: { xs: '56px', md: '64px' } }}>
        {/* ── Banner ── */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(212,168,67,0.2)',
            px: { xs: 3, md: 8 },
            py: { xs: 4, md: 6 },
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            className="revision-banner-img"
            src="/cards/awm13_converted.avif"
            alt=""
            aria-hidden="true"
          />
          <Box className="revision-banner-overlay" />
          <Box className="revision-banner-vignette" />
          <Box className="revision-banner-content">
            <Typography
              component="h1"
              sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: { xs: '2.4rem', md: '3.4rem' },
                fontWeight: 700,
                color: '#f5ede0',
                lineHeight: 1.1,
                mb: 0.5,
                direction: 'rtl',
              }}
            >
              بَيْتُ الْكَلِمَات
            </Typography>
            <Typography
              sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: { xs: '1.2rem', md: '1.6rem' },
                color: '#d4a843',
                mb: 1,
              }}
            >
              Bayt al-Kalimāt, House of Words
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: '0.85rem', md: '1rem' },
                color: 'rgba(245,237,224,0.85)',
                lineHeight: 1.5,
                maxWidth: 480,
                mx: 'auto',
                fontWeight: 400,
              }}
            >
              Sharpen what you know, Learn what you don&apos;t, One card at a time.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ pt: { xs: 3, md: 5 }, pb: { xs: 4, md: 6 }, px: { xs: 1.5, md: 3, lg: 5 } }}>
          <Box sx={{ maxWidth: 1536, mx: 'auto' }}>
            {fetching ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                <Skeleton variant="text" width={160} height={32} />
                <Skeleton variant="text" width="90%" height={20} />
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="rounded" width="100%" height={44} sx={{ mt: 2 }} />
              </Box>
            ) : (
              <CustomSessionConfig
                metadata={metadata ?? []}
                counts={counts}
                user={user}
                levelProgress={levelProgress}
                onStartDaily={handleStartDaily}
                onStart={handleStartCustom}
              />
            )}
          </Box>
        </Box>
      </Box>

      <AnimatePresence>
        {starting && (
          <motion.div
            key="start-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: '#f5ede0',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            <CircularProgress size={48} sx={{ color: '#b8860b' }} />
            <Typography sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: { xs: '1rem', md: '1.25rem' },
              color: '#7a6e65',
              fontWeight: 500,
            }}>
              Loading your session…
            </Typography>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
