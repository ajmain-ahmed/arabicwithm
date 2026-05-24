'use client'

import React from 'react'
import { Card, CardMedia, CardContent, Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { UnifiedArticle } from '@/app/lib/news'
import InlineVocabText from './InlineVocabText'
import PlaceholderImage from './PlaceholderImage'
import { getTimeAgo } from './TimeAgo'

interface SideCardProps {
  article: UnifiedArticle
}

export default function SideCard({ article }: SideCardProps) {
  const router = useRouter()
  const timeAgo = getTimeAgo(article.date)

  return (
    <Card
      onClick={() => router.push(`/news/${article.id}`)}
      sx={{
        cursor: 'pointer',
        display: 'flex',
        gap: 1.5,
        alignItems: 'center',
        borderRadius: '8px',
        transition: 'background 0.2s ease',
        boxShadow: 'none',
        background: 'transparent',
        '&:hover': { background: 'rgba(184,134,11,0.04)' },
        py: 0.5,
      }}
    >
      {article.image ? (
        <CardMedia
          component="img"
          image={article.image}
          alt={article.title}
          sx={{
            width: { xs: 80, md: 100 },
            height: { xs: 56, md: 70 },
            borderRadius: '8px',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <Box sx={{ width: { xs: 80, md: 100 }, height: { xs: 56, md: 70 }, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
          <PlaceholderImage label={article.sourceLabel} aspectRatio="auto" sx={{ height: '100%' }} />
        </Box>
      )}

      <CardContent
        sx={{
          minWidth: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          p: 0,
          '&:last-child': { pb: 0 },
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontSize: { xs: '0.85rem', md: '0.95rem' },
            fontWeight: 700,
            color: '#2c1a0e',
            lineHeight: 1.35,
            direction: 'rtl',
            textAlign: 'right',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          <InlineVocabText text={article.title} vocabMap={article.vocabMap || {}} textScale={0.85} propagateClick />
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          <Box
            sx={{
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.6rem',
              fontWeight: 600,
              px: 0.7,
              py: 0.15,
              borderRadius: '9999px',
            }}
          >
            {article.sourceLabel}
          </Box>
          <Box
            sx={{
              background: 'rgba(0,0,0,0.55)',
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.6rem',
              fontWeight: 500,
              px: 0.7,
              py: 0.15,
              borderRadius: '9999px',
            }}
          >
            {timeAgo}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
