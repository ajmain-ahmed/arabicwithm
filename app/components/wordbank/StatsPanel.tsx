'use client'

import React, { useMemo } from 'react'
import { Box, Grid, Typography, LinearProgress } from '@mui/material'
import type { ProgressWord } from '@/app/actions/profile'

interface StatsPanelProps {
  words: ProgressWord[]
  allWords: ProgressWord[]
  levelFilter: string
  isMobile: boolean
  isDesktop: boolean
}

const LEVEL_META: Record<string, { label: string; color: string }> = {
  A0: { label: 'Absolute Beginner', color: '#2d6a4f' },
  A1: { label: 'Beginner', color: '#1976d2' },
  A2: { label: 'Elementary', color: '#388e3c' },
  B1: { label: 'Lower Intermediate', color: '#f57c00' },
  B2: { label: 'Upper Intermediate', color: '#7b1fa2' },
  C1: { label: 'Advanced', color: '#00796b' },
  C2: { label: 'Proficiency', color: '#c2185b' },
}

function DonutChart({
  completed,
  revision,
  remaining,
}: {
  completed: number
  revision: number
  remaining: number
}) {
  const total = completed + revision + remaining
  const completedPct = total > 0 ? (completed / total) * 100 : 0
  const revisionPct = total > 0 ? (revision / total) * 100 : 0

  return (
    <Box sx={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(44,26,14,0.06)" strokeWidth={3} />
        <circle
          cx="18" cy="18" r="15.9155"
          fill="none"
          stroke="#2e7d32"
          strokeWidth={3}
          strokeDasharray={`${completedPct} ${100 - completedPct}`}
          strokeLinecap="round"
        />
        <circle
          cx="18" cy="18" r="15.9155"
          fill="none"
          stroke="#1565c0"
          strokeWidth={3}
          strokeDasharray={`${revisionPct} ${100 - revisionPct}`}
          strokeDashoffset={-completedPct}
          strokeLinecap="round"
        />
      </svg>
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
        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.4rem', fontWeight: 700, color: '#2c1a0e' }}>
          {total}
        </Typography>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.65rem', color: '#9e8a7a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Total
        </Typography>
      </Box>
    </Box>
  )
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem', color: '#7a6e65' }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: '#2c1a0e', ml: 'auto' }}>
        {count}
      </Typography>
    </Box>
  )
}

function LevelCard({ code, completed, revision, total }: {
  code: string
  completed: number
  revision: number
  total: number
}) {
  const meta = LEVEL_META[code]
  const accounted = completed + revision
  const progressPct = total > 0 ? Math.round((accounted / total) * 100) : 0

  return (
    <Box
      sx={{
        background: '#fff',
        borderRadius: '10px',
        p: { xs: 1.75, md: 2 },
        border: '1px solid rgba(44,26,14,0.05)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: meta?.color ?? '#7a6e65', flexShrink: 0 }} />
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', fontWeight: 600, color: '#2c1a0e' }}>
            {code}
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: meta?.color ?? '#7a6e65' }}>
          {progressPct}%
        </Typography>
      </Box>

      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', color: '#9e8a7a', mb: 1.25 }}>
        {meta?.label ?? ''}
      </Typography>

      <LinearProgress
        variant="determinate"
        value={progressPct}
        sx={{
          height: 5,
          borderRadius: '999px',
          background: 'rgba(44,26,14,0.05)',
          '& .MuiLinearProgress-bar': {
            background: meta?.color ?? '#7a6e65',
            borderRadius: '999px',
          },
        }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.25 }}>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.68rem', color: '#9e8a7a' }}>
          {completed} done
        </Typography>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.68rem', color: '#9e8a7a' }}>
          {revision} rev
        </Typography>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.68rem', color: '#9e8a7a' }}>
          {total} total
        </Typography>
      </Box>
    </Box>
  )
}

export default function StatsPanel({ words, allWords, levelFilter, isMobile, isDesktop }: StatsPanelProps) {
  const stats = useMemo(() => {
    const source = levelFilter === 'ALL' ? allWords : words
    const completed = source.filter((w) => w.status === 'completed').length
    const revision = source.filter((w) => w.status === 'revision').length
    const remaining = Math.max(0, allWords.length - completed - revision)
    return { completed, revision, remaining }
  }, [words, allWords, levelFilter])

  const levelStats = useMemo(() => {
    const codes = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    return codes.map((code) => {
      const levelWords = allWords.filter((w) => w.level === code)
      return {
        code,
        completed: levelWords.filter((w) => w.status === 'completed').length,
        revision: levelWords.filter((w) => w.status === 'revision').length,
        total: levelWords.length,
      }
    }).filter((s) => s.total > 0)
  }, [allWords])

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Overview chart + legend */}
      <Box
        sx={{
          background: '#fff',
          borderRadius: '12px',
          p: { xs: 2.5, md: 3 },
          mb: 2.5,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: { xs: 2.5, md: 4 },
          border: '1px solid rgba(44,26,14,0.05)',
        }}
      >
        <DonutChart completed={stats.completed} revision={stats.revision} remaining={stats.remaining} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, flex: 1, width: '100%' }}>
          <LegendItem color="#2e7d32" label="Completed" count={stats.completed} />
          <LegendItem color="#1565c0" label="In Revision" count={stats.revision} />
          <LegendItem color="rgba(44,26,14,0.10)" label="Remaining" count={stats.remaining} />
        </Box>
      </Box>

      {/* Level breakdown */}
      <Typography
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: { xs: '1.05rem', md: '1.2rem' },
          fontWeight: 700,
          color: '#2c1a0e',
          mb: 1.5,
        }}
      >
        Level Progress
      </Typography>

      <Grid container spacing={1.5}>
        {levelStats.map((level) => (
          <Grid key={level.code} size={{ xs: 12, md: isDesktop ? 6 : 12, lg: isDesktop ? 4 : 6 }}>
            <LevelCard
              code={level.code}
              completed={level.completed}
              revision={level.revision}
              total={level.total}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
