'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Tooltip } from '@mui/material'
import { DiamondOutlined, LocalFireDepartmentRounded } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import {
  LEARNING_ACTIVITY_EVENT,
  parseLearningActivity,
  type LearningActivity,
} from '@/app/lib/activity'
import { summarizeLearningDashboard } from '@/app/lib/learningDashboard'

/* Loaded on first open, mirroring the AuthDialog pattern: the prompt pulls
   the entitlements stack, which should not join the initial navbar chunk.
   Hover/focus warms the import so the first click finds it already fetched. */
const loadPremiumPrompt = () => import('@/app/components/PremiumPrompt')
const PremiumPromptLazy = dynamic(loadPremiumPrompt, { ssr: false })

/* Shared pill metrics so the pair reads as consistent buttons inside the
   desktop navbar (the theme icon and avatar around them are ~34-40px). */
const PILL_HEIGHT = 34

export default function MemberActions() {
  const { user } = useAuth()
  const [activityUpdate, setActivityUpdate] = useState<{ userId: string; activity: LearningActivity } | null>(null)
  const [premiumOpen, setPremiumOpen] = useState(false)

  useEffect(() => {
    const handleActivityUpdate = (event: Event) => {
      setActivityUpdate((event as CustomEvent<{ userId: string; activity: LearningActivity }>).detail)
    }
    window.addEventListener(LEARNING_ACTIVITY_EVENT, handleActivityUpdate)
    return () => window.removeEventListener(LEARNING_ACTIVITY_EVENT, handleActivityUpdate)
  }, [])

  const streak = useMemo(() => {
    const activity = user
      ? activityUpdate?.userId === user.id
        ? activityUpdate.activity
        : parseLearningActivity(user.user_metadata)
      : null
    return activity ? summarizeLearningDashboard(activity, new Date()).streak : 0
  }, [activityUpdate, user])

  if (!user) return null

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Tooltip title="Upgrade to AWM+">
        <Button
          onClick={() => setPremiumOpen(true)}
          onMouseEnter={() => void loadPremiumPrompt()}
          onFocus={() => void loadPremiumPrompt()}
          variant="contained"
          startIcon={<DiamondOutlined sx={{ fontSize: 15, color: 'var(--awm-gold-light)' }} />}
          sx={{
            height: PILL_HEIGHT,
            px: 1.4,
            minWidth: 0,
            borderRadius: '9999px',
            textTransform: 'none',
            fontFamily: 'var(--font-sans), sans-serif',
            fontWeight: 700,
            fontSize: 12.5,
            lineHeight: 1,
            bgcolor: '#8b6508',
            color: '#fff',
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: '#a07c0a' },
            '& .MuiButton-startIcon': { mr: 0.5, ml: 0 },
          }}
        >
          AWM+
        </Button>
      </Tooltip>
      <Tooltip title={`${streak} day streak`}>
        <Box
          component="span"
          aria-label={`${streak} day streak`}
          sx={{
            height: PILL_HEIGHT,
            px: 1.25,
            boxSizing: 'border-box',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            borderRadius: '9999px',
            bgcolor: '#b91c1c',
            color: '#fff',
            fontFamily: 'var(--font-sans), sans-serif',
            fontWeight: 700,
            fontSize: 12.5,
            lineHeight: 1,
          }}
        >
          <LocalFireDepartmentRounded sx={{ fontSize: 15 }} />
          Streak
        </Box>
      </Tooltip>
      {premiumOpen && <PremiumPromptLazy open onClose={() => setPremiumOpen(false)} />}
    </Box>
  )
}
