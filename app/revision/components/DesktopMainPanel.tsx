'use client'

import React from 'react'
import { Box, Typography, Button, Slider, TextField } from '@mui/material'
import { Search, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NormalizedLevel, ThemeMeta, ModeToggles } from '@/app/revision/types'
import type { RevisionCard } from '@/app/actions/revision'
import CustomCheckbox from './CustomCheckbox'
import LevelCard from '@/app/components/LevelCard'
import DailyReviewCard from './DailyReviewCard'
import DonutChart from './DonutChart'

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
import CustomQuizCard from './CustomQuizCard'
import ModeToggleCard from './ModeToggleCard'

interface DesktopMainPanelProps {
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
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  groupedThemes: { level: NormalizedLevel; themes: ThemeMeta[] }[]
  allSelectedForLevel: (code: string) => boolean
  someSelectedForLevel: (code: string) => boolean
  levelSelectedCount: (code: string) => number
  toggleLevelAccordion: (code: string) => void
  expandedLevelCodes: Set<string>
  toggleTheme: (levelCode: string, themeId: string) => void
  toggleAllForLevel: (levelCode: string, checked: boolean) => void
  selectedLevelCodes: string[]
  selectedThemeKeys: Set<string>
  headerSubtitle: string
  resultsFooter: string
  cardCount: number
  setCardCount: (v: number) => void
  sliderMax: number
  totalSelectedWords: number
  totalSelectedThemes: number
  handleStart: () => void
  startDisabled: boolean
  loading: boolean
  levels: NormalizedLevel[]
  toggleLevel: (code: string) => void
}

export default function DesktopMainPanel({
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
  searchQuery,
  setSearchQuery,
  searchInputRef,
  groupedThemes,
  allSelectedForLevel,
  someSelectedForLevel,
  levelSelectedCount,
  toggleLevelAccordion,
  expandedLevelCodes,
  toggleTheme,
  toggleAllForLevel,
  selectedLevelCodes,
  selectedThemeKeys,
  headerSubtitle,
  resultsFooter,
  cardCount,
  setCardCount,
  sliderMax,
  totalSelectedWords,
  totalSelectedThemes,
  handleStart,
  startDisabled,
  loading,
  levels,
  toggleLevel,
}: DesktopMainPanelProps) {
  const totalDue = counts.newCount + counts.learningCount + counts.reviewCount

  const levelBreakdown = React.useMemo(() => {
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

  return (
    <Box sx={{ flex: 1, minWidth: 0, p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Mode Selection */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', height: 200 }}>
        {/* Daily Review — left card */}
        <Box sx={{ width: '50%', flexShrink: 0 }}>
          <DailyReviewCard
            isActive={isDailyReview}
            onClick={() => {
              setIsDailyReview(true)
              setShowCustomOptions(false)
            }}
          />
        </Box>

        {/* Right side — Custom Quiz or Options */}
        <Box sx={{ width: '50%', position: 'relative', height: '100%' }}>
          <AnimatePresence mode="wait">
            {!showCustomOptions ? (
              <motion.div
                key="custom-quiz"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                style={{ height: '100%' }}
              >
                <CustomQuizCard
                  onClick={() => {
                    setShowCustomOptions(true)
                    setIsDailyReview(false)
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="custom-options"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                style={{ height: '100%' }}
              >
                <Box
                  sx={{
                    height: '100%',
                    border: '2px solid',
                    borderColor: !isDailyReview ? '#b8860b' : 'rgba(44,26,14,0.12)',
                    borderRadius: '14px',
                    p: 1.5,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: 1.5,
                    alignItems: 'stretch',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <Box sx={{ gridColumn: '1', gridRow: '1 / 3', height: '100%' }}>
                    <ModeToggleCard
                      label="Normal Mode"
                      description="Standard Arabic → English"
                      isActive={!modeToggles.scholar && !modeToggles.weakWords && !modeToggles.reverse && !modeToggles.rapidFire}
                      onClick={() => setModeToggles({ reverse: false, rapidFire: false, scholar: false, weakWords: false })}
                      onHelpClick={() => onHelpClick('normal')}
                    />
                  </Box>
                  <Box sx={{ gridColumn: '2', gridRow: '1', height: '100%' }}>
                    <ModeToggleCard
                      label="Reverse Mode"
                      description="English → Arabic"
                      isActive={modeToggles.reverse}
                      onClick={() => setModeToggles(prev => ({ ...prev, reverse: !prev.reverse }))}
                      onHelpClick={() => onHelpClick('reverse')}
                    />
                  </Box>
                  <Box sx={{ gridColumn: '2', gridRow: '2', height: '100%' }}>
                    <ModeToggleCard
                      label="Rapid Fire"
                      description="5-second countdown"
                      isActive={modeToggles.rapidFire}
                      onClick={() => setModeToggles(prev => ({ ...prev, rapidFire: !prev.rapidFire }))}
                      onHelpClick={() => onHelpClick('rapidFire')}
                    />
                  </Box>
                  <Box sx={{ gridColumn: '3', gridRow: '1', height: '100%' }}>
                    <ModeToggleCard
                      label="Scholar Mode"
                      description="Hans Wehr dictionary"
                      isActive={modeToggles.scholar}
                      onClick={() => setModeToggles(prev => ({ ...prev, scholar: !prev.scholar, weakWords: false }))}
                      onHelpClick={() => onHelpClick('scholar')}
                    />
                  </Box>
                  <Box sx={{ gridColumn: '3', gridRow: '2', height: '100%' }}>
                    <ModeToggleCard
                      label="Weak Words Only"
                      description="Focus on hard cards"
                      isActive={modeToggles.weakWords}
                      onClick={() => setModeToggles(prev => ({ ...prev, weakWords: !prev.weakWords, scholar: false }))}
                      onHelpClick={() => onHelpClick('weakWords')}
                    />
                  </Box>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>

      {/* Daily Review Content */}
      {isDailyReview && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 300 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: 4, md: 6 },
              maxWidth: 1000,
              mx: 'auto',
              width: '100%',
            }}
          >
            {/* LEFT — Queue breakdown donut */}
            <Box sx={{ flex: '1 1 0', minWidth: 0, display: 'flex', justifyContent: 'flex-end', order: { xs: 2, md: 1 } }}>
              <Box sx={{ width: { md: 180, lg: 200 }, display: 'flex', justifyContent: 'center' }}>
                <DonutChart
                  segments={[
                    { label: 'New', color: '#1565c0', pct: totalDue > 0 ? (counts.newCount / totalDue) * 100 : 0 },
                    { label: 'Learning', color: '#c13a00', pct: totalDue > 0 ? (counts.learningCount / totalDue) * 100 : 0 },
                    { label: 'Review', color: '#2e7d32', pct: totalDue > 0 ? (counts.reviewCount / totalDue) * 100 : 0 },
                  ]}
                  total={totalDue}
                  label="cards"
                />
              </Box>
            </Box>

            {/* CENTER — original layout */}
            <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: 420, lg: 480 }, textAlign: 'center', order: { xs: 1, md: 2 } }}>
              <Typography sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: { xs: '1.4rem', md: '1.8rem' },
                fontWeight: 700,
                color: '#2c1a0e',
                mb: 1.5,
              }}>
                Daily Review
              </Typography>
              <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                color: '#7a6e65',
                mb: 3,
                lineHeight: 1.7,
                fontSize: { xs: '0.9rem', md: '1.05rem' },
              }}>
                Review words that are due today using spaced repetition.
                Your progress is saved and used to schedule future reviews.
              </Typography>

              {/* Queue pills */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                {[
                  { label: 'New', count: counts.newCount, color: '#1565c0', bg: 'rgba(21,101,192,0.08)', border: 'rgba(21,101,192,0.2)' },
                  { label: 'Learning', count: counts.learningCount, color: '#c13a00', bg: 'rgba(193,58,0,0.08)', border: 'rgba(193,58,0,0.2)' },
                  { label: 'Review', count: counts.reviewCount, color: '#2e7d32', bg: 'rgba(46,125,50,0.08)', border: 'rgba(46,125,50,0.2)' },
                ].map((stat) => (
                  <Box
                    key={stat.label}
                    sx={{
                      background: stat.bg,
                      border: `1px solid ${stat.border}`,
                      borderRadius: '10px',
                      px: 2,
                      py: 1.5,
                      width: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.65rem', fontWeight: 600, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {stat.label}
                    </Typography>
                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.75rem', fontWeight: 700, color: stat.color, lineHeight: 1.1, mt: 0.5 }}>
                      {stat.count}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Button
                variant="contained"
                onClick={onStartDaily}
                fullWidth
                disabled={!user || totalDue === 0}
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
            </Box>

            {/* RIGHT — Level breakdown donut */}
            <Box sx={{ flex: '1 1 0', minWidth: 0, display: 'flex', justifyContent: 'flex-start', order: { xs: 3, md: 3 } }}>
              <Box sx={{ width: { md: 180, lg: 200 }, display: 'flex', justifyContent: 'center' }}>
                <DonutChart
                  segments={levelBreakdown}
                  total={totalDue}
                  label="cards"
                />
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Custom Practice Content */}
      {!isDailyReview && (
        <>
          {/* Level Selector Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(5, 1fr)',
                xl: 'repeat(7, 1fr)',
              },
              gap: 1,
            }}
          >
            {levels.map((level) => (
              <Box key={level.code}>
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

          {/* Search + Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: { md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#2c1a0e',
                  lineHeight: 1.2,
                }}
              >
                Custom Practice
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.875rem',
                  color: '#7a6e65',
                  mt: 0.3,
                }}
              >
                {headerSubtitle}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                border: '1px solid rgba(44,26,14,0.12)',
                background: '#fff',
                borderRadius: '10px',
                px: 1.5,
                py: 0.75,
                minWidth: 260,
                '&:focus-within': {
                  borderColor: '#b8860b',
                  boxShadow: '0 0 0 2px rgba(184,134,11,0.15)',
                },
              }}
            >
              <Search size={16} color="#9e8a7a" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search themes..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.875rem',
                  color: '#2c1a0e',
                  width: '100%',
                }}
              />
              {searchQuery && (
                <Typography
                  onClick={() => {
                    setSearchQuery('')
                    searchInputRef.current?.focus()
                  }}
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.75rem',
                    color: '#9e8a7a',
                    cursor: 'pointer',
                    flexShrink: 0,
                    '&:hover': { color: '#7a6e65' },
                  }}
                >
                  Clear
                </Typography>
              )}
            </Box>
          </Box>

          {/* Theme Groups — accordion */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            {groupedThemes.map(({ level, themes }) => {
              const allSel = allSelectedForLevel(level.code)
              const someSel = someSelectedForLevel(level.code)
              const selCount = levelSelectedCount(level.code)
              const isExpanded = expandedLevelCodes.has(level.code)
              return (
                <Box
                  key={level.code}
                  sx={{
                    background: LEVEL_BG[level.code] ?? '#fff',
                    border: `1px solid ${(LEVEL_COLORS[level.code] ?? '#b8860b')}28`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Level Section Header — clickable to expand/collapse */}
                  <Box
                    onClick={() => toggleLevelAccordion(level.code)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: '14px 18px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': { background: 'rgba(44,26,14,0.02)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography
                        sx={{
                          fontFamily: "'EB Garamond', serif",
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          px: 1.2,
                          py: 0.4,
                          borderRadius: '999px',
                          background: (LEVEL_COLORS[level.code] ?? '#b8860b') + '18',
                          color: LEVEL_COLORS[level.code] ?? '#b8860b',
                          lineHeight: 1,
                        }}
                      >
                        {level.code}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#2c1a0e',
                        }}
                      >
                        {level.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '0.75rem',
                          color: '#9e8a7a',
                        }}
                      >
                        {level.totalWords} words
                      </Typography>
                      {selCount > 0 && (
                        <Typography
                          sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            color: '#b8860b',
                            background: 'rgba(184,134,11,0.10)',
                            px: 1,
                            py: 0.3,
                            borderRadius: '999px',
                          }}
                        >
                          {selCount} selected
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAllForLevel(level.code, !(allSel || someSel))
                        }}
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
                          color={LEVEL_COLORS[level.code] ?? '#b8860b'}
                          onClick={() => toggleAllForLevel(level.code, !(allSel || someSel))}
                        />
                        <Typography
                          sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.8rem',
                            color: '#7a6e65',
                          }}
                        >
                          {allSel ? 'Deselect all' : 'Select all'}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          color: '#9e8a7a',
                        }}
                      >
                        <ChevronDown size={18} />
                      </Box>
                    </Box>
                  </Box>

                  {/* Collapsible Theme Grid */}
                  <Box
                    sx={{
                      maxHeight: isExpanded ? 2000 : 0,
                      opacity: isExpanded ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease, opacity 0.2s ease',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, 1fr)',
                          lg: 'repeat(3, 1fr)',
                        },
                        gap: '12px',
                        p: '0 18px 18px',
                      }}
                    >
                      {themes.map((theme) => {
                        const isSelected = selectedThemeKeys.has(`${level.code}:${theme.theme_id}`)
                        return (
                          <Box
                            key={theme.theme_id}
                            onClick={() => toggleTheme(level.code, theme.theme_id)}
                            sx={{
                              background: isSelected
                                ? 'rgba(184,134,11,0.05)'
                                : '#faf7f2',
                              border: '1px solid',
                              borderColor: isSelected
                                ? '#b8860b'
                                : 'rgba(44,26,14,0.08)',
                              borderWidth: isSelected ? '2px' : '1px',
                              borderRadius: '10px',
                              p: 2,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                borderColor: '#b8860b',
                                boxShadow: '0 2px 8px rgba(44,26,14,0.08)',
                              },
                            }}
                          >
                            <CustomCheckbox
                              checked={isSelected}
                              color={LEVEL_COLORS[level.code] ?? '#b8860b'}
                              onClick={() => toggleTheme(level.code, theme.theme_id)}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                sx={{
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
                                }}
                              >
                                {theme.total_words} words
                              </Typography>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  </Box>
                </Box>
              )
            })}

            {groupedThemes.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 200,
                  border: '1px dashed rgba(184,134,11,0.25)',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.6)',
                }}
              >
                <Typography
                  sx={{
                    color: '#9e8a7a',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.9rem',
                  }}
                >
                  {selectedLevelCodes.length === 0
                    ? 'Select a level from the sidebar to view themes'
                    : searchQuery
                    ? 'No themes match your search'
                    : 'No themes available for the selected levels'}
                </Typography>
              </Box>
            )}

            {/* Results Footer */}
            {groupedThemes.length > 0 && (
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.75rem',
                  color: '#9e8a7a',
                }}
              >
                {resultsFooter}
              </Typography>
            )}
          </Box>

          {/* Bottom Action Bar */}
          <Box
            sx={{
              position: 'sticky',
              bottom: 0,
              background: '#fff',
              borderRadius: '10px',
              p: 2.5,
              boxShadow: '0 -2px 12px rgba(44,26,14,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
              flexWrap: 'wrap',
              mt: 'auto',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#9e8a7a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Card count
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                  <Slider
                    value={cardCount}
                    min={0}
                    max={sliderMax}
                    step={1}
                    onChange={(_, v) => setCardCount(v as number)}
                    disabled={totalSelectedWords === 0}
                    sx={{
                      width: 320,
                      color: '#b8860b',
                      '& .MuiSlider-thumb': { width: 16, height: 16 },
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
                    slotProps={{ htmlInput: { min: 5, max: sliderMax, style: { textAlign: 'center', fontWeight: 700 } } }}
                    sx={{
                      width: 90,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.9rem',
                        color: '#2c1a0e',
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {totalSelectedThemes > 0 && (
                <Typography
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.85rem',
                    color: '#7a6e65',
                  }}
                >
                  {totalSelectedThemes} theme{totalSelectedThemes === 1 ? '' : 's'} ·{' '}
                  {totalSelectedWords} words
                </Typography>
              )}
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
                  borderRadius: '10px',
                  px: 3,
                  py: 1.2,
                  fontSize: '0.95rem',
                  '&:hover': { background: '#9c6b00' },
                  '&.Mui-disabled': {
                    background: 'rgba(184,134,11,0.2)',
                    color: 'rgba(26,14,0,0.4)',
                  },
                }}
              >
                {loading ? 'Loading…' : 'Start Custom Practice'}
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Box>
  )
}
