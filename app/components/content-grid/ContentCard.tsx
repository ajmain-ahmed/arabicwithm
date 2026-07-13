'use client'

import React, { useState } from 'react'
import { Box, Typography, Chip, Paper } from '@mui/material'
import { useRouter } from 'next/navigation'

/* ── Palette ── */
const BARK = '#2c1a0e'
const GOLD = '#b8860b'
const WARM_WHITE = '#fffaf0'
const MUTED = '#7a6e65'
const LABEL = '#9e8a7a'

const DIFFICULTY_COLORS: Record<string, string> = {
  'A1-A2': '#6b8f5e',
  'A2-B1': '#5a7d8c',
  'B1-B2': '#c4904a',
  'B2-C1': '#8a6a8a',
}

/* ═══════════════════════════════════════════════
   Content Card
   ═══════════════════════════════════════════════ */
export interface ContentCardMetaItem {
  icon: React.ReactNode
  label: string
}

export interface ContentCardProps {
  slug: string
  hrefPrefix: string
  cover: string
  title: string
  titleAr?: string
  description?: string
  category?: string
  level?: string
  metaItems: ContentCardMetaItem[]
  overlayIcon?: React.ReactNode
  aspectRatio?: string
}

export default function ContentCard({
  slug,
  hrefPrefix,
  cover,
  title,
  titleAr,
  description,
  category,
  level,
  metaItems,
  overlayIcon,
  aspectRatio = '16/9',
}: ContentCardProps) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)
  const router = useRouter()
  const badgeColor = DIFFICULTY_COLORS[level ?? ''] || MUTED

  return (
    <Paper
      elevation={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`${hrefPrefix}/${slug}`)}
      sx={{
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: WARM_WHITE,
        border: '1px solid rgba(44,26,14,0.04)',
        boxShadow: hovered
          ? '0 8px 24px rgba(44,26,14,0.1)'
          : '0 1px 4px rgba(44,26,14,0.06)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      {/* Thumbnail */}
      <Box sx={{ position: 'relative', aspectRatio, overflow: 'hidden' }}>
        {!imgError ? (
          <Box
            component="img"
            src={cover}
            alt={title}
            onError={() => setImgError(true)}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.3s',
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(44,26,14,0.08) 0%, rgba(184,134,11,0.08) 100%)',
              px: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontSize: { xs: 16, md: 18 },
                fontWeight: 600,
                color: BARK,
                textAlign: 'center',
                lineHeight: 1.25,
              }}
            >
              {title}
            </Typography>
          </Box>
        )}
        {/* Bottom gradient */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(transparent 60%, rgba(44,26,14,0.5))',
            pointerEvents: 'none',
          }}
        />
        {/* Overlay icon (play, read, etc.) */}
        {overlayIcon && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: hovered ? 'rgba(44,26,14,0.2)' : 'rgba(44,26,14,0.1)',
              transition: 'background-color 0.2s',
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {overlayIcon}
            </Box>
          </Box>
        )}
        {/* Difficulty badge */}
        {level && (
          <Chip
            label={level}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: badgeColor,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              height: 24,
              borderRadius: '6px',
              '& .MuiChip-label': { px: 1.2, py: 0 },
            }}
          />
        )}
      </Box>

      {/* Card Body */}
      <Box sx={{ p: 2 }}>
        <Typography
          sx={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: { xs: 18, md: 20 },
            fontWeight: 500,
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            color: BARK,
            mb: 0.5,
          }}
          noWrap
        >
          {title}
        </Typography>
        {titleAr && (
          <Typography
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: { xs: 15, md: 18 },
              color: GOLD,
              mb: 1.5,
            }}
            noWrap
          >
            {titleAr}
          </Typography>
        )}
        {/* Tags */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {category && (
            <Chip
              label={category}
              size="small"
              sx={{
                height: 24,
                borderRadius: '9999px',
                backgroundColor: 'rgba(184,134,11,0.08)',
                color: GOLD,
                fontSize: 11,
                fontWeight: 500,
                border: '1px solid rgba(184,134,11,0.12)',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}

        </Box>
        {/* Description */}
        {description && (
          <Typography
            sx={{
              fontSize: { xs: 14, md: 15 },
              lineHeight: 1.45,
              color: MUTED,
              mb: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {description}
          </Typography>
        )}
        {/* Meta row */}
        {metaItems.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              pt: 1.5,
              borderTop: '1px solid rgba(44,26,14,0.06)',
            }}
          >
            {metaItems.map((item, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {item.icon}
                <Typography sx={{ fontSize: { xs: 13, md: 14 }, color: LABEL }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  )
}
