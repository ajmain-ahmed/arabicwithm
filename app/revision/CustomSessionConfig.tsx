'use client'

import React, { useState, useMemo } from 'react'
import {
  Box, Typography, Button, Slider, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Chip, FormControlLabel,
} from '@mui/material'
import { fetchCustomSessionCards } from '@/app/actions/revision'
import type { RevisionCard } from '@/app/actions/revision'

const LEVEL_COLORS: Record<string, string> = {
  A0: '#d32f2f',
  A1: '#1976d2',
  A2: '#388e3c',
  B1: '#f57c00',
  B2: '#7b1fa2',
  C1: '#00796b',
  C2: '#c2185b',
}

type ThemeMeta = {
  theme_id: number
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
  onStart: (cards: RevisionCard[]) => void
}

export default function CustomSessionConfig({ metadata, onStart }: CustomSessionConfigProps) {
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedThemes, setSelectedThemes] = useState<number[]>([])
  const [cardCount, setCardCount] = useState(10)
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (metadata.length > 0 && selectedLevels.length === 0) {
      if (metadata.some(l => l.code === 'A0')) setSelectedLevels(['A0'])
    }
  }, [metadata])

  const availableWords = useMemo(() => {
    return metadata
      .filter(l => selectedLevels.includes(l.code))
      .reduce((s, l) => {
        const themes = selectedThemes.length > 0
          ? l.themes.filter(t => selectedThemes.includes(t.theme_id))
          : l.themes
        return s + themes.reduce((a, t) => a + t.total_words, 0)
      }, 0)
  }, [metadata, selectedLevels, selectedThemes])

  const sliderMax = Math.max(5, availableWords)

  React.useEffect(() => {
    if (availableWords > 0 && cardCount > availableWords) {
      setCardCount(Math.max(5, Math.min(availableWords, 10)))
    }
  }, [availableWords])

  const handleToggleLevel = (code: string) => {
    setSelectedLevels(prev => {
      const includes = prev.includes(code)
      const next = includes ? prev.filter(c => c !== code) : [...prev, code]
      if (includes) {
        const removedThemes = metadata.find(l => l.code === code)?.themes.map(t => t.theme_id) ?? []
        setSelectedThemes(st => st.filter(id => !removedThemes.includes(id)))
      }
      return next
    })
  }

  const handleToggleTheme = (id: number) => {
    setSelectedThemes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const handleStart = async () => {
    setLoading(true)
    try {
      const cards = await fetchCustomSessionCards({
        levelCodes: selectedLevels,
        themeIds: selectedThemes,
        cardCount,
        random: false,
      })
      onStart(cards)
    } catch (err) {
      console.error('Failed to start custom session:', err)
    } finally {
      setLoading(false)
    }
  }

  const allThemesForSelectedLevels = metadata
    .filter(l => selectedLevels.includes(l.code))
    .flatMap(l => l.themes)

  const allSelected = allThemesForSelectedLevels.length > 0 &&
    allThemesForSelectedLevels.every(t => selectedThemes.includes(t.theme_id))

  const handleToggleAllThemes = () => {
    if (allSelected) {
      setSelectedThemes(prev =>
        prev.filter(id => !allThemesForSelectedLevels.some(t => t.theme_id === id))
      )
    } else {
      setSelectedThemes(prev => {
        const newIds = allThemesForSelectedLevels
          .map(t => t.theme_id)
          .filter(id => !prev.includes(id))
        return [...prev, ...newIds]
      })
    }
  }

  const startDisabled = availableWords === 0 || cardCount > availableWords || loading

  const levelForTheme = (themeId: number) =>
    metadata.find(l => l.themes.some(t => t.theme_id === themeId))

  const labelSx = {
    fontFamily: 'Jost, sans-serif',
    fontSize: { xs: '0.75rem', md: '0.9rem' },
    fontWeight: 600,
    color: '#9e8a7a',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    mb: 1,
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Explanation */}
      <Typography sx={{
        fontFamily: 'Jost, sans-serif',
        color: '#7a6e65',
        fontSize: { xs: '0.85rem', md: '1rem' },
        lineHeight: 1.6,
      }}>
        Choose one or more levels, then select specific themes or practice from all of them.
        Adjust the number of cards and start a practice session that isn't saved to your progress.
      </Typography>

      {/* Levels horizontal */}
      <Box>
        <Typography sx={labelSx}>Levels</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {metadata.map(level => {
            const levelColor = LEVEL_COLORS[level.code] ?? '#7a6e65'
            const isSelected = selectedLevels.includes(level.code)
            return (
              <Chip
                key={level.code}
                label={level.label}
                size="small"
                onClick={() => handleToggleLevel(level.code)}
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 500,
                  fontSize: { xs: '0.8rem', md: '1.05rem' },
                  borderRadius: '999px',
                  width: 'fit-content',
                  background: isSelected ? `${levelColor}18` : 'rgba(122,110,101,0.06)',
                  color: isSelected ? levelColor : '#7a6e65',
                  border: `1px solid ${isSelected ? `${levelColor}55` : 'rgba(122,110,101,0.15)'}`,
                  cursor: 'pointer',
                  '&:hover': {
                    background: isSelected ? `${levelColor}22` : 'rgba(122,110,101,0.1)',
                  },
                }}
              />
            )
          })}
        </Box>
      </Box>

      {/* Themes */}
      <Box>
        <Typography sx={labelSx}>Themes</Typography>
        {allThemesForSelectedLevels.length > 0 && (
          <FormControlLabel
            control={
              <Checkbox
                checked={allSelected}
                onChange={handleToggleAllThemes}
                indeterminate={!allSelected && selectedThemes.length > 0 && allThemesForSelectedLevels.some(t => selectedThemes.includes(t.theme_id))}
                sx={{ color: '#b8860b', '&.Mui-checked': { color: '#b8860b' } }}
                size="small"
              />
            }
            label={
              <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: '0.8rem', md: '0.95rem' },
                color: '#5a4e47',
              }}>
                Select all themes
              </Typography>
            }
            sx={{ mb: 1, ml: 0 }}
          />
        )}
        {allThemesForSelectedLevels.length > 0 ? (
          <TableContainer sx={{
            border: '1px solid rgba(184,134,11,0.15)',
            borderRadius: '10px',
            maxHeight: 320,
            background: '#fff',
          }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.85rem' },
                    color: '#5a4e47',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: '#f5ede0',
                  }}>
                    Theme
                  </TableCell>
                  <TableCell align="right" sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.85rem' },
                    color: '#5a4e47',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: '#f5ede0',
                  }}>
                    Words
                  </TableCell>
                  <TableCell align="center" sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.85rem' },
                    color: '#5a4e47',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: '#f5ede0',
                  }}>
                    Include
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allThemesForSelectedLevels.map(theme => {
                  const level = levelForTheme(theme.theme_id)
                  const levelColor = level ? LEVEL_COLORS[level.code] ?? '#7a6e65' : '#7a6e65'
                  const isSelected = selectedThemes.includes(theme.theme_id)
                  return (
                    <TableRow
                      key={theme.theme_id}
                      sx={{
                        background: `${levelColor}0A`,
                        transition: 'background 0.15s',
                        '&:hover': { background: `${levelColor}14` },
                      }}
                    >
                      <TableCell sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: { xs: '0.85rem', md: '1.05rem' },
                        color: '#2c1a0e',
                        borderBottom: '1px solid rgba(184,134,11,0.08)',
                      }}>
                        {theme.display_name}
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: { xs: '0.85rem', md: '1.05rem' },
                        color: '#7a6e65',
                        borderBottom: '1px solid rgba(184,134,11,0.08)',
                      }}>
                        {theme.total_words}
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: '1px solid rgba(184,134,11,0.08)' }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleTheme(theme.theme_id)}
                          sx={{
                            color: 'rgba(122,110,101,0.3)',
                            '&.Mui-checked': { color: levelColor },
                            py: 0.5,
                          }}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
            border: '1px dashed rgba(184,134,11,0.25)',
            borderRadius: '10px',
            background: 'rgba(245,237,224,0.3)',
          }}>
            <Typography sx={{
              color: '#9e8a7a',
              fontFamily: 'Jost, sans-serif',
              fontSize: { xs: '0.85rem', md: '1.05rem' },
            }}>
              Select a level to view themes
            </Typography>
          </Box>
        )}
      </Box>

      {/* Card count */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={labelSx}>Card count</Typography>
          <TextField
            type="number"
            value={cardCount}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (!isNaN(val)) setCardCount(Math.max(5, Math.min(val, sliderMax)))
            }}
            slotProps={{ htmlInput: { min: 5, max: sliderMax, step: 5 } }}
            size="small"
            disabled={availableWords === 0}
            sx={{
              width: 80,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontFamily: 'Jost, sans-serif',
                fontWeight: 700,
                fontSize: { xs: '0.9rem', md: '1.05rem' },
                color: '#2c1a0e',
              },
            }}
          />
        </Box>
        <Slider
          value={cardCount}
          min={5}
          max={sliderMax}
          step={5}
          onChange={(_, v) => setCardCount(v as number)}
          disabled={availableWords === 0}
          sx={{ color: '#b8860b', '& .MuiSlider-thumb': { width: 18, height: 18 } }}
        />
        <Typography sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: { xs: '0.75rem', md: '0.9rem' },
          color: '#9e8a7a',
          textAlign: 'right',
        }}>
          {availableWords} words available
        </Typography>
      </Box>

      {/* Start button */}
      <Button
        variant="contained"
        onClick={handleStart}
        disabled={startDisabled}
        fullWidth
        sx={{
          background: 'linear-gradient(135deg, #b8860b 0%, #d4a843 100%)',
          color: '#1a0e00',
          fontFamily: 'Jost, sans-serif',
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: '10px',
          py: { xs: 1.2, md: 1.4 },
          fontSize: { xs: '0.95rem', md: '1.15rem' },
          boxShadow: '0 6px 20px rgba(184,134,11,0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #d4a843 0%, #e6c060 100%)',
            boxShadow: '0 8px 28px rgba(184,134,11,0.4)',
          },
          '&.Mui-disabled': { background: 'rgba(184,134,11,0.2)', color: 'rgba(26,14,0,0.4)' },
        }}
      >
        {loading ? 'Loading…' : 'Start Custom Practice'}
      </Button>
    </Box>
  )
}
