'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material'
import { fetchCustomSessionCards } from '@/app/actions/revision'
import type { RevisionCard } from '@/app/actions/revision'
import type { ModeConfig, ThemeMeta, LevelMeta, NormalizedLevel, ModeToggles } from './types'
import DesktopMainPanel from './components/DesktopMainPanel'
import MobileLayout from './components/MobileLayout'



/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
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

const MODE_DESCRIPTIONS: Record<string, string> = {
  normal: 'Study cards the standard way. Arabic word shown first, then reveal the English definition.',
  reverse: 'Flip the question and answer. You see the English definition first and must recall the Arabic word.',
  rapidFire: 'A 5-second countdown timer appears on each card. If time runs out, the card is automatically marked as wrong.',
  scholar: 'Test your knowledge with words from the Hans Wehr dictionary that fall outside the A0–C2 graded vocabulary. (Coming soon)',
  weakWords: 'Focus only on words the system has identified as your weakest. (Coming soon)',
}

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */
interface CustomSessionConfigProps {
  metadata: LevelMeta[]
  counts: { newCount: number; learningCount: number; reviewCount: number }
  dueCards: RevisionCard[]
  user: { id: string } | null
  onStartDaily: () => void
  onStart: (cards: RevisionCard[], modeConfig: ModeConfig) => void
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function CustomSessionConfig({ metadata, counts, dueCards, user, onStartDaily, onStart }: CustomSessionConfigProps) {
  const isDesktop = useMediaQuery('(min-width:1024px)')

  const [selectedLevelCodes, setSelectedLevelCodes] = useState<string[]>([])
  const [selectedThemeKeys, setSelectedThemeKeys] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLevelCode, setExpandedLevelCode] = useState<string | null>(null)
  const [expandedLevelCodes, setExpandedLevelCodes] = useState<Set<string>>(new Set())
  const [cardCount, setCardCount] = useState(10)
  const [showCustomOptions, setShowCustomOptions] = useState(false)
  const [modeToggles, setModeToggles] = useState<ModeToggles>({
    reverse: false,
    rapidFire: false,
    scholar: false,
    weakWords: false,
  })
  const [isDailyReview, setIsDailyReview] = useState(true)
  const [helpDialogOpen, setHelpDialogOpen] = useState<string | null>(null)
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

  /* ── Auto-select A0 on first load ── */
  const hasAutoSelectedRef = useRef(false)
  useEffect(() => {
    if (hasAutoSelectedRef.current) return
    if (metadata.length > 0 && selectedLevelCodes.length === 0) {
      const a0 = levels.find((l) => l.code === 'A0')
      if (a0 && a0.themes.length > 0) {
        hasAutoSelectedRef.current = true
        setSelectedLevelCodes(['A0'])
        setExpandedLevelCodes(new Set(['A0']))
      }
    }
  }, [metadata, levels, selectedLevelCodes.length])

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
        if (includes) {
          setSelectedThemeKeys((set) => {
            const n = new Set(set)
            Array.from(n).forEach((key) => {
              if (key.startsWith(`${code}:`)) n.delete(key)
            })
            return n
          })
        }
        if (!includes) {
          setExpandedLevelCodes((prevExpanded) => {
            const n = new Set(prevExpanded)
            n.add(code)
            return n
          })
        }
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
      const themeIds = Array.from(new Set(Array.from(selectedThemeKeys).map((k) => parseThemeKey(k).themeId)))
      const cards = await fetchCustomSessionCards({
        levelCodes: selectedLevelCodes,
        themeIds,
        cardCount,
      })
      onStart(cards, {
        reverse: modeToggles.reverse,
        rapidFire: modeToggles.rapidFire,
        scholar: modeToggles.scholar,
        weakWords: modeToggles.weakWords,
      })
    } catch (err) {
      console.error('Failed to start custom session:', err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Body class for WordBankWidget positioning ── */
  useEffect(() => {
    if (!isDesktop && !isDailyReview) {
      document.body.classList.add('revision-custom-active')
    } else {
      document.body.classList.remove('revision-custom-active')
    }
    return () => {
      document.body.classList.remove('revision-custom-active')
    }
  }, [isDailyReview, isDesktop])

  const startDisabled = selectedThemeKeys.size === 0 || cardCount > totalSelectedWords || loading

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
     Render
  ═══════════════════════════════════════════ */
  return (
    <>
      {isDesktop ? (
        <Box sx={{ display: 'flex', minHeight: 600, mx: -3 }}>
          <DesktopMainPanel
            levels={levels}
            toggleLevel={toggleLevel}
            isDailyReview={isDailyReview}
            setIsDailyReview={setIsDailyReview}
            showCustomOptions={showCustomOptions}
            setShowCustomOptions={setShowCustomOptions}
            modeToggles={modeToggles}
            setModeToggles={setModeToggles}
            onHelpClick={(mode) => setHelpDialogOpen(mode)}
            counts={counts}
            dueCards={dueCards}
            user={user}
            onStartDaily={onStartDaily}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchInputRef={searchInputRef}
            groupedThemes={groupedThemes}
            allSelectedForLevel={allSelectedForLevel}
            someSelectedForLevel={someSelectedForLevel}
            levelSelectedCount={levelSelectedCount}
            toggleLevelAccordion={toggleLevelAccordion}
            expandedLevelCodes={expandedLevelCodes}
            toggleTheme={toggleTheme}
            toggleAllForLevel={toggleAllForLevel}
            selectedLevelCodes={selectedLevelCodes}
            selectedThemeKeys={selectedThemeKeys}
            headerSubtitle={headerSubtitle}
            resultsFooter={resultsFooter}
            cardCount={cardCount}
            setCardCount={setCardCount}
            sliderMax={sliderMax}
            totalSelectedWords={totalSelectedWords}
            totalSelectedThemes={totalSelectedThemes}
            handleStart={handleStart}
            startDisabled={startDisabled}
            loading={loading}
          />
        </Box>
      ) : (
        <MobileLayout
          isDailyReview={isDailyReview}
          setIsDailyReview={setIsDailyReview}
          showCustomOptions={showCustomOptions}
          setShowCustomOptions={setShowCustomOptions}
          modeToggles={modeToggles}
          setModeToggles={setModeToggles}
          onHelpClick={(mode) => setHelpDialogOpen(mode)}
          counts={counts}
          dueCards={dueCards}
          user={user}
          onStartDaily={onStartDaily}
          levels={levels}
          toggleLevel={toggleLevel}
          expandedLevelCode={expandedLevelCode}
          expandLevel={expandLevel}
          levelSelectedCount={levelSelectedCount}
          allSelectedForLevel={allSelectedForLevel}
          someSelectedForLevel={someSelectedForLevel}
          toggleAllForLevel={toggleAllForLevel}
          toggleTheme={toggleTheme}
          selectedLevelCodes={selectedLevelCodes}
          selectedThemeKeys={selectedThemeKeys}
          cardCount={cardCount}
          setCardCount={setCardCount}
          sliderMax={sliderMax}
          totalSelectedWords={totalSelectedWords}
          totalSelectedThemes={totalSelectedThemes}
          handleStart={handleStart}
          startDisabled={startDisabled}
          loading={loading}
        />
      )}

      {/* Help Dialog */}
      <Dialog open={!!helpDialogOpen} onClose={() => setHelpDialogOpen(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.3rem', color: '#2c1a0e', pr: 5 }}>
          {helpDialogOpen === 'normal' && 'Normal Mode'}
          {helpDialogOpen === 'reverse' && 'Reverse Mode'}
          {helpDialogOpen === 'rapidFire' && 'Rapid Fire'}
          {helpDialogOpen === 'scholar' && 'Scholar Mode'}
          {helpDialogOpen === 'weakWords' && 'Weak Words Only'}
        </DialogTitle>
        <IconButton
          onClick={() => setHelpDialogOpen(null)}
          sx={{ position: 'absolute', right: 12, top: 12, color: '#9e8a7a' }}
        >
          <Box component="span" sx={{ fontSize: '1.4rem', lineHeight: 1 }}>×</Box>
        </IconButton>
        <DialogContent>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: '#7a6e65', lineHeight: 1.7 }}>
            {helpDialogOpen && MODE_DESCRIPTIONS[helpDialogOpen]}
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  )
}
