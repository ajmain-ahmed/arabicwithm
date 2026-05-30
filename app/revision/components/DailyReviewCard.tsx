'use client'

import React from 'react'
import { Box, Typography, Button } from '@mui/material'

interface DailyReviewCardProps {
  isActive: boolean
  onClick: () => void
  counts?: { newCount: number; learningCount: number; reviewCount: number }
  onStartDaily?: () => void
  user?: { id: string } | null
}

function DailyReviewCard({
  isActive,
  onClick,
  counts,
  onStartDaily,
  user,
}: DailyReviewCardProps) {
  const hasCounts = counts !== undefined
  const totalDue = hasCounts ? counts.newCount + counts.learningCount + counts.reviewCount : 0
  const canStart = hasCounts && user && totalDue > 0

  return (
    <Box
      onClick={onClick}
      sx={{
        background: '#2c1a0e',
        borderRadius: '14px',
        cursor: 'pointer',
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.2s ease',
        outline: isActive ? '3px solid #b8860b' : '3px solid transparent',
        outlineOffset: 2,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(44,26,14,0.25)',
        },
      }}
    >
      <Box
        component="img"
        src="/themes/study.avif"
        alt="Daily Review"
        sx={{
          width: '40%',
          objectFit: 'cover',
          objectPosition: 'center',
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', p: '18px 20px', gap: 0.75 }}>
        <Typography
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontSize: '1.3rem',
            fontWeight: 700,
            color: '#f5ede0',
            lineHeight: 1.2,
          }}
        >
          Daily Review
        </Typography>

        {!hasCounts && (
          <Typography
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.78rem',
              color: 'rgba(245,237,224,0.55)',
              lineHeight: 1.4,
            }}
          >
            Spaced repetition review
          </Typography>
        )}

        {hasCounts && (
          <>
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.72rem',
                color: 'rgba(245,237,224,0.55)',
                lineHeight: 1.4,
              }}
            >
              SM2 based spaced repetition, using cards from your Drill Deck.
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#5c9fd6', fontWeight: 600 }}>
                {counts.newCount}
              </Typography>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: 'rgba(245,237,224,0.35)', fontWeight: 400 }}>
                -
              </Typography>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#e07a5f', fontWeight: 600 }}>
                {counts.learningCount}
              </Typography>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: 'rgba(245,237,224,0.35)', fontWeight: 400 }}>
                -
              </Typography>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#81c784', fontWeight: 600 }}>
                {counts.reviewCount}
              </Typography>
              {totalDue === 0 && (
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: 'rgba(245,237,224,0.5)', ml: 0.5 }}>
                  All caught up
                </Typography>
              )}
            </Box>

            {canStart && onStartDaily && (
              <Button
                variant="contained"
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartDaily()
                }}
                sx={{
                  alignSelf: 'flex-start',
                  mt: 0.5,
                  background: '#f5ede0',
                  color: '#2c1a0e',
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '8px',
                  px: 2,
                  py: 0.5,
                  fontSize: '0.8rem',
                  minWidth: 0,
                  '&:hover': { background: '#e8dcc8' },
                }}
              >
                Start
              </Button>
            )}
            {!user && (
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: 'rgba(245,237,224,0.5)', mt: 0.3 }}>
                Log in to review
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

export default React.memo(DailyReviewCard)
