'use client'

import React, { useMemo } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { PlayArrow } from '@mui/icons-material'
import type { RevisionCard } from '@/app/actions/revision'

/* ── Level colours ── */
const LEVEL_COLORS: Record<string, string> = {
  A0: '#2d6a4f', A1: '#40916c', A2: '#52b788',
  B1: '#b5861a', B2: '#9c6b00',
  C1: '#6d4c9e', C2: '#4a2f7a',
}

const LEVEL_NAMES: Record<string, string> = {
  A0: 'A0', A1: 'A1', A2: 'A2',
  B1: 'B1', B2: 'B2',
  C1: 'C1', C2: 'C2',
}

const PATTERN_BG = "url('/pattern.svg')"

/* ── Helpers ── */
function relativeDate(iso: string | null): string {
  if (!iso) return 'Never'
  const then = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

/* ── SVG Donut Chart ── */
function DonutChart({ segments, total }: { segments: { level: string; count: number; color: string; pct: number }[]; total: number }) {
  const radius = 70
  const strokeWidth = 22
  const cx = 80
  const cy = 80
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <Box sx={{ position: 'relative', width: 160, height: 160, mx: 'auto' }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg) => {
          const segLen = (seg.pct / 100) * circumference
          const circleOffset = -offset
          offset += segLen
          return (
            <circle
              key={seg.level}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segLen} ${circumference - segLen}`}
              strokeDashoffset={circleOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          )
        })}
      </svg>
      {/* Center text */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.75rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
          {total}
        </Typography>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          cards
        </Typography>
      </Box>
    </Box>
  )
}

interface DailyReviewStatsCardProps {
  dueCards: RevisionCard[]
  counts: { newCount: number; learningCount: number; reviewCount: number }
  user: { id: string } | null
  onStartDaily: () => void
}

export default function DailyReviewStatsCard({
  dueCards,
  counts,
  user,
  onStartDaily,
}: DailyReviewStatsCardProps) {
  const totalDue = dueCards.length

  /* ── Level distribution ── */
  const levelBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const card of dueCards) {
      const lvl = card.level ?? 'Unknown'
      map[lvl] = (map[lvl] ?? 0) + 1
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([level, count]) => ({
        level,
        count,
        pct: totalDue > 0 ? (count / totalDue) * 100 : 0,
        color: LEVEL_COLORS[level] ?? '#7a6e65',
      }))
  }, [dueCards, totalDue])

  /* ── Last studied ── */
  const lastStudied = useMemo(() => {
    let latest: Date | null = null
    for (const card of dueCards) {
      if (card.last_review_at) {
        const d = new Date(card.last_review_at)
        if (!latest || d > latest) latest = d
      }
    }
    return relativeDate(latest?.toISOString() ?? null)
  }, [dueCards])

  /* ── Estimated time ── */
  const estimatedMinutes = Math.max(1, Math.ceil(totalDue / 10))
  const canStart = user && totalDue > 0

  const queuePills = [
    { label: 'New', count: counts.newCount, color: '#5c9fd6', bg: 'rgba(92,159,214,0.15)' },
    { label: 'Learning', count: counts.learningCount, color: '#e07a5f', bg: 'rgba(224,122,95,0.15)' },
    { label: 'Review', count: counts.reviewCount, color: '#81c784', bg: 'rgba(129,199,132,0.15)' },
  ]

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#1f1d21',
        backgroundImage: PATTERN_BG,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 3, md: 4 } }}>
        {/* Two-column layout */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 4, md: 5 },
            alignItems: { xs: 'stretch', md: 'center' },
          }}
        >
          {/* ── Left column ── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title + last-studied pill */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Typography
                sx={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: { xs: '1.5rem', md: '1.8rem' },
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.2,
                }}
              >
                Daily Review
              </Typography>
              <Box
                sx={{
                  px: 1.2,
                  py: 0.3,
                  borderRadius: '999px',
                  background: 'rgba(184,134,11,0.2)',
                  border: '1px solid rgba(184,134,11,0.3)',
                }}
              >
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', fontWeight: 500, color: '#d4a843' }}>
                  {lastStudied}
                </Typography>
              </Box>
            </Box>

            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: '0.85rem', md: '0.95rem' },
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.6,
                mb: 3,
                maxWidth: 420,
              }}
            >
              Review words that are due today using spaced repetition.
              Your progress is saved and used to schedule future reviews.
            </Typography>

            {/* Queue pills */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
              {queuePills.map((q) => (
                <Box
                  key={q.label}
                  sx={{
                    background: q.bg,
                    border: `1px solid ${q.color}40`,
                    borderRadius: '10px',
                    px: 2,
                    py: 1.25,
                    minWidth: 80,
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.65rem', fontWeight: 600, color: q.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {q.label}
                  </Typography>
                  <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.6rem', fontWeight: 700, color: q.color, lineHeight: 1.1, mt: 0.3 }}>
                    {q.count}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Meta */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                ~{estimatedMinutes} min
              </Typography>
              <Box sx={{ width: 1, height: 12, background: 'rgba(255,255,255,0.08)' }} />
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                SM-2 algorithm
              </Typography>
            </Box>

            {/* CTA */}
            <Button
              variant="contained"
              disabled={!canStart}
              onClick={onStartDaily}
              startIcon={<PlayArrow />}
              sx={{
                background: '#b8860b',
                color: '#2c1a0e',
                fontFamily: 'Jost, sans-serif',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '9999px',
                px: 4,
                py: 1.2,
                fontSize: '0.95rem',
                boxShadow: '0 4px 16px rgba(184,134,11,0.3)',
                '&:hover': { background: '#d4a843', transform: 'scale(1.02)' },
                transition: 'all 0.2s',
                '&.Mui-disabled': { background: 'rgba(184,134,11,0.15)', color: 'rgba(245,237,224,0.3)' },
              }}
            >
              Start Daily Review
            </Button>
            {!user && (
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', mt: 1 }}>
                Log in to access daily review
              </Typography>
            )}
            {user && totalDue === 0 && (
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', mt: 1 }}>
                All caught up — nothing due today
              </Typography>
            )}
          </Box>

          {/* ── Right column: Donut chart ── */}
          {totalDue > 0 && (
            <Box
              sx={{
                width: { xs: '100%', md: 260 },
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <DonutChart segments={levelBreakdown} total={totalDue} />

              {/* Legend */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}>
                {levelBreakdown.map((seg) => (
                  <Box key={seg.level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: seg.color }} />
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                      {LEVEL_NAMES[seg.level] ?? seg.level}
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                      {Math.round(seg.pct)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
