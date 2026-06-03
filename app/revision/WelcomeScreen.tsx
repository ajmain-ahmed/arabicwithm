'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Box, Typography, Skeleton, CircularProgress, Container, Breadcrumbs } from '@mui/material'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import { useRouter } from 'next/navigation'
import CustomSessionConfig from './CustomSessionConfig'
import { useRevisionStore } from '@/store/revisionStore'

import { PageBanner, HowItWorksSection, PlacementTestCTA } from '@/app/components/page-layout'
import type { RevisionCard } from '@/app/actions/revision'
import type { ModeConfig } from './types'

/* ── MUI Icons ── */
import { School, MenuBook, TrendingUp, LibraryBooks, EventRepeat, NavigateNext } from '@mui/icons-material'

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,700;1,700&family=Jost:wght@300;400;500;600;700&display=swap');
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
  const router = useRouter()
  const { user } = useAuth()
  const [starting, setStarting] = useState(false)
  const sessionCache = useRevisionStore((s) => s.sessionCache)
  const sessionLoading = useRevisionStore((s) => s.sessionLoading)

  const metadata = useRevisionStore((s) => s.customMetadata)
  const customMetadataLoading = useRevisionStore((s) => s.customMetadataLoading)
  const fetchCustomMetadata = useRevisionStore((s) => s.fetchCustomMetadata)

  useEffect(() => {
    fetchCustomMetadata()
  }, [fetchCustomMetadata])

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
      <Box component="main" sx={{ minHeight: '100vh', background: '#f5ede0', pt: { xs: '56px', md: '64px' }, pb: { xs: 0, md: 8 }, display: 'flex', flexDirection: 'column', gap: { xs: 3, md: 4 } }}>
        <PageBanner
          title="House of Cards"
          titleAr="بَيْتُ الْكَلِمَات"
          description="Sharpen what you know, Learn what you don't, One card at a time."
          features={[
            { icon: <School sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Spaced Repetition' },
            { icon: <MenuBook sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Personalised Decks' },
            { icon: <TrendingUp sx={{ fontSize: { xs: 14, md: 16 }, color: 'rgba(255,255,255,0.9)' }} />, label: 'Track Progress' },
          ]}
          ctaLabel="Test My Arabic Skill"
          ctaAction={handleStartDaily}
          ctaStartIcon={<School sx={{ fontSize: 20 }} />}
          backgroundImage="/cards/awm13_converted.avif"
        />

        <Box sx={{ px: { xs: 1.5, md: 3, lg: 5 } }}>
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
                dueCards={dueCards}
                user={user}
                onStartDaily={handleStartDaily}
                onStart={handleStartCustom}
              />
            )}
          </Box>
        </Box>

        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, pt: 4, display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 6 } }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNext sx={{ fontSize: 16, color: '#9e8a7a' }} />}
            sx={{
              mb: 2,
              '& .MuiBreadcrumbs-li': { fontFamily: 'Jost, sans-serif' },
            }}
          >
            <Typography
              onClick={() => router.push('/')}
              sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: '#7a6e65', cursor: 'pointer', '&:hover': { color: '#b8860b' } }}
            >
              Home
            </Typography>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: '#2c1a0e', fontWeight: 600 }}>
              Revision
            </Typography>
          </Breadcrumbs>

          <HowItWorksSection
            steps={[
              {
                icon: <LibraryBooks sx={{ fontSize: 22, color: '#b8860b' }} />,
                title: 'Organise Your Words',
                desc: 'Sort vocabulary into New, Learning, and Review buckets. Track what you know and what needs work.',
              },
              {
                icon: <EventRepeat sx={{ fontSize: 22, color: '#b8860b' }} />,
                title: 'Review Daily with SM-2',
                desc: 'Our spaced-repetition algorithm serves the right cards at the right time so you never forget.',
              },
              {
                icon: <School sx={{ fontSize: 22, color: '#b8860b' }} />,
                title: 'Build Lasting Fluency',
                desc: 'Solidify your Arabic vocabulary session by session, from first words to native-level mastery.',
              },
            ]}
          />
          <PlacementTestCTA
            heading="Not Sure Where to Start?"
            description="Take a quick placement test to find shows matched to your Arabic level."
            ctaLabel="Take Placement Test"
          />
        </Container>
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
