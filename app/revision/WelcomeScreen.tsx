'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Box, Typography, Card, CardContent, Button, Chip, Skeleton, CircularProgress } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import CustomSessionConfig from './CustomSessionConfig'
import { useRevisionStore } from '@/store/revisionStore'
import type { RevisionCard } from '@/app/actions/revision'

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,700;1,700&family=Jost:wght@300;400;500;600;700&display=swap');
`

interface WelcomeScreenProps {
  onStartDaily: () => void
  onStartCustom: (cards: RevisionCard[]) => void
}

type TabKey = 'daily' | 'custom'

const TAB_META: { key: TabKey; label: string }[] = [
  { key: 'daily', label: 'Daily Review' },
  { key: 'custom', label: 'Custom Practice' },
]

const QUEUE_COLORS = {
  new: { bg: 'rgba(21,101,192,0.10)', color: '#1565c0', border: 'rgba(21,101,192,0.25)' },
  learning: { bg: 'rgba(193,58,0,0.10)', color: '#c13a00', border: 'rgba(193,58,0,0.25)' },
  review: { bg: 'rgba(46,125,50,0.10)', color: '#2e7d32', border: 'rgba(46,125,50,0.25)' },
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
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
  const [activeTab, setActiveTab] = useState<TabKey>('daily')
  const [direction, setDirection] = useState(1)
  const [starting, setStarting] = useState(false)

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
    if (activeTab === 'custom') {
      fetchCustomMetadata()
    }
  }, [activeTab, fetchCustomMetadata])

  const switchTab = (key: TabKey) => {
    const idxCurrent = TAB_META.findIndex(t => t.key === activeTab)
    const idxNext = TAB_META.findIndex(t => t.key === key)
    setDirection(idxNext > idxCurrent ? 1 : -1)
    setActiveTab(key)
  }

  const handleStartDaily = () => {
    setStarting(true)
    setTimeout(() => onStartDaily(), 500)
  }

  const handleStartCustom = (cards: RevisionCard[]) => {
    setStarting(true)
    setTimeout(() => onStartCustom(cards), 500)
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

  const isCustomLoading = activeTab === 'custom' && (metadata === null || customMetadataLoading)
  const fetching = sessionLoading || isCustomLoading

  return (
    <>
      <style>{PAGE_CSS}</style>
      <Box component="main" sx={{ minHeight: '100vh', background: '#fff', pt: { xs: '56px', md: '64px' } }}>
        <Box sx={{ pt: { xs: 6, sm: 8 }, pb: 8, px: { xs: 2, md: 4 } }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: { xs: '100%', sm: 600, md: 720 },
            mx: 'auto',
            mb: 5,
          }}>
            <Box sx={{ textAlign: 'left' }}>
              <Typography
                sx={{
                  fontFamily: "'EB Garamond', serif",
                  mb: 0.5,
                  color: '#2c1a0e',
                  fontWeight: 700,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                }}
              >
                Word Bank
              </Typography>
              <Typography
                sx={{
                  color: '#7a6e65',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: { xs: '0.9rem', sm: '1.05rem', md: '1.25rem' },
                  ml: 0.5,
                }}
              >
                Choose your study mode
              </Typography>
            </Box>
            <Box
              component="img"
              src="/dragons/dragon-1.avif"
              alt=""
              sx={{ width: { xs: 140, sm: 180, md: 220 }, flexShrink: 0, ml: 2 }}
            />
          </Box>

          <Box sx={{ maxWidth: { xs: '100%', sm: 600, md: 720 }, mx: 'auto' }}>
            <Card sx={{
              borderRadius: '16px',
              border: '1px solid rgba(184,134,11,0.2)',
              boxShadow: '0 8px 32px rgba(44,26,14,0.08)',
              overflow: 'hidden',
            }}>
              <Box sx={{
                display: 'flex',
                borderBottom: '1px solid rgba(184,134,11,0.12)',
                background: 'rgba(245,237,224,0.35)',
              }}>
                {TAB_META.map((tab) => {
                  const isActive = activeTab === tab.key
                  return (
                    <Box
                      key={tab.key}
                      onClick={() => switchTab(tab.key)}
                      sx={{
                        flex: 1,
                        textAlign: 'center',
                        py: { xs: 1.5, md: 2 },
                        cursor: 'pointer',
                        position: 'relative',
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.1rem' },
                        color: isActive ? '#2c1a0e' : '#9e8a7a',
                        transition: 'color 0.25s ease',
                        userSelect: 'none',
                        '&:hover': { color: '#2c1a0e' },
                      }}
                    >
                      {tab.label}
                      {isActive && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: '15%',
                            right: '15%',
                            height: 3,
                            borderRadius: '3px 3px 0 0',
                            background: '#b8860b',
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                    </Box>
                  )
                })}
              </Box>

              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                {fetching ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <Skeleton variant="text" width={160} height={32} />
                    <Skeleton variant="text" width="90%" height={20} />
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="rounded" width="100%" height={44} sx={{ mt: 2 }} />
                  </Box>
                ) : (
                  <AnimatePresence mode="wait" custom={direction}>
                    {activeTab === 'daily' && (
                      <motion.div
                        key="daily"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <Typography sx={{
                          fontFamily: "'EB Garamond', serif",
                          fontSize: { xs: '1.2rem', md: '1.6rem' },
                          fontWeight: 700,
                          color: '#2c1a0e',
                          mb: 1,
                        }}>
                          Daily Review
                        </Typography>
                        <Typography sx={{
                          fontFamily: 'Jost, sans-serif',
                          color: '#7a6e65',
                          mb: 3,
                          lineHeight: 1.7,
                          fontSize: { xs: '0.9rem', md: '1.15rem' },
                        }}>
                          Review words that are due today using spaced repetition.
                          Your progress is saved and used to schedule future reviews. You must be logged in and have at least 20 cards in revision to unlock the daily review.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 4 }}>
                          <Chip
                            label={`${counts.newCount} new`}
                            sx={{
                              fontFamily: 'Jost, sans-serif',
                              fontWeight: 600,
                              fontSize: { xs: '0.8rem', md: '0.95rem' },
                              borderRadius: '999px',
                              background: QUEUE_COLORS.new.bg,
                              color: QUEUE_COLORS.new.color,
                              border: `1px solid ${QUEUE_COLORS.new.border}`,
                              px: 1.5,
                              py: 0.5,
                            }}
                          />
                          <Chip
                            label={`${counts.learningCount} learning`}
                            sx={{
                              fontFamily: 'Jost, sans-serif',
                              fontWeight: 600,
                              fontSize: { xs: '0.8rem', md: '0.95rem' },
                              borderRadius: '999px',
                              background: QUEUE_COLORS.learning.bg,
                              color: QUEUE_COLORS.learning.color,
                              border: `1px solid ${QUEUE_COLORS.learning.border}`,
                              px: 1.5,
                              py: 0.5,
                            }}
                          />
                          <Chip
                            label={`${counts.reviewCount} review`}
                            sx={{
                              fontFamily: 'Jost, sans-serif',
                              fontWeight: 600,
                              fontSize: { xs: '0.8rem', md: '0.95rem' },
                              borderRadius: '999px',
                              background: QUEUE_COLORS.review.bg,
                              color: QUEUE_COLORS.review.color,
                              border: `1px solid ${QUEUE_COLORS.review.border}`,
                              px: 1.5,
                              py: 0.5,
                            }}
                          />
                        </Box>

                        <Button
                          variant="contained"
                          onClick={handleStartDaily}
                          fullWidth
                          disabled={!user || counts.newCount + counts.learningCount + counts.reviewCount === 0}
                          sx={{
                            background: '#2c1a0e',
                            color: '#f5ede0',
                            fontFamily: 'Jost, sans-serif',
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: '10px',
                            py: { xs: 1.2, md: 1.4 },
                            fontSize: { xs: '0.95rem', md: '1.15rem' },
                            '&:hover': { background: '#1a0f08' },
                            '&.Mui-disabled': { background: 'rgba(44,26,14,0.3)', color: 'rgba(245,237,224,0.5)' },
                          }}
                        >
                          Start Daily Review
                        </Button>
                        {!user && (
                          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: '#9e8a7a', mt: 1, textAlign: 'center' }}>
                            Log in to access daily review
                          </Typography>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'custom' && (
                      <motion.div
                        key="custom"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <CustomSessionConfig metadata={metadata ?? []} onStart={handleStartCustom} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>


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
              background: '#fff',
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