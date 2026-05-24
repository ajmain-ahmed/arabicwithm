'use client'

import React from 'react'
import { Box, Chip, Typography } from '@mui/material'

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const LEVEL_CHIP_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  A1: { bg: '#e8f5e9', color: '#2d6a4f', border: '#c8e6c9' },
  A2: { bg: '#e0f2f1', color: '#00695c', border: '#b2dfdb' },
  B1: { bg: '#fff8e1', color: '#b5861a', border: '#ffecb3' },
  B2: { bg: '#fff3e0', color: '#e65100', border: '#ffe0b2' },
  C1: { bg: '#f3e5f5', color: '#6d4c9e', border: '#e1bee7' },
  C2: { bg: '#ede7f6', color: '#4a2f7a', border: '#d1c4e9' },
}

function FilterSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: '#9e8a7a',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {children}
      </Box>
    </Box>
  )
}

function TopicChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: (topic: string) => void }) {
  return (
    <Chip
      label={label}
      onClick={() => onToggle(label)}
      size="small"
      sx={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '0.8rem',
        fontWeight: 500,
        borderRadius: '6px',
        px: 0.5,
        cursor: 'pointer',
        background: selected ? '#2c1a0e' : 'transparent',
        color: selected ? '#f5ede0' : '#7a6e65',
        border: '1px solid',
        borderColor: selected ? '#2c1a0e' : 'rgba(122,110,101,0.25)',
        transition: 'all 0.2s ease',
        '&:hover': {
          background: selected ? '#1a0f08' : 'rgba(44,26,14,0.06)',
          borderColor: selected ? '#1a0f08' : 'rgba(122,110,101,0.4)',
        },
      }}
    />
  )
}

function LevelChip({ level, selected, onToggle }: { level: string; selected: boolean; onToggle: (level: string) => void }) {
  const colors = LEVEL_CHIP_COLORS[level] ?? { bg: '#f5f5f5', color: '#666', border: '#ddd' }
  return (
    <Chip
      label={level}
      onClick={() => onToggle(level)}
      size="small"
      sx={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '0.78rem',
        fontWeight: 700,
        borderRadius: '4px',
        minWidth: 36,
        cursor: 'pointer',
        background: selected ? colors.color : colors.bg,
        color: selected ? '#fff' : colors.color,
        border: '1px solid',
        borderColor: selected ? colors.color : colors.border,
        transition: 'all 0.2s ease',
        '&:hover': {
          background: selected ? colors.color : colors.bg,
          opacity: selected ? 0.9 : 0.8,
        },
      }}
    />
  )
}

function SourceChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: (source: string) => void }) {
  return (
    <Chip
      label={label}
      onClick={() => onToggle(label)}
      size="small"
      sx={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '0.8rem',
        fontWeight: 500,
        borderRadius: '999px',
        px: 0.5,
        cursor: 'pointer',
        background: selected ? 'rgba(184,134,11,0.12)' : 'transparent',
        color: selected ? '#b8860b' : '#7a6e65',
        border: '1px solid',
        borderColor: selected ? '#b8860b' : 'rgba(122,110,101,0.25)',
        transition: 'all 0.2s ease',
        '&:hover': {
          background: selected ? 'rgba(184,134,11,0.18)' : 'rgba(184,134,11,0.06)',
          borderColor: selected ? '#b8860b' : 'rgba(184,134,11,0.4)',
        },
      }}
    />
  )
}

interface FilterBarProps {
  topics: string[]
  sources: string[]
  selectedTopics: string[]
  selectedLevels: string[]
  selectedSources: string[]
  onToggleTopic: (topic: string) => void
  onToggleLevel: (level: string) => void
  onToggleSource: (source: string) => void
  onClearAll: () => void
  totalCount: number
  filteredCount: number
}

export default function FilterBar({
  topics,
  sources,
  selectedTopics,
  selectedLevels,
  selectedSources,
  onToggleTopic,
  onToggleLevel,
  onToggleSource,
  onClearAll,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const hasFilters = selectedTopics.length > 0 || selectedLevels.length > 0 || selectedSources.length > 0

  return (
    <Box
      sx={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid rgba(44,26,14,0.08)',
        p: { xs: 2, md: 2.5 },
        mb: { xs: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          pb: 1.5,
          borderBottom: '1px solid rgba(44,26,14,0.06)',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#2c1a0e',
          }}
        >
          Filters
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.78rem',
              color: '#9e8a7a',
            }}
          >
            {filteredCount} of {totalCount}
          </Typography>
          {hasFilters && (
            <Typography
              onClick={onClearAll}
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.78rem',
                color: '#b8860b',
                cursor: 'pointer',
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Clear all
            </Typography>
          )}
        </Box>
      </Box>

      <FilterSection title="Topics">
        {topics.map((t) => (
          <TopicChip key={t} label={t} selected={selectedTopics.includes(t)} onToggle={onToggleTopic} />
        ))}
      </FilterSection>

      <FilterSection title="CEFR Level">
        {CEFR_LEVELS.map((l) => (
          <LevelChip key={l} level={l} selected={selectedLevels.includes(l)} onToggle={onToggleLevel} />
        ))}
      </FilterSection>

      <FilterSection title="Source">
        {sources.map((s) => (
          <SourceChip key={s} label={s} selected={selectedSources.includes(s)} onToggle={onToggleSource} />
        ))}
      </FilterSection>
    </Box>
  )
}
