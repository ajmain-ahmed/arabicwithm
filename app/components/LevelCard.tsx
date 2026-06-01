'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'

/* ─────────────────────────────────────────────
   Level styling constants
───────────────────────────────────────────── */
const LEVEL_COLORS: Record<string, string> = {
  A0: '#2d6a4f',
  A1: '#40916c',
  A2: '#52b788',
  B1: '#b5861a',
  B2: '#9c6b00',
  C1: '#6d4c9e',
  C2: '#4a2f7a',
}

const LEVEL_BG_GRADIENT: Record<string, string> = {
  A0: 'linear-gradient(135deg, #f5faf7 0%, #e8f5ee 100%)',
  A1: 'linear-gradient(135deg, #f5faf8 0%, #e8f5ef 100%)',
  A2: 'linear-gradient(135deg, #f5faf8 0%, #e8f5ef 100%)',
  B1: 'linear-gradient(135deg, #fdfbf5 0%, #f5f0e0 100%)',
  B2: 'linear-gradient(135deg, #fdfbf5 0%, #f5f0e0 100%)',
  C1: 'linear-gradient(135deg, #f9f7fb 0%, #f0ebf5 100%)',
  C2: 'linear-gradient(135deg, #f9f7fb 0%, #f0ebf5 100%)',
}

const LEVEL_IMAGE: Record<string, string> = {
  A0: '/homepage/level-cards/a0-lantern.avif',
  A1: '/homepage/level-cards/a1-mosque.avif',
  A2: '/homepage/level-cards/a2-architecture.avif',
  B1: '/homepage/level-cards/b1-books.avif',
  B2: '/homepage/level-cards/b2-compass.avif',
  C1: '/homepage/level-cards/c1-inkwell.avif',
  C2: '/homepage/level-cards/c2-book.avif',
}

const LEVEL_DESCRIPTION: Record<string, string> = {
  A0: 'Start your journey with essential words.',
  A1: 'Build basic phrases and everyday expressions.',
  A2: 'Communicate in familiar situations with confidence.',
  B1: 'Understand and share ideas on familiar topics.',
  B2: 'Discuss abstract topics with clarity and detail.',
  C1: 'Express complex ideas fluently and effectively.',
  C2: 'Master the language with nuance and depth.',
}

const LEVEL_PATTERN: Record<string, string> = {
  A0: 'grid',
  A1: 'dots',
  A2: 'diagonal',
  B1: 'cross',
  B2: 'bamboo',
  C1: 'diamond',
  C2: 'zigzag',
}

/* ─────────────────────────────────────────────
   Decorative pattern
───────────────────────────────────────────── */
function CardPattern({ color, levelCode }: { color: string; levelCode: string }) {
  const id = LEVEL_PATTERN[levelCode] ?? 'grid'
  const patternId = `${id}-${levelCode}`

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        opacity: 0.12,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`grid-${levelCode}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={color} strokeWidth="0.8" />
          </pattern>
          <pattern id={`dots-${levelCode}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill={color} />
          </pattern>
          <pattern id={`diagonal-${levelCode}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke={color} strokeWidth="0.6" />
          </pattern>
          <pattern id={`cross-${levelCode}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M12 0v24M0 12h24" stroke={color} strokeWidth="0.5" />
          </pattern>
          <pattern id={`bamboo-${levelCode}`} width="8" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 0 Q4 8 0 16 M8 0 Q4 8 8 16" stroke={color} strokeWidth="0.5" fill="none" />
          </pattern>
          <pattern id={`diamond-${levelCode}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M10 0 L20 10 L10 20 L0 10 Z" stroke={color} strokeWidth="0.5" fill="none" />
          </pattern>
          <pattern id={`zigzag-${levelCode}`} width="20" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6 L5 0 L10 6 L15 0 L20 6" stroke={color} strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */
export interface LevelCardProps {
  code: string
  title: string
  wordCount: number
  themeCount: number
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function LevelCard({
  code,
  title,
  wordCount,
  themeCount,
  selected = false,
  disabled = false,
  onClick,
}: LevelCardProps) {
  const color = LEVEL_COLORS[code] ?? '#2c1a0e'
  const bg = LEVEL_BG_GRADIENT[code] ?? '#fff'
  const image = LEVEL_IMAGE[code]
  const description = LEVEL_DESCRIPTION[code]

  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        position: 'relative',
        background: bg,
        border: `2px solid ${selected ? color : `${color}18`}`,
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        opacity: disabled ? 0.4 : 1,
        '&:hover': disabled
          ? undefined
          : {
              transform: 'translateY(-5px)',
              boxShadow: selected
                ? `0 14px 36px ${color}30`
                : `0 14px 36px ${color}18`,
            },
      }}
    >
      <CardPattern color={color} levelCode={code} />

      {/* Selection indicator */}
      {selected && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Box>
      )}

      {/* Top area: text left, image right */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
          p: { xs: 1.5, lg: 2 },
          gap: 1,
        }}
      >
        {/* Text content */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Typography
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: { xs: '1.6rem', lg: '1.9rem' },
              fontWeight: 700,
              lineHeight: 1.1,
              color: color,
              mb: 0.5,
            }}
          >
            {code}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: { xs: '0.78rem', lg: '0.88rem' },
              fontWeight: 700,
              color: '#2c1a0e',
              lineHeight: 1.3,
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: { xs: '0.68rem', lg: '0.75rem' },
              color: '#7a6e65',
              lineHeight: 1.45,
            }}
          >
            {description}
          </Typography>
        </Box>

        {/* Illustration */}
        {image && (
          <Box
            component="img"
            src={image}
            alt={title}
            sx={{
              width: { xs: 60, sm: 75, lg: 95, xl: 100 },
              height: { xs: 60, sm: 75, lg: 95, xl: 100 },
              objectFit: 'contain',
              objectPosition: 'center right',
              flexShrink: 0,
              alignSelf: 'center',
            }}
          />
        )}
      </Box>

      {/* Bottom stats bar */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, lg: 1.5 },
          px: { xs: 1.5, lg: 2 },
          py: 1,
          borderTop: `1px solid ${color}12`,
          background: 'rgba(255,255,255,0.35)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AutoStoriesOutlinedIcon sx={{ fontSize: { xs: 13, lg: 15 }, color, opacity: 0.5 }} />
          <Typography
            sx={{
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: { xs: '0.7rem', lg: '0.78rem' },
              fontWeight: 600,
              color: '#7a6e65',
              whiteSpace: 'nowrap',
            }}
          >
            {wordCount.toLocaleString()} words
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <GridViewOutlinedIcon sx={{ fontSize: { xs: 13, lg: 15 }, color, opacity: 0.5 }} />
          <Typography
            sx={{
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: { xs: '0.7rem', lg: '0.78rem' },
              fontWeight: 600,
              color: '#7a6e65',
              whiteSpace: 'nowrap',
            }}
          >
            {themeCount} themes
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
