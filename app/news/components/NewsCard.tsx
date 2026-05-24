'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'

const LEVEL_COLORS: Record<string, string> = {
  A1: '#2d6a4f', A2: '#40916c', B1: '#b5861a', B2: '#9c6b00', C1: '#6d4c9e', C2: '#4a2f7a',
}

export interface NewsCardData {
  slug: string
  title: string
  image: string
  source: string
  date: string
  cefr: string
  topics: string[]
}

export default function NewsCard({ article, onClick }: { article: NewsCardData; onClick: () => void }) {
  const formattedDate = new Date(article.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        background: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(44,26,14,0.08)',
        transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 48px rgba(44,26,14,0.12)',
          borderColor: 'rgba(184,134,11,0.2)',
        },
      }}
    >
      {/* Image */}
      <Box
        sx={{
          width: '100%',
          aspectRatio: '16/10',
          position: 'relative',
          background: 'linear-gradient(135deg, #f5ede0 0%, #e8dfd0 100%)',
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={article.image}
          alt={article.title}
          loading="lazy"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
            '.MuiBox-root:hover &': {
              transform: 'scale(1.03)',
            },
          }}
        />
        {/* CEFR Badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: LEVEL_COLORS[article.cefr] ?? '#2c1a0e',
            color: '#fff',
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            px: 1,
            py: 0.3,
            borderRadius: '4px',
            textTransform: 'uppercase',
          }}
        >
          {article.cefr}
        </Box>

        {/* Source badge */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            color: '#f5ede0',
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.7rem',
            fontWeight: 500,
            px: 1.2,
            py: 0.4,
            borderRadius: '4px',
          }}
        >
          {article.source}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        <Typography
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#2c1a0e',
            lineHeight: 1.4,
            direction: 'rtl',
            textAlign: 'right',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {article.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 'auto', pt: 1 }}>
          {article.topics.slice(0, 2).map((topic) => (
            <Box
              key={topic}
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.7rem',
                color: '#9e8a7a',
                background: 'rgba(158,138,122,0.08)',
                px: 1,
                py: 0.3,
                borderRadius: '4px',
              }}
            >
              {topic}
            </Box>
          ))}
          <Typography
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.72rem',
              color: '#9e8a7a',
              ml: 'auto',
            }}
          >
            {formattedDate}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
