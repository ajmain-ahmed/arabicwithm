'use client'

import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { WORD_SEARCH_DIFFICULTIES, type WordSearchDifficulty } from '@/app/lib/transcriptPuzzles'

const DIFFICULTIES = Object.entries(WORD_SEARCH_DIFFICULTIES) as Array<[
  WordSearchDifficulty,
  (typeof WORD_SEARCH_DIFFICULTIES)[WordSearchDifficulty],
]>

export default function WordSearchDifficultySelector({
  value,
  disabled,
  onChange,
}: {
  value: WordSearchDifficulty
  disabled?: boolean
  onChange: (difficulty: WordSearchDifficulty) => void
}) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      disabled={disabled}
      onChange={(_, next: WordSearchDifficulty | null) => { if (next) onChange(next) }}
      aria-label="Word Search difficulty"
      sx={{ width: { xs: '100%', sm: 'auto' }, '& .MuiToggleButton-root': { minWidth: { xs: 0, sm: 104 }, flex: { xs: 1, sm: 'none' }, minHeight: 44, px: { xs: 1.25, sm: 2 }, borderColor: 'divider', color: 'text.secondary', fontFamily: 'Jost, sans-serif', fontWeight: 800, textTransform: 'none', '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } } } }}
    >
      {DIFFICULTIES.map(([key, config]) => (
        <ToggleButton key={key} value={key} aria-label={`${config.label} difficulty, ${config.gridSize} by ${config.gridSize} grid`}>
          {config.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
