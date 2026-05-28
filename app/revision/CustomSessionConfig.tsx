'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Slider,
  TextField,
  useMediaQuery,
} from '@mui/material'
import { Check, Search, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchCustomSessionCards } from '@/app/actions/revision'
import type { RevisionCard, LevelProgressStat } from '@/app/actions/revision'

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const LEVEL_COLORS: Record<string, string> = {
  A0: '#2d6a4f',
  A1: '#1976d2',
  A2: '#388e3c',
  B1: '#f57c00',
  B2: '#7b1fa2',
  C1: '#00796b',
  C2: '#c2185b',
}

const LEVEL_NAMES: Record<string, string> = {
  A0: 'Absolute Beginner',
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Lower Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
  C2: 'Proficiency',
}

const ALL_LEVEL_CODES = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/* ─────────────────────────────────────────────
   Practice Modes
───────────────────────────────────────────── */
type PracticeMode =
  | 'daily-review'
  | 'random-themes'
  | 'reverse-mode'
  | 'rapid-fire'
  | 'scholar-mode'
  | 'weak-words'

const PRACTICE_MODES: {
  key: PracticeMode
  label: string
  description: string
  group: 'standalone' | 'grouped'
}[] = [
  { key: 'daily-review', label: 'Daily Review', description: 'Your due cards', group: 'standalone' },
  { key: 'reverse-mode', label: 'Reverse Mode', description: 'English → Arabic', group: 'grouped' },
  { key: 'rapid-fire', label: 'Rapid Fire', description: 'Speed practice', group: 'grouped' },
  { key: 'scholar-mode', label: 'Scholar Mode', description: 'Deep study', group: 'grouped' },
  { key: 'weak-words', label: 'Weak Words Only', description: 'Focus on hard cards', group: 'grouped' },
]

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type ThemeMeta = {
  theme_id: string
  display_name: string
  total_words: number
}

type LevelMeta = {
  code: string
  label: string
  themes: ThemeMeta[]
}

interface CustomSessionConfigProps {
  metadata: LevelMeta[]
  counts: { newCount: number; learningCount: number; reviewCount: number }
  user: { id: string } | null
  levelProgress: LevelProgressStat[]
  onStartDaily: () => void
  onStart: (cards: RevisionCard[]) => void
}

type NormalizedLevel = {
  code: string
  name: string
  themes: ThemeMeta[]
  totalWords: number
}

/* ─────────────────────────────────────────────
   Custom Checkbox
───────────────────────────────────────────── */
function CustomCheckbox({
  checked,
  indeterminate = false,
  onClick,
}: {
  checked: boolean
  indeterminate?: boolean
  onClick: () => void
}) {
  return (
    <Box
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      sx={{
        width: 18,
        height: 18,
        borderRadius: '4px',
        border: '2px solid',
        borderColor: checked || indeterminate ? '#b8860b' : 'rgba(44,26,14,0.25)',
        background: checked || indeterminate ? '#b8860b' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s ease',
      }}
    >
      {checked && (
        <Check size={12} strokeWidth={3} color="#fff" />
      )}
      {indeterminate && !checked && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '2px',
            background: '#b8860b',
          }}
        />
      )}
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Daily Review Card (horizontal with image left)
───────────────────────────────────────────── */
function DailyReviewCard({
  isActive,
  onClick,
}: {
  isActive: boolean
  onClick: () => void
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        background: '#2c1a0e',
        borderRadius: '14px',
        cursor: 'pointer',
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.2s ease',
        outline: isActive ? '3px solid #b8860b' : '3px solid transparent',
        outlineOffset: 2,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(44,26,14,0.25)',
        },
      }}
    >
      <Box
        component="img"
        src="/themes/study.avif"
        alt="Daily Review"
        sx={{
          width: '40%',
          objectFit: 'cover',
          objectPosition: 'center',
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', p: '22px 24px', gap: 1 }}>
        <Typography
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#f5ede0',
            lineHeight: 1.2,
          }}
        >
          Daily Review
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.8rem',
            color: 'rgba(245,237,224,0.55)',
            lineHeight: 1.4,
          }}
        >
          Spaced repetition review
        </Typography>
      </Box>
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Custom Quiz Card (horizontal with image left)
───────────────────────────────────────────── */
function CustomQuizCard({ onClick }: { onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        background: '#fff',
        border: '1.5px solid rgba(44,26,14,0.10)',
        borderRadius: '14px',
        cursor: 'pointer',
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#b8860b',
          boxShadow: '0 4px 16px rgba(184,134,11,0.12)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        component="img"
        src="/themes/transport.avif"
        alt="Custom Quiz"
        sx={{
          width: '40%',
          objectFit: 'cover',
          objectPosition: 'center',
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', p: '22px 24px', gap: 1 }}>
        <Typography
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#2c1a0e',
            lineHeight: 1.2,
          }}
        >
          Custom Quiz
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.8rem',
            color: '#7a6e65',
            lineHeight: 1.4,
          }}
        >
          Choose your own practice
        </Typography>
      </Box>
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Option Card (small, for custom options)
───────────────────────────────────────────── */
function OptionCard({
  mode,
  isActive,
  onClick,
}: {
  mode: (typeof PRACTICE_MODES)[number]
  isActive: boolean
  onClick: () => void
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        background: isActive ? 'rgba(184,134,11,0.08)' : '#fff',
        border: '1.5px solid',
        borderColor: isActive ? '#b8860b' : 'rgba(44,26,14,0.10)',
        borderRadius: '10px',
        p: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0.5,
        transition: 'all 0.15s ease',
        minHeight: 72,
        '&:hover': {
          borderColor: '#b8860b',
          boxShadow: '0 1px 4px rgba(184,134,11,0.12)',
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: '0.9rem',
          fontWeight: 700,
          color: isActive ? '#2c1a0e' : '#5a4e47',
          lineHeight: 1.2,
        }}
      >
        {mode.label}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.7rem',
          color: isActive ? '#7a6e65' : '#9e8a7a',
          lineHeight: 1.3,
        }}
      >
        {mode.description}
      </Typography>
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function CustomSessionConfig({ metadata, counts, user, levelProgress, onStartDaily, onStart }: CustomSessionConfigProps) {
  const isDesktop = useMediaQuery('(min-width:1024px)')

  const [selectedLevelCodes, setSelectedLevelCodes] = useState<string[]>([])
  const [selectedThemeKeys, setSelectedThemeKeys] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLevelCode, setExpandedLevelCode] = useState<string | null>(null)
  const [expandedLevelCodes, setExpandedLevelCodes] = useState<Set<string>>(new Set())
  const [cardCount, setCardCount] = useState(10)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('daily-review')
  const [showCustomOptions, setShowCustomOptions] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  /* ── Normalize levels ── */
  const levels = useMemo<NormalizedLevel[]>(() => {
    return ALL_LEVEL_CODES.map((code) => {
      const meta = metadata.find((m) => m.code === code)
      const themes = meta?.themes ?? []
      return {
        code,
        name: LEVEL_NAMES[code],
        themes,
        totalWords: themes.reduce((s, t) => s + t.total_words, 0),
      }
    })
  }, [metadata])

  const maxWords = useMemo(
    () => Math.max(1, ...levels.map((l) => l.totalWords)),
    [levels]
  )

  /* ── Auto-select A0 on first load ── */
  useEffect(() => {
    if (metadata.length > 0 && selectedLevelCodes.length === 0) {
      const a0 = levels.find((l) => l.code === 'A0')
      if (a0 && a0.themes.length > 0) {
        setSelectedLevelCodes(['A0'])
        setExpandedLevelCodes(new Set(['A0']))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata])

  /* ── Helper: composite theme key ── */
  const themeKey = useCallback((levelCode: string, themeId: string) => `${levelCode}:${themeId}`, [])
  const parseThemeKey = useCallback((key: string) => {
    const idx = key.indexOf(':')
    return { levelCode: key.slice(0, idx), themeId: key.slice(idx + 1) }
  }, [])

  /* ── Derived: filtered + grouped themes (desktop) ── */
  const groupedThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return levels
      .filter((l) => selectedLevelCodes.includes(l.code))
      .map((level) => {
        const filtered = q
          ? level.themes.filter((t) =>
              t.display_name.toLowerCase().includes(q)
            )
          : level.themes
        return { level, themes: filtered }
      })
      .filter((g) => g.themes.length > 0)
  }, [levels, selectedLevelCodes, searchQuery])

  const totalSelectedWords = useMemo(() => {
    return Array.from(selectedThemeKeys).reduce((sum, key) => {
      const { levelCode, themeId } = parseThemeKey(key)
      const level = levels.find((l) => l.code === levelCode)
      const theme = level?.themes.find((t) => t.theme_id === themeId)
      return sum + (theme?.total_words ?? 0)
    }, 0)
  }, [levels, selectedThemeKeys, parseThemeKey])

  const totalSelectedThemes = selectedThemeKeys.size
  const sliderMax = Math.max(5, totalSelectedWords)

  /* ── Card count clamp ── */
  useEffect(() => {
    if (totalSelectedWords > 0 && cardCount > totalSelectedWords) {
      setCardCount(Math.max(5, Math.min(totalSelectedWords, 10)))
    }
  }, [totalSelectedWords, cardCount])

  /* ── Handlers ── */
  const toggleLevel = useCallback(
    (code: string) => {
      setSelectedLevelCodes((prev) => {
        const includes = prev.includes(code)
        const next = includes ? prev.filter((c) => c !== code) : [...prev, code]
        // Remove themes from deselected level
        if (includes) {
          setSelectedThemeKeys((set) => {
            const n = new Set(set)
            Array.from(n).forEach((key) => {
              if (key.startsWith(`${code}:`)) n.delete(key)
            })
            return n
          })
        }
        // Expand the newly checked level in accordion (desktop)
        if (!includes) {
          setExpandedLevelCodes((prevExpanded) => {
            const n = new Set(prevExpanded)
            n.add(code)
            return n
          })
        }
        // On mobile, expand the level when selecting
        if (!isDesktop && !includes) {
          setExpandedLevelCode(code)
        }
        return next
      })
    },
    [isDesktop]
  )

  const toggleTheme = useCallback((levelCode: string, themeId: string) => {
    const key = `${levelCode}:${themeId}`
    setSelectedThemeKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleAllForLevel = useCallback(
    (levelCode: string, checked: boolean) => {
      const level = levels.find((l) => l.code === levelCode)
      if (!level) return
      setSelectedThemeKeys((prev) => {
        const next = new Set(prev)
        level.themes.forEach((t) => {
          const key = `${levelCode}:${t.theme_id}`
          if (checked) next.add(key)
          else next.delete(key)
        })
        return next
      })
    },
    [levels]
  )

  const expandLevel = useCallback((code: string) => {
    setExpandedLevelCode((prev) => (prev === code ? null : code))
  }, [])

  const toggleLevelAccordion = useCallback((code: string) => {
    setExpandedLevelCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const levelSelectedCount = useCallback(
    (code: string) => {
      const level = levels.find((l) => l.code === code)
      if (!level) return 0
      return level.themes.filter((t) => selectedThemeKeys.has(`${code}:${t.theme_id}`)).length
    },
    [levels, selectedThemeKeys]
  )

  const allSelectedForLevel = useCallback(
    (code: string) => {
      const level = levels.find((l) => l.code === code)
      if (!level || level.themes.length === 0) return false
      return level.themes.every((t) => selectedThemeKeys.has(`${code}:${t.theme_id}`))
    },
    [levels, selectedThemeKeys]
  )

  const someSelectedForLevel = useCallback(
    (code: string) => {
      const level = levels.find((l) => l.code === code)
      if (!level || level.themes.length === 0) return false
      const count = level.themes.filter((t) => selectedThemeKeys.has(`${code}:${t.theme_id}`)).length
      return count > 0 && count < level.themes.length
    },
    [levels, selectedThemeKeys]
  )

  const handleStart = async () => {
    if (selectedThemeKeys.size === 0) return
    setLoading(true)
    try {
      // Extract unique theme IDs from composite keys
      const themeIds = Array.from(new Set(Array.from(selectedThemeKeys).map((k) => parseThemeKey(k).themeId)))
      const cards = await fetchCustomSessionCards({
        levelCodes: selectedLevelCodes,
        themeIds,
        cardCount,
      })
      onStart(cards)
    } catch (err) {
      console.error('Failed to start custom session:', err)
    } finally {
      setLoading(false)
    }
  }

  const startDisabled = selectedThemeKeys.size === 0 || cardCount > totalSelectedWords || loading

  /* ── Sidebar level selected summary ── */
  const sidebarSelectedThemes = useMemo(() => {
    return Array.from(selectedThemeKeys).map((key) => {
      const { levelCode, themeId } = parseThemeKey(key)
      const level = levels.find((l) => l.code === levelCode)
      return level?.themes.find((t) => t.theme_id === themeId)
    }).filter(Boolean) as ThemeMeta[]
  }, [levels, selectedThemeKeys, parseThemeKey])

  const sidebarSelectedWords = sidebarSelectedThemes.reduce((s, t) => s + t.total_words, 0)

  /* ── Header subtitle text ── */
  const headerSubtitle = useMemo(() => {
    if (selectedLevelCodes.length === 0) return 'Select at least one level to begin'
    if (selectedLevelCodes.length === 1) {
      const name = LEVEL_NAMES[selectedLevelCodes[0]]
      return `Select themes from ${name} to practice`
    }
    return `Select themes across ${selectedLevelCodes.length} levels to practice`
  }, [selectedLevelCodes])

  /* ── Results footer text ── */
  const resultsFooter = useMemo(() => {
    const themeCount = groupedThemes.reduce((s, g) => s + g.themes.length, 0)
    const levelCount = groupedThemes.length
    if (searchQuery.trim()) {
      return `${themeCount} theme${themeCount === 1 ? '' : 's'} found across ${levelCount} level${levelCount === 1 ? '' : 's'}`
    }
    return `${themeCount} theme${themeCount === 1 ? '' : 's'} across ${levelCount} level${levelCount === 1 ? '' : 's'}`
  }, [groupedThemes, searchQuery])

  /* ═══════════════════════════════════════════
     DESKTOP LAYOUT
  ═══════════════════════════════════════════ */
  if (isDesktop) {
    return (
      <Box sx={{ display: 'flex', minHeight: 600, mx: -3 }}>
        {/* ── Left Sidebar ── */}
        <Box
          sx={{
            width: 280,
            flexShrink: 0,
            borderRight: '1px solid rgba(44,26,14,0.08)',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#9e8a7a',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              px: '3px',
            }}
          >
            Levels
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {levels.map((level) => {
              const isSelected = selectedLevelCodes.includes(level.code)
              const selCount = levelSelectedCount(level.code)
              const hasThemes = level.themes.length > 0
              const isDailyMode = practiceMode === 'daily-review'
              const progressStat = levelProgress.find((p) => p.level === level.code)
              const progressPct = progressStat && progressStat.total > 0
                ? (progressStat.mastered / progressStat.total) * 100
                : 0
              return (
                <Box
                  key={level.code}
                  onClick={() => !isDailyMode && hasThemes && toggleLevel(level.code)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: '10px 14px',
                    borderRadius: '8px',
                    borderLeft: '3px solid',
                    borderLeftColor: isSelected ? '#b8860b' : 'transparent',
                    background: isSelected
                      ? 'rgba(184,134,11,0.10)'
                      : 'transparent',
                    cursor: isDailyMode || !hasThemes ? 'default' : 'pointer',
                    opacity: isDailyMode ? 0.35 : hasThemes ? 1 : 0.4,
                    transition: 'all 0.15s ease',
                    '&:hover': !isDailyMode && hasThemes
                      ? {
                          background: isSelected
                            ? 'rgba(184,134,11,0.12)'
                            : 'rgba(44,26,14,0.04)',
                        }
                      : undefined,
                  }}
                >
                  <CustomCheckbox
                    checked={isSelected}
                    onClick={() => !isDailyMode && hasThemes && toggleLevel(level.code)}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: isSelected ? '#2c1a0e' : '#7a6e65',
                        lineHeight: 1.2,
                      }}
                    >
                      {level.code}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.75rem',
                        color: isSelected ? '#7a6e65' : '#9e8a7a',
                        lineHeight: 1.3,
                      }}
                    >
                      {level.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                      <Typography
                        sx={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '0.7rem',
                          color: '#9e8a7a',
                        }}
                      >
                        {level.totalWords} words
                      </Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 3,
                          background: 'rgba(44,26,14,0.08)',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${progressPct}%`,
                            height: '100%',
                            background: isSelected ? '#b8860b' : 'rgba(44,26,14,0.2)',
                            borderRadius: '999px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  {selCount > 0 && (
                    <Typography
                      sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#b8860b',
                        flexShrink: 0,
                      }}
                    >
                      {selCount}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>

        </Box>

        {/* ── Right Main ── */}
        <Box sx={{ flex: 1, minWidth: 0, p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Mode Selection */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', height: 200 }}>
            {/* Daily Review — left card */}
            <Box sx={{ width: '50%', flexShrink: 0 }}>
              <DailyReviewCard
                isActive={practiceMode === 'daily-review'}
                onClick={() => {
                  setPracticeMode('daily-review')
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
                        setPracticeMode('reverse-mode')
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
                        borderColor: practiceMode !== 'daily-review' ? '#b8860b' : 'rgba(44,26,14,0.12)',
                        borderRadius: '14px',
                        p: 1.5,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 1.5,
                        alignItems: 'stretch',
                        transition: 'border-color 0.2s ease',
                      }}
                    >
                      {PRACTICE_MODES.filter((m) => m.group === 'grouped').map((mode) => (
                        <OptionCard
                          key={mode.key}
                          mode={mode}
                          isActive={practiceMode === mode.key}
                          onClick={() => setPracticeMode(mode.key)}
                        />
                      ))}
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </Box>

          {/* Daily Review Content */}
          {practiceMode === 'daily-review' && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center', minHeight: 300 }}>
              <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center' }}>
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
                  mb: 2,
                  lineHeight: 1.7,
                  fontSize: { xs: '0.9rem', md: '1.05rem' },
                }}>
                  Review words that are due today using spaced repetition.
                  Your progress is saved and used to schedule future reviews.
                </Typography>

                {/* Queue counts */}
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
              </Box>
            </Box>
          )}

          {/* Custom Practice Content */}
          {practiceMode !== 'daily-review' && (
            <>
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
                        background: '#fff',
                        border: '1px solid rgba(44,26,14,0.08)',
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
                              background: 'rgba(184,134,11,0.12)',
                              color: '#b8860b',
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
                        min={5}
                        max={sliderMax}
                        step={5}
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
                    disabled={startDisabled}
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
      </Box>
    )
  }

  /* ═══════════════════════════════════════════
     MOBILE LAYOUT
  ═══════════════════════════════════════════ */
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: '80px' }}>
      {/* ── Mode Selection ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Daily Review Card */}
        <Box sx={{ height: 190 }}>
          <DailyReviewCard
            isActive={practiceMode === 'daily-review'}
            onClick={() => {
              setPracticeMode('daily-review')
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
                    setPracticeMode('reverse-mode')
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
                    borderColor: practiceMode !== 'daily-review' ? '#b8860b' : 'rgba(44,26,14,0.12)',
                    borderRadius: '14px',
                    p: 1.5,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 1.5,
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {PRACTICE_MODES.filter((m) => m.group === 'grouped').map((mode) => (
                    <OptionCard
                      key={mode.key}
                      mode={mode}
                      isActive={practiceMode === mode.key}
                      onClick={() => setPracticeMode(mode.key)}
                    />
                  ))}
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>

      {/* ── Daily Review Content ── */}
      {practiceMode === 'daily-review' && (
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
      {practiceMode !== 'daily-review' && (
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
