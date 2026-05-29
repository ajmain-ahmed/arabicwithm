'use client'

import { Box, Typography } from '@mui/material'
import type { LevelProgressStat } from '@/app/actions/revision'
import type { NormalizedLevel } from '@/app/revision/types'
import CustomCheckbox from './CustomCheckbox'

interface DesktopSidebarProps {
  levels: NormalizedLevel[]
  selectedLevelCodes: string[]
  levelProgress: LevelProgressStat[]
  isDailyReview: boolean
  onToggleLevel: (code: string) => void
  levelSelectedCount: (code: string) => number
}

export default function DesktopSidebar({
  levels,
  selectedLevelCodes,
  levelProgress,
  isDailyReview,
  onToggleLevel,
  levelSelectedCount,
}: DesktopSidebarProps) {
  return (
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
          const isDailyMode = isDailyReview
          const progressStat = levelProgress.find((p) => p.level === level.code)
          const progressPct = progressStat && progressStat.total > 0
            ? (progressStat.mastered / progressStat.total) * 100
            : 0
          return (
            <Box
              key={level.code}
              onClick={() => !isDailyMode && hasThemes && onToggleLevel(level.code)}
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
                onClick={() => !isDailyMode && hasThemes && onToggleLevel(level.code)}
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
  )
}
