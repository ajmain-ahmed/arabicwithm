'use client'

import React, { useEffect } from 'react'
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Divider,
  Dialog,
  CircularProgress,
} from '@mui/material'
import { Close, CalendarToday } from '@mui/icons-material'
import InlineVocabText from './InlineVocabText'
import { ArticleFull } from '@/app/lib/news'

const LEVEL_COLORS: Record<string, string> = {
  A1: '#2d6a4f', A2: '#40916c', B1: '#b5861a', B2: '#9c6b00', C1: '#6d4c9e', C2: '#4a2f7a',
}

interface ArticleModalProps {
  article: ArticleFull | null
  open: boolean
  onClose: () => void
  loading: boolean
}

export default function ArticleModal({ article, open, onClose, loading }: ArticleModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const formattedDate = article?.date
    ? new Date(article.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const paragraphs = article?.content
    ? article.content
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : []

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            maxWidth: 900,
            width: '100%',
            m: { xs: 1, md: 3 },
            borderRadius: '16px',
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 32px)',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {loading || !article ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
          }}
        >
          <CircularProgress sx={{ color: '#b8860b' }} />
        </Box>
      ) : (
        <>
          {/* Hero Image */}
          <Box
            sx={{
              width: '100%',
              height: { xs: '220px', md: '360px' },
              position: 'relative',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #2c1a0e 0%, #4a3525 100%)',
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={article.image}
              alt={article.title}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)',
              }}
            />

            {/* Close button */}
            <Box
              sx={{
                position: 'absolute',
                top: { xs: 12, md: 20 },
                right: { xs: 12, md: 20 },
                zIndex: 2,
              }}
            >
              <IconButton
                onClick={onClose}
                sx={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  '&:hover': { background: 'rgba(255,255,255,0.3)' },
                }}
              >
                <Close />
              </IconButton>
            </Box>

            {/* Hero content */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: { xs: 2.5, md: 4 },
                pt: { xs: 5, md: 8 },
              }}
            >
              {/* Meta row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={article.cefr}
                  size="small"
                  sx={{
                    background: LEVEL_COLORS[article.cefr] ?? '#2c1a0e',
                    color: '#fff',
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    letterSpacing: '0.06em',
                  }}
                />
                <Box
                  sx={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(4px)',
                    color: '#f5ede0',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    px: 1.2,
                    py: 0.4,
                    borderRadius: '4px',
                  }}
                >
                  {article.source}
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'rgba(245,237,224,0.7)',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.78rem',
                  }}
                >
                  <CalendarToday sx={{ fontSize: 14 }} />
                  {formattedDate}
                </Box>
              </Box>

              {/* Headline */}
              <Typography
                component="h2"
                sx={{
                  fontFamily: '"EB Garamond", serif',
                  fontSize: { xs: '1.4rem', md: '2.2rem' },
                  fontWeight: 700,
                  color: '#f5ede0',
                  lineHeight: 1.3,
                  direction: 'rtl',
                  textAlign: 'right',
                  textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
              >
                {article.title}
              </Typography>
            </Box>
          </Box>

          {/* Scrollable body */}
          <Box
            sx={{
              overflowY: 'auto',
              flex: 1,
              px: { xs: 2.5, md: 4 },
              py: { xs: 3, md: 4 },
            }}
          >
            {/* Topics */}
            {article.topics.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {article.topics.map((topic) => (
                  <Box
                    key={topic}
                    sx={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '0.75rem',
                      color: '#9e8a7a',
                      background: 'rgba(158,138,122,0.08)',
                      border: '1px solid rgba(158,138,122,0.15)',
                      px: 1.2,
                      py: 0.4,
                      borderRadius: '4px',
                    }}
                  >
                    {topic}
                  </Box>
                ))}
              </Box>
            )}

            <Divider sx={{ borderColor: 'rgba(44,26,14,0.08)', mb: 3 }} />

            {/* Paragraphs */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {paragraphs.map((para, i) => (
                <Typography
                  key={i}
                  component="p"
                  sx={{
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontSize: { xs: '1.15rem', md: '1.35rem' },
                    lineHeight: 1.85,
                    color: '#2c1a0e',
                    direction: 'rtl',
                    textAlign: 'right',
                    fontWeight: 400,
                  }}
                >
                  <InlineVocabText text={para} vocabMap={article.vocabMap} textScale={1} />
                </Typography>
              ))}
            </Box>
          </Box>
        </>
      )}
    </Dialog>
  )
}
