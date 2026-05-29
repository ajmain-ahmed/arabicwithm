'use client'

import React from 'react'
import { Box, Typography, Button, Slider, TextField } from '@mui/material'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NormalizedLevel, ModeToggles } from '@/app/revision/types'
import CustomCheckbox from './CustomCheckbox'
import DailyReviewCard from './DailyReviewCard'
import CustomQuizCard from './CustomQuizCard'
import ModeToggleCard from './ModeToggleCard'

interface MobileSessionConfigProps {
  isDailyReview: boolean
  setIsDailyReview: (v: boolean) => void
  showCustomOptions: boolean
  setShowCustomOptions: (v: boolean) => void
  modeToggles: ModeToggles
  setModeToggles: React.Dispatch<React.SetStateAction<ModeToggles>>
  onHelpClick: (mode: string) => void
  counts: { newCount: number; learningCount: number; reviewCount: number }
  user: { id: string } | null
  onStartDaily: () => void
  levels: NormalizedLevel[]
  expandedLevelCode: string | null
  expandLevel: (code: string) => void
  levelSelectedCount: (code: string) => number
  allSelectedForLevel: (code: string) => boolean
  someSelectedForLevel: (code: string) => boolean
  toggleAllForLevel: (levelCode: string, checked: boolean) => void
  toggleTheme: (levelCode: string, themeId: string) => void
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

export default function MobileSessionConfig({
  isDailyReview,
  setIsDailyReview,
  showCustomOptions,
  setShowCustomOptions,
  modeToggles,
  setModeToggles,
  onHelpClick,
  counts,
  user,
  onStartDaily,
  levels,
  expandedLevelCode,
  expandLevel,
  levelSelectedCount,
  allSelectedForLevel,
  someSelectedForLevel,
  toggleAllForLevel,
  toggleTheme,
  selectedThemeKeys,
  cardCount,
  setCardCount,
  sliderMax,
  totalSelectedWords,
  totalSelectedThemes,
  handleStart,
  startDisabled,
  loading,
}: MobileSessionConfigProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: '80px' }}>
      {/* ── Mode Selection ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        {/* Daily Review Card */}
        <Box sx={{ height: 190 }}>
          <DailyReviewCard
            isActive={isDailyReview}
            onClick={() => {
              setIsDailyReview(true)
              setShowCustomOptions(false)
            }}
          />
        </Box>

        {/* Custom Quiz Card or Options */}
        <Box sx={{ height: 190, position: 'relative' }}>
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
              >
                <Box
                  sx={{
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
                      label="Normal"
                      description="Standard practice"
                      isActive={!modeToggles.scholar && !modeToggles.weakWords && !modeToggles.reverse && !modeToggles.rapidFire}
                      onClick={() => setModeToggles({ reverse: false, rapidFire: false, scholar: false, weakWords: false })}
                      onHelpClick={() => onHelpClick('normal')}
                    />
                  </Box>
                  <Box sx={{ gridColumn: '2', gridRow: '1', height: '100%' }}>
                    <ModeToggleCard
                      label="Reverse"
                      description="English → Arabic"
                      isActive={modeToggles.reverse}
                      onClick={() => setModeToggles(prev => ({ ...prev, reverse: !prev.reverse }))}
                      onHelpClick={() => onHelpClick('reverse')}
                    />
                  </Box>
                  <Box sx={{ gridColumn: '2', gridRow: '2', height: '100%' }}>
                    <ModeToggleCard
                      label="Rapid Fire"
                      description="5-second timer"
                      isActive={modeToggles.rapidFire}
                      onClick={() => setModeToggles(prev => ({ ...prev, rapidFire: !prev.rapidFire }))}
                      onHelpClick={() => onHelpClick('rapidFire')}
                    />
                  </Box>
                  <Box sx={{ gridColumn: '3', gridRow: '1', height: '100%' }}>
                    <ModeToggleCard
                      label="Scholar"
                      description="Hans Wehr words"
                      isActive={modeToggles.scholar}
                      onClick={() => setModeToggles(prev => ({ ...prev, scholar: !prev.scholar, weakWords: false }))}
                      onHelpClick={() => onHelpClick('scholar')}
                    />
                  </Box>
                  <Box sx={{ gridColumn: '3', gridRow: '2', height: '100%' }}>
                    <ModeToggleCard
                      label="Weak Words"
                      description="Focus on weaknesses"
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

      {/* ── Daily Review Content ── */}
      {isDailyReview && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', textAlign: 'center', py: 2 }}>
          <Box>
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
                fontSize: '0.9rem',
                lineHeight: 1.6,
                px: 2,
              }}
            >
              Review words that are due today using spaced repetition.
            </Typography>
          </Box>

          {/* Queue counts */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, width: '100%', px: 1 }}>
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
                  px: 1.5,
                  py: 1.5,
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
                    fontSize: '1.5rem',
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
            fullWidth
            disabled={!user || counts.newCount + counts.learningCount + counts.reviewCount === 0}
            sx={{
              background: '#2c1a0e',
              color: '#f5ede0',
              fontFamily: 'Jost, sans-serif',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              py: 1.2,
              fontSize: '0.95rem',
              mx: 1,
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
                fontSize: '0.8rem',
                color: '#9e8a7a',
                mt: -1,
              }}
            >
              Log in to access daily review
            </Typography>
          )}
        </Box>
      )}

      {/* ── Custom Practice Content ── */}
      {!isDailyReview && (
        <>
          {/* Accordion Stack */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {levels.map((level) => {
              const isExpanded = expandedLevelCode === level.code
              const selCount = levelSelectedCount(level.code)
              const allSel = allSelectedForLevel(level.code)
              const someSel = someSelectedForLevel(level.code)
              const hasThemes = level.themes.length > 0

              return (
                <Box
                  key={level.code}
                  sx={{
                    background: '#fff',
                    border: '1px solid rgba(44,26,14,0.08)',
                    borderRadius: '10px',
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
                      p: '16px 20px',
                      cursor: hasThemes ? 'pointer' : 'default',
                      opacity: hasThemes ? 1 : 0.5,
                      '&:hover': hasThemes ? { background: '#fdfaf5' } : undefined,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography
                        sx={{
                          fontFamily: "'EB Garamond', serif",
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          px: 1.2,
                          py: 0.4,
                          borderRadius: '999px',
                          background: '#f5ede0',
                          color: '#b8860b',
                          lineHeight: 1,
                        }}
                      >
                        {level.code}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '0.875rem',
                          color: '#2c1a0e',
                          fontWeight: 500,
                        }}
                      >
                        {level.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '0.75rem',
                          color: '#7a6e65',
                        }}
                      >
                        {level.totalWords} words
                      </Typography>
                      {selCount > 0 && (
                        <Typography
                          sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.75rem',
                            color: '#b8860b',
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
                            borderTop: '1px solid rgba(44,26,14,0.06)',
                            px: 2,
                            py: 1.5,
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
                              onClick={() => toggleAllForLevel(level.code, !(allSel || someSel))}
                            />
                            <Typography
                              sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.85rem',
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
                                  py: 1.5,
                                  background: isSelected
                                    ? 'rgba(184,134,11,0.05)'
                                    : 'transparent',
                                  borderTop: '1px solid rgba(44,26,14,0.06)',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease',
                                  '&:hover': {
                                    background: 'rgba(184,134,11,0.06)',
                                  },
                                }}
                              >
                                <CustomCheckbox
                                  checked={isSelected}
                                  onClick={() => toggleTheme(level.code, theme.theme_id)}
                                />
                                <Typography
                                  sx={{
                                    flex: 1,
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.875rem',
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

          {/* Floating Bottom Bar */}
          <Box
            sx={{
              position: 'fixed',
              bottom: 55.8,
              left: 0,
              right: 0,
              background: '#fff',
              borderRadius: '10px 10px 0 0',
              boxShadow: '0 -4px 20px rgba(44,26,14,0.1)',
              p: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              zIndex: 1300,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
              <Box sx={{ flexShrink: 0 }}>
                <Typography
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: '#9e8a7a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Cards
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                  <Slider
                    value={cardCount}
                    min={5}
                    max={sliderMax}
                    step={5}
                    onChange={(_, v) => setCardCount(v as number)}
                    disabled={totalSelectedWords === 0}
                    sx={{
                      width: 140,
                      ml: 1,
                      color: '#b8860b',
                      '& .MuiSlider-thumb': { width: 14, height: 14 },
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
                        style: { textAlign: 'center', fontWeight: 700, padding: '4px 0', fontSize: '0.8rem' },
                      },
                    }}
                    sx={{
                      width: 50,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.85rem',
                        color: '#2c1a0e',
                        py: 0,
                      },
                    }}
                  />
                </Box>
              </Box>
              {totalSelectedThemes > 0 && (
                <Typography
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.75rem',
                    color: '#7a6e65',
                    flexShrink: 0,
                  }}
                >
                  {totalSelectedThemes} theme{totalSelectedThemes === 1 ? '' : 's'}
                </Typography>
              )}
            </Box>

            <Button
              variant="contained"
              onClick={handleStart}
              disabled={startDisabled}
              sx={{
                background: '#b8860b',
                color: '#fff',
                fontFamily: 'Jost, sans-serif',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '10px',
                px: 2.5,
                py: 1,
                fontSize: '0.85rem',
                flexShrink: 0,
                mt: 0.5,
                '&:hover': { background: '#9c6b00' },
                '&.Mui-disabled': {
                  background: 'rgba(184,134,11,0.2)',
                  color: 'rgba(26,14,0,0.4)',
                },
              }}
            >
              Start
              {totalSelectedThemes > 0 && (
                <Box
                  component="span"
                  sx={{
                    ml: 0.8,
                    background: 'rgba(255,255,255,0.25)',
                    borderRadius: '999px',
                    px: 0.8,
                    py: 0.15,
                    fontSize: '0.7rem',
                  }}
                >
                  {totalSelectedThemes}
                </Box>
              )}
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}
