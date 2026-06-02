'use client'

import React from 'react'
import { Box, Typography, Button, Divider } from '@mui/material'

/* ── Palette ── */
const BARK = '#2c1a0e'
const GOLD = '#b8860b'
const WARM_WHITE = '#fffaf0'
const MUTED = '#7a6e65'

/* ═══════════════════════════════════════════════
   Filter Sidebar (shared desktop + drawer)
   ═══════════════════════════════════════════════ */
export interface FilterSidebarProps {
  categories: string[]
  levels: string[]
  genres?: string[]
  languages?: string[]
  activeCategory: string
  setActiveCategory: (c: string) => void
  activeLevel: string
  setActiveLevel: (l: string) => void
  activeGenre?: string
  setActiveGenre?: (g: string) => void
  activeLanguage?: string
  setActiveLanguage?: (lang: string) => void
  onMobileClose?: () => void
  hideTitle?: boolean
}

function FilterButtonGroup({
  options,
  active,
  onChange,
  onMobileClose,
}: {
  options: string[]
  active: string
  onChange: (v: string) => void
  onMobileClose?: () => void
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {options.map((opt) => (
        <Button
          key={opt}
          onClick={() => {
            onChange(active === opt ? '' : opt)
            onMobileClose?.()
          }}
          sx={{
            justifyContent: 'flex-start',
            height: 40,
            px: 1.5,
            borderRadius: '6px',
            fontFamily: '"Jost", system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            textTransform: 'none',
            color: active === opt ? BARK : MUTED,
            backgroundColor: active === opt ? 'rgba(184,134,11,0.06)' : WARM_WHITE,
            border: `1px solid ${active === opt ? GOLD : 'rgba(44,26,14,0.1)'}`,
            borderLeft: active === opt ? `3px solid ${GOLD}` : `1px solid rgba(44,26,14,0.1)`,
            '&:hover': { backgroundColor: 'rgba(184,134,11,0.04)' },
            transition: 'all 0.15s',
          }}
        >
          {opt}
        </Button>
      ))}
    </Box>
  )
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: GOLD,
          mb: 1.5,
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
}

export default function FilterSidebar({
  categories,
  levels,
  genres,
  languages,
  activeCategory,
  setActiveCategory,
  activeLevel,
  setActiveLevel,
  activeGenre,
  setActiveGenre,
  activeLanguage,
  setActiveLanguage,
  onMobileClose,
  hideTitle,
}: FilterSidebarProps) {
  return (
    <Box>
      {!hideTitle && (
        <>
          <Typography
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: 20,
              color: BARK,
              mb: 1.5,
            }}
          >
            Filters
          </Typography>
          <Divider sx={{ borderColor: 'rgba(184,134,11,0.2)', mb: 2.5 }} />
        </>
      )}

      {/* ── Category ── */}
      <FilterSection label="Category">
        <FilterButtonGroup
          options={categories}
          active={activeCategory}
          onChange={(v) => setActiveCategory(v || categories[0] || '')}
          onMobileClose={onMobileClose}
        />
      </FilterSection>

      {/* ── Genre ── */}
      {genres && genres.length > 0 && (
        <FilterSection label="Genre">
          <FilterButtonGroup
            options={genres}
            active={activeGenre ?? ''}
            onChange={(v) => setActiveGenre?.(v)}
            onMobileClose={onMobileClose}
          />
        </FilterSection>
      )}

      {/* ── Level ── */}
      <FilterSection label="Level">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
          {levels.map((lvl) => (
            <Button
              key={lvl}
              onClick={() => {
                setActiveLevel(activeLevel === lvl ? '' : lvl)
                onMobileClose?.()
              }}
              sx={{
                height: 36,
                borderRadius: '6px',
                fontFamily: '"Jost", system-ui, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'none',
                color: activeLevel === lvl ? '#fff' : MUTED,
                backgroundColor: activeLevel === lvl ? GOLD : WARM_WHITE,
                border: `1px solid ${activeLevel === lvl ? GOLD : 'rgba(44,26,14,0.1)'}`,
                '&:hover': {
                  backgroundColor: activeLevel === lvl ? GOLD : 'rgba(184,134,11,0.04)',
                },
                transition: 'all 0.15s',
              }}
            >
              {lvl}
            </Button>
          ))}
        </Box>
      </FilterSection>

      {/* ── Language ── */}
      {languages && languages.length > 0 && (
        <FilterSection label="Language">
          <FilterButtonGroup
            options={languages}
            active={activeLanguage ?? ''}
            onChange={(v) => setActiveLanguage?.(v)}
            onMobileClose={onMobileClose}
          />
        </FilterSection>
      )}

      {/* ── Reset ── */}
      <Button
        fullWidth
        onClick={() => {
          setActiveCategory(categories[0] ?? '')
          setActiveLevel('')
          setActiveGenre?.('')
          setActiveLanguage?.('')
          onMobileClose?.()
        }}
        sx={{
          height: 40,
          borderRadius: '6px',
          fontFamily: '"Jost", system-ui, sans-serif',
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'none',
          color: BARK,
          border: '1px solid rgba(44,26,14,0.15)',
          backgroundColor: 'transparent',
          '&:hover': { backgroundColor: 'rgba(44,26,14,0.04)' },
        }}
      >
        Reset Filters
      </Button>
    </Box>
  )
}
