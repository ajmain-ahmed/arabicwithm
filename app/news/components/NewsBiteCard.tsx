'use client'

import React from 'react'
import { Card, CardMedia, CardContent, CardActions, Button, Box, Typography } from '@mui/material'
import { OpenInNew } from '@mui/icons-material'
import { UnifiedArticle } from '@/app/lib/news'
import InlineVocabText from './InlineVocabText'
import PlaceholderImage from './PlaceholderImage'

interface NewsBiteCardProps {
  article: UnifiedArticle
}

export default function NewsBiteCard({ article }: NewsBiteCardProps) {
  const displayText = article.summary || article.body || ''

  return (
    <Card
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(44,26,14,0.06)',
        border: '1px solid rgba(44,26,14,0.06)',
        background: '#fff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s ease',
        '&:hover': { boxShadow: '0 8px 24px rgba(44,26,14,0.1)' },
      }}
    >
      {/* Image */}
      <Box sx={{ width: '100%', aspectRatio: '16/10', overflow: 'hidden' }}>
        {article.image ? (
          <CardMedia
            component="img"
            image={article.image}
            alt={article.title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <PlaceholderImage label={article.sourceLabel} aspectRatio="auto" sx={{ height: '100%' }} />
        )}
      </Box>

      <CardContent sx={{ flex: 1, p: 2, pb: 1 }}>
        {/* Source + time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <Box
            sx={{
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.62rem',
              fontWeight: 600,
              px: 0.8,
              py: 0.2,
              borderRadius: '9999px',
            }}
          >
            {article.sourceLabel}
          </Box>
        </Box>

        {/* Title */}
        <Typography
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#2c1a0e',
            lineHeight: 1.35,
            direction: 'rtl',
            textAlign: 'right',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 0.75,
          }}
        >
          <InlineVocabText text={article.title} vocabMap={article.vocabMap || {}} textScale={0.85} propagateClick />
        </Typography>

        {/* Summary */}
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.78rem',
            color: '#7a6e65',
            lineHeight: 1.5,
            direction: 'rtl',
            textAlign: 'right',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {displayText}
        </Typography>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0.5 }}>
        <Button
          size="small"
          variant="outlined"
          endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            borderColor: 'rgba(184,134,11,0.4)',
            color: '#b8860b',
            fontFamily: 'Jost, sans-serif',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'none',
            borderRadius: '8px',
            px: 1.5,
            py: 0.5,
            '&:hover': {
              borderColor: '#b8860b',
              background: 'rgba(184,134,11,0.06)',
            },
          }}
        >
          Read on {article.sourceLabel}
        </Button>
      </CardActions>
    </Card>
  )
}
