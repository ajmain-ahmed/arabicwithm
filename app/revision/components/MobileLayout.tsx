'use client'

import React, { useState, useMemo, useRef, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NormalizedLevel, ModeToggles } from '@/app/revision/types'
import type { RevisionCard } from '@/app/actions/revision'
import CustomCheckbox from './CustomCheckbox'
import DonutChart from './DonutChart'
import LevelCard from '@/app/components/LevelCard'
import ModeToggleCard from './ModeToggleCard'

/* ── Level colours for accordion cards ── */
const LEVEL_COLORS: Record<string, string> = {
  A0: '#2d6a4f', A1: '#40916c', A2: '#52b788',
  B1: '#b5861a', B2: '#9c6b00',
  C1: '#6d4c9e', C2: '#4a2f7a',
}
const LEVEL_BG: Record<string, string> = {
  A0: '#f5faf7', A1: '#f5faf8', A2: '#f5faf8',
  B1: '#fdfbf5', B2: '#fdfbf5',
  C1: '#f9f7fb', C2: '#f9f7fb',
}

/* ── Props ── */
interface MobileLayoutProps {
  isDailyReview: boolean
  setIsDailyReview: (v: boolean) => void
  showCustomOptions: boolean
  setShowCustomOptions: (v: boolean) => void
  modeToggles: ModeToggles
  setModeToggles: React.Dispatch<React.SetStateAction<ModeToggles>>
  onHelpClick: (mode: string) => void
  counts: { newCount: number; learningCount: number; reviewCount: number }
  dueCards: RevisionCard[]
  user: { id: string } | null
  onStartDaily: () => void
  levels: NormalizedLevel[]
  toggleLevel: (code: string) => void
  expandedLevelCode: string | null
  expandLevel: (code: string) => void
  levelSelectedCount: (code: string) => number
  allSelectedForLevel: (code: string) => boolean
  someSelectedForLevel: (code: string) => boolean
  toggleAllForLevel: (levelCode: string, checked: boolean) => void
  toggleTheme: (levelCode: string, themeId: string) => void
  selectedLevelCodes: string[]
  selectedThemeKeys: Set<string>
  cardCount: number
  setCardCount: (v: number) => void
  sliderMax: number
  totalSelectedWords: number
  totalSelectedThemes: number
  handleStart: () => void
  startDisabled: boolean
  loading: boolean
}

/* ── Swipeable Daily Review Carousel ── */
function DailyReviewCarousel({
  counts,
  dueCards,
  user,
  onStartDaily,
}: {
  counts: { newCount: number; learningCount: number; reviewCount: number }
  dueCards: RevisionCard[]
  user: { id: string } | null
  onStartDaily: () => void
}) {
  const [view, setView] = useState<'left' | 'center' | 'right'>('center')
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const totalDue = counts.newCount + counts.learningCount + counts.reviewCount

  const levelBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const card of dueCards) {
      const lvl = card.level ?? 'Unknown'
      map[lvl] = (map[lvl] ?? 0) + 1
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([level, count]) => ({
        label: level,
        pct: totalDue > 0 ? (count / totalDue) * 100 : 0,
        color: LEVEL_COLORS[level] ?? '#7a6e65',
      }))
  }, [dueCards, totalDue])

  const queueSegments = useMemo(
    () => [
      { label: 'New', color: '#1565c0', pct: totalDue > 0 ? (counts.newCount / totalDue) * 100 : 0 },
      { label: 'Learning', color: '#c13a00', pct: totalDue > 0 ? (counts.learningCount / totalDue) * 100 : 0 },
      { label: 'Review', color: '#2e7d32', pct: totalDue > 0 ? (counts.reviewCount / totalDue) * 100 : 0 },
    ],
    [counts, totalDue]
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX
  }, [])

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && view !== 'right') {
        setView(view === 'left' ? 'center' : 'right')
      } else if (diff < 0 && view !== 'left') {
        setView(view === 'right' ? 'center' : 'left')
      }
    }
  }, [view])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX
  }, [])

  const translateX = view === 'left' ? '0%' : view === 'center' ? '-33.333%' : '-66.666%'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Carousel */}
      <Box
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
          touchAction: 'pan-y',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: '300%',
            transform: `translateX(${translateX})`,
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* LEFT — Queue donut */}
          <Box sx={{ width: '33.333%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2, px: 1, position: 'relative' }}>
            <Box
              onClick={() => setView('center')}
              sx={{
                position: 'absolute',
                right: 4,
                top: 0,
                bottom: 0,
                width: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              <ChevronRight size={24} color="#9e8a7a" />
            </Box>
            <DonutChart
              segments={queueSegments}
              total={totalDue}
              label="cards"
              size={130}
              strokeWidth={16}
            />
          </Box>

          {/* CENTER — Text content */}
          <Box sx={{ width: '33.333%', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 1, px: 1, position: 'relative' }}>
            {/* Tap zones */}
            <Box
              onClick={() => setView('left')}
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              <ChevronLeft size={20} color="#9e8a7a" />
            </Box>
            <Box
              onClick={() => setView('right')}
              sx={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              <ChevronRight size={20} color="#9e8a7a" />
            </Box>

            <Typography
              sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#2c1a0e',
                mb: 1,
              }}
            >
              Daily Review
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                color: '#7a6e65',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                px: { xs: 4, sm: 6 },
                mb: 2,
              }}
            >
              Review words that are due today using spaced repetition. Your progress is saved and used to schedule future reviews.
            </Typography>

            {/* Queue pills */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, width: '100%', px: { xs: 4, sm: 6 }, mb: 2 }}>
              {[
                { label: 'New', count: counts.newCount, color: '#1565c0', bg: 'rgba(21,101,192,0.08)', border: 'rgba(21,101,192,0.2)' },
                { label: 'Learning', count: counts.learningCount, color: '#c13a00', bg: 'rgba(193,58,0,0.08)', border: 'rgba(193,58,0,0.2)' },
                { label: 'Review', count: counts.reviewCount, color: '#2e7d32', bg: 'rgba(46,125,50,0.08)', border: 'rgba(46,125,50,0.2)' },
              ].map((stat) => (
                <Box
                  key={stat.label}
                  sx={{
                    flex: 1,
                    background: stat.bg,
                    border: `1px solid ${stat.border}`,
                    borderRadius: '10px',
                    px: 1,
                    py: 1.25,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      color: stat.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "'EB Garamond', serif",
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      color: stat.color,
                      lineHeight: 1.1,
                      mt: 0.5,
                    }}
                  >
                    {stat.count}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Button
              variant="contained"
              onClick={onStartDaily}
              disabled={!user || totalDue === 0}
              sx={{
                background: '#2c1a0e',
                color: '#f5ede0',
                fontFamily: 'Jost, sans-serif',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '10px',
                py: 1.2,
                px: 4,
                fontSize: '0.95rem',
                '&:hover': { background: '#1a0f08' },
                '&.Mui-disabled': {
                  background: 'rgba(44,26,14,0.3)',
                  color: 'rgba(245,237,224,0.5)',
                },
              }}
            >
              Start Daily Review
            </Button>
            {!user && (
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.75rem',
                  color: '#9e8a7a',
                  mt: 1,
                }}
              >
                Log in to access daily review
              </Typography>
            )}
          </Box>

          {/* RIGHT — Level donut */}
          <Box sx={{ width: '33.333%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2, px: 1, position: 'relative' }}>
            <Box
              onClick={() => setView('center')}
              sx={{
                position: 'absolute',
                left: 4,
                top: 0,
                bottom: 0,
                width: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              <ChevronLeft size={24} color="#9e8a7a" />
            </Box>
            <DonutChart
              segments={levelBreakdown}
              total={totalDue}
              label="cards"
              size={130}
              strokeWidth={16}
            />
          </Box>
        </Box>
      </Box>

      {/* Dot indicators */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
        {(['left', 'center', 'right'] as const).map((v) => (
          <Box
            key={v}
            onClick={() => setView(v)}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: view === v ? '#b8860b' : 'rgba(44,26,14,0.15)',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
          />
        ))}
      </Box>
    </Box>
  )
}

/* ── Main Component ── */
export default function MobileLayout({
  isDailyReview,
  setIsDailyReview,
  showCustomOptions,
  setShowCustomOptions,
  modeToggles,
  setModeToggles,
  onHelpClick,
  counts,
  dueCards,
  user,
  onStartDaily,
  levels,
  toggleLevel,
  expandedLevelCode,
  expandLevel,
  levelSelectedCount,
  allSelectedForLevel,
  someSelectedForLevel,
  toggleAllForLevel,
  toggleTheme,
  selectedLevelCodes,
  selectedThemeKeys,
  cardCount,
  setCardCount,
  sliderMax,
  totalSelectedWords,
  totalSelectedThemes,
  handleStart,
  startDisabled,
  loading,
}: MobileLayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: isDailyReview ? '80px' : '140px' }}>
      {/* ── Mode Toggle ── */}
      <Box sx={{ display: 'flex', justifyContent: 'center', px: 1, mb: 1 }}>
        <ToggleButtonGroup
          value={isDailyReview ? 'daily' : 'custom'}
          exclusive
          fullWidth
          sx={{
            maxWidth: 360,
            '& .MuiToggleButtonGroup-grouped': {
              border: '1.5px solid #2c1a0e',
              borderRadius: '10px !important',
              mx: 0.5,
              fontFamily: 'Jost, sans-serif',
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'none',
              color: '#2c1a0e',
              background: 'transparent',
              '&.Mui-selected': {
                background: '#2c1a0e',
                color: '#f5ede0',
                '&:hover': { background: '#1a0f08' },
              },
              '&:hover': { background: 'rgba(44,26,14,0.06)' },
            },
          }}
        >
          <ToggleButton
            value="daily"
            onClick={() => {
              setIsDailyReview(true)
              setShowCustomOptions(false)
            }}
          >
            Daily Review
          </ToggleButton>
          <ToggleButton
            value="custom"
            onClick={() => {
              setIsDailyReview(false)
              setShowCustomOptions(true)
            }}
          >
            Custom Practice
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── Daily Review Content ── */}
      {isDailyReview && (
        <DailyReviewCarousel
          counts={counts}
          dueCards={dueCards}
          user={user}
          onStartDaily={onStartDaily}
        />
      )}

      {/* ── Custom Practice Content ── */}
      {!isDailyReview && (
        <>
          {/* Mode toggles */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 1.5,
              p: 1.5,
              border: '1.5px solid rgba(44,26,14,0.12)',
              borderRadius: '10px',
            }}
          >
            <Box sx={{ gridColumn: '1', gridRow: '1 / 3' }}>
              <ModeToggleCard
                label="Normal"
                description="Standard practice"
                isActive={!modeToggles.scholar && !modeToggles.weakWords && !modeToggles.reverse && !modeToggles.rapidFire}
                onClick={() => setModeToggles({ reverse: false, rapidFire: false, scholar: false, weakWords: false })}
                onHelpClick={() => onHelpClick('normal')}
              />
            </Box>
            <Box sx={{ gridColumn: '2', gridRow: '1' }}>
              <ModeToggleCard
                label="Reverse"
                description="English → Arabic"
                isActive={modeToggles.reverse}
                onClick={() => setModeToggles(prev => ({ ...prev, reverse: !prev.reverse }))}
                onHelpClick={() => onHelpClick('reverse')}
              />
            </Box>
            <Box sx={{ gridColumn: '2', gridRow: '2' }}>
              <ModeToggleCard
                label="Rapid Fire"
                description="5-second timer"
                isActive={modeToggles.rapidFire}
                onClick={() => setModeToggles(prev => ({ ...prev, rapidFire: !prev.rapidFire }))}
                onHelpClick={() => onHelpClick('rapidFire')}
              />
            </Box>
            <Box sx={{ gridColumn: '3', gridRow: '1' }}>
              <ModeToggleCard
                label="Scholar"
                description="Hans Wehr words"
                isActive={modeToggles.scholar}
                onClick={() => setModeToggles(prev => ({ ...prev, scholar: !prev.scholar, weakWords: false }))}
                onHelpClick={() => onHelpClick('scholar')}
              />
            </Box>
            <Box sx={{ gridColumn: '3', gridRow: '2' }}>
              <ModeToggleCard
                label="Weak Words"
                description="Focus on weaknesses"
                isActive={modeToggles.weakWords}
                onClick={() => setModeToggles(prev => ({ ...prev, weakWords: !prev.weakWords, scholar: false }))}
                onHelpClick={() => onHelpClick('weakWords')}
              />
            </Box>
          </Box>

          {/* Sticky Start Bar */}
          <Box
            sx={{
              position: 'fixed',
              bottom: 56,
              left: 0,
              right: 0,
              background: '#fff',
              borderRadius: 0,
              boxShadow: '0 -2px 12px rgba(44,26,14,0.08)',
              p: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              zIndex: 1100,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
              <Slider
                value={cardCount}
                min={0}
                max={sliderMax}
                step={1}
                onChange={(_, v) => setCardCount(v as number)}
                disabled={totalSelectedWords === 0}
                sx={{
                  flex: 1,
                  maxWidth: 160,
                  color: '#b8860b',
                  '& .MuiSlider-thumb': { width: 12, height: 12 },
                  '& .MuiSlider-rail': { height: 3 },
                  '& .MuiSlider-track': { height: 3 },
                }}
              />
              <TextField
                type="number"
                value={cardCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) {
                    setCardCount(Math.max(5, Math.min(val, sliderMax)))
                  }
                }}
                disabled={totalSelectedWords === 0}
                size="small"
                slotProps={{
                  htmlInput: {
                    min: 5,
                    max: sliderMax,
                    style: { textAlign: 'center', fontWeight: 700, padding: '4px 0', fontSize: '0.85rem' },
                  },
                }}
                sx={{
                  width: 56,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.9rem',
                    color: '#2c1a0e',
                    py: 0,
                    minHeight: 36,
                  },
                }}
              />
            </Box>

            <Button
              variant="contained"
              onClick={handleStart}
              disabled={startDisabled || cardCount < 10}
              sx={{
                background: '#b8860b',
                color: '#fff',
                fontFamily: 'Jost, sans-serif',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '8px',
                px: 2,
                py: 0.6,
                fontSize: '0.8rem',
                flexShrink: 0,
                minHeight: 32,
                '&:hover': { background: '#9c6b00' },
                '&.Mui-disabled': {
                  background: 'rgba(184,134,11,0.2)',
                  color: 'rgba(26,14,0,0.4)',
                },
              }}
            >
              Start
            </Button>
          </Box>

          {/* Level Selector Cards — matching homepage grid */}
          <Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              {levels.map((level) => (
                <Box
                  key={level.code}
                  sx={{
                    ...(level.code === 'C2' && { gridColumn: { xs: 'span 2', sm: 'auto' } }),
                  }}
                >
                  <LevelCard
                    code={level.code}
                    title={level.name}
                    wordCount={level.totalWords}
                    themeCount={level.themes.length}
                    selected={selectedLevelCodes.includes(level.code)}
                    disabled={level.themes.length === 0}
                    onClick={() => toggleLevel(level.code)}
                  />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Accordion Stack — cleaned up */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {levels.filter((l) => selectedLevelCodes.includes(l.code)).map((level) => {
              const isExpanded = expandedLevelCode === level.code
              const selCount = levelSelectedCount(level.code)
              const allSel = allSelectedForLevel(level.code)
              const someSel = someSelectedForLevel(level.code)
              const hasThemes = level.themes.length > 0
              const color = LEVEL_COLORS[level.code] ?? '#b8860b'

              return (
                <Box
                  key={level.code}
                  sx={{
                    background: LEVEL_BG[level.code] ?? '#fff',
                    border: `1px solid ${color}28`,
                    borderRadius: 0,
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Collapsed Bar */}
                  <Box
                    onClick={() => hasThemes && expandLevel(level.code)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: '14px 16px',
                      cursor: hasThemes ? 'pointer' : 'default',
                      opacity: hasThemes ? 1 : 0.5,
                      '&:hover': hasThemes ? { background: 'rgba(255,255,255,0.5)' } : undefined,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: "'EB Garamond', serif",
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          px: 1.2,
                          py: 0.4,
                          borderRadius: '999px',
                          background: color + '18',
                          color,
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >
                        {level.code}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '0.875rem',
                          color: '#2c1a0e',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {level.name}
                      </Typography>
                      {selCount > 0 && (
                        <Typography
                          sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#b8860b',
                            background: 'rgba(184,134,11,0.10)',
                            px: 1,
                            py: 0.3,
                            borderRadius: '999px',
                            flexShrink: 0,
                          }}
                        >
                          {selCount} selected
                        </Typography>
                      )}
                    </Box>
                    <Box
                      sx={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: '#9e8a7a',
                        flexShrink: 0,
                      }}
                    >
                      <ChevronDown size={20} />
                    </Box>
                  </Box>

                  {/* Expanded Content */}
                  <Box
                    sx={{
                      maxHeight: isExpanded ? 2000 : 0,
                      opacity: isExpanded ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.25s ease, opacity 0.2s ease',
                    }}
                  >
                    {isExpanded && hasThemes && (
                      <>
                        <Box
                          sx={{
                            borderTop: `1px solid ${color}18`,
                            px: 2,
                            py: 1.25,
                          }}
                        >
                          <Box
                            onClick={() => toggleAllForLevel(level.code, !(allSel || someSel))}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <CustomCheckbox
                              checked={allSel}
                              indeterminate={someSel}
                              color={color}
                              onClick={() => toggleAllForLevel(level.code, !(allSel || someSel))}
                            />
                            <Typography
                              sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: '#5a4e47',
                              }}
                            >
                              Select all themes
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          {level.themes.map((theme) => {
                            const isSelected = selectedThemeKeys.has(`${level.code}:${theme.theme_id}`)
                            return (
                              <Box
                                key={theme.theme_id}
                                onClick={() => toggleTheme(level.code, theme.theme_id)}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                  px: 2,
                                  py: 1.25,
                                  background: isSelected ? 'rgba(184,134,11,0.05)' : 'transparent',
                                  borderTop: `1px solid ${color}12`,
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease',
                                  '&:hover': { background: 'rgba(184,134,11,0.06)' },
                                }}
                              >
                                <CustomCheckbox
                                  checked={isSelected}
                                  color={color}
                                  onClick={() => toggleTheme(level.code, theme.theme_id)}
                                />
                                <Typography
                                  sx={{
                                    flex: 1,
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#2c1a0e',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {theme.display_name}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.75rem',
                                    color: '#7a6e65',
                                    flexShrink: 0,
                                  }}
                                >
                                  {theme.total_words}
                                </Typography>
                              </Box>
                            )
                          })}
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        </>
      )}
    </Box>
  )
}
