'use client'

import React, { useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { useXpStore } from '@/store/xpStore'

const RANK_GRADIENTS: Record<string, string> = {
  Novice: 'linear-gradient(135deg, #8d6e63, #a1887f)',
  Apprentice: 'linear-gradient(135deg, #795548, #8d6e63)',
  Scholar: 'linear-gradient(135deg, #b8860b, #d4a843)',
  Adept: 'linear-gradient(135deg, #0e2e1f, #1b5e20)',
  Expert: 'linear-gradient(135deg, #1565c0, #42a5f5)',
  Master: 'linear-gradient(135deg, #6a1b9a, #ab47bc)',
  Sage: 'linear-gradient(135deg, #00695c, #26a69a)',
  Legend: 'linear-gradient(135deg, #e65100, #ff9800)',
  Mythic: 'linear-gradient(135deg, #c62828, #ef5350)',
  Immortal: 'linear-gradient(135deg, #ffd700, #ff8c00)',
}

function getRankGradient(rank: string) {
  return RANK_GRADIENTS[rank] ?? RANK_GRADIENTS['Novice']
}

/* ── Level Up Pill ─────────────────────────────────────────────────── */

function LevelUpPill({ level, rankTitle, onDismiss }: { level: number; rankTitle: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const gradient = getRankGradient(rankTitle)

  return (
    <div style={{
      position: 'fixed',
      bottom: 32,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: 20000,
      pointerEvents: 'none',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        style={{ pointerEvents: 'auto' }}
      >
        <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        borderRadius: '999px',
        background: '#fff',
        border: '1px solid rgba(184,134,11,0.2)',
        boxShadow: '0 8px 32px rgba(44,26,14,0.15)',
      }}>
        <Box sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <Typography sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1,
          }}>
            {level}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
          <Typography sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#2c1a0e',
            lineHeight: 1,
          }}>
            Level Up!
          </Typography>
          <Typography sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: '#9e8a7a',
            lineHeight: 1,
          }}>
            {rankTitle}
          </Typography>
        </Box>
      </Box>
      </motion.div>
    </div>
  )
}

/* ── Global Overlays (rendered once at root level) ─────────────────── */

export function XpOverlays() {
  const stats = useXpStore(s => s.stats)
  const leveledUp = useXpStore(s => s.leveledUp)
  const dismissLevelUp = useXpStore(s => s.dismissLevelUp)

  return (
    <AnimatePresence>
      {leveledUp && stats && (
        <LevelUpPill
          key="levelup"
          level={stats.currentLevel}
          rankTitle={stats.rankTitle}
          onDismiss={dismissLevelUp}
        />
      )}
    </AnimatePresence>
  )
}

/* ── Compact XP Bar (desktop navbar) ───────────────────────────────── */

export function XpBarDesktop() {
  const stats = useXpStore(s => s.stats)
  const displayLevel = useXpStore(s => s.displayLevel)
  const displayProgress = useXpStore(s => s.displayProgress)

  if (!stats) return null

  const rankTitle = stats.rankTitle
  const gradient = getRankGradient(rankTitle)

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      mr: 2,
      cursor: 'default',
      userSelect: 'none',
    }}>
      {/* Level circle */}
      <Box sx={{
        position: 'relative',
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(184,134,11,0.15)" strokeWidth="3" />
          <motion.circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="url(#xpGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 16}
            animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - displayProgress) }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b8860b" />
              <stop offset="100%" stopColor="#d4a843" />
            </linearGradient>
          </defs>
        </svg>
        <Typography sx={{
          position: 'absolute',
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.75rem',
          fontWeight: 800,
          color: '#2c1a0e',
        }}>
          {displayLevel}
        </Typography>
      </Box>

      {/* Rank + progress */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, minWidth: 110, maxWidth: 140 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
          <Typography sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#2c1a0e',
            lineHeight: 1,
          }}>
            {rankTitle}
          </Typography>
          <Typography sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.65rem',
            fontWeight: 500,
            color: '#9e8a7a',
            lineHeight: 1,
          }}>
            {stats.totalXp} XP
          </Typography>
        </Box>
        <Box sx={{
          height: 4,
          borderRadius: 2,
          background: 'rgba(184,134,11,0.12)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${Math.round(displayProgress * 100)}%`,
            background: gradient,
            borderRadius: 2,
            transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          }} />
        </Box>
      </Box>
    </Box>
  )
}

/* ── Mobile XP line (absolute at bottom of AppBar) ─────────────────── */

export function XpBarMobileLine() {
  const stats = useXpStore(s => s.stats)
  const displayProgress = useXpStore(s => s.displayProgress)

  if (!stats) return null

  const gradient = getRankGradient(stats.rankTitle)

  return (
    <Box sx={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      background: 'rgba(184,134,11,0.08)',
      overflow: 'hidden',
      zIndex: 1,
    }}>
      <Box sx={{
        height: '100%',
        width: `${Math.round(displayProgress * 100)}%`,
        background: gradient,
        transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      }} />
    </Box>
  )
}

/* ── Mobile Level Badge (avatar overlay) ───────────────────────────── */

export function XpLevelBadge({ level }: { level?: number }) {
  const displayLevel = useXpStore(s => s.displayLevel)
  const stats = useXpStore(s => s.stats)

  if (!stats) return null

  const gradient = getRankGradient(stats.rankTitle)
  const shownLevel = level ?? displayLevel

  return (
    <Box sx={{
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: gradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid #fff',
      zIndex: 2,
    }}>
      <Typography sx={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '0.55rem',
        fontWeight: 800,
        color: '#fff',
        lineHeight: 1,
      }}>
        {shownLevel}
      </Typography>
    </Box>
  )
}

/* ── Auto-init wrapper ─────────────────────────────────────────────── */

export function XpInit() {
  const init = useXpStore(s => s.init)
  const initialized = useXpStore(s => s.initialized)

  useEffect(() => {
    if (!initialized) init()
  }, [initialized, init])

  return null
}
