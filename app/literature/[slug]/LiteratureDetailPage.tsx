'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Container,
  Chip,
  Button,
} from '@mui/material'
import { ArrowBack, AutoStories, Public, OpenInNew } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import InlineVocabText from '@/app/news/components/InlineVocabText'
import type { LiteratureItem } from '@/app/actions/literature'
import type { InlineVocabEntry } from '@/app/news/components/InlineVocabText'

interface Props {
  item: LiteratureItem
  vocabMap: Record<string, InlineVocabEntry>
}

export default function LiteratureDetailPage({ item, vocabMap }: Props) {
  const router = useRouter()
  const [navbarHeight, setNavbarHeight] = useState(64)

  useEffect(() => {
    const measure = () => {
      const nav = document.getElementById('main-navbar')
      if (nav) setNavbarHeight(nav.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const isPoem = item.type === 'poem'
  const lines = isPoem ? item.content.split('\n') : [item.content]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Jost:wght@300;400;500;600;700&display=swap');
      `}</style>

      <Box
        component="main"
        sx={{
          background: '#faf7f2',
          minHeight: '100dvh',
          pt: `${navbarHeight}px`,
          pb: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          {/* Back button */}
          <Box
            onClick={() => router.push('/literature')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.85rem',
              color: '#b8860b',
              fontWeight: 500,
              mb: { xs: 4, md: 5 },
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            <ArrowBack sx={{ fontSize: 18 }} />
            Back to literature
          </Box>

          {/* Meta */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
            <Chip
              icon={isPoem ? <AutoStories sx={{ fontSize: 16 }} /> : <Public sx={{ fontSize: 16 }} />}
              label={isPoem ? 'Poetry' : 'Article'}
              size="small"
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 600,
                fontSize: '0.78rem',
                background: 'rgba(184,134,11,0.1)',
                color: '#b8860b',
                border: '1px solid rgba(184,134,11,0.2)',
              }}
            />
            {isPoem && (
              <Chip
                label={item.author}
                size="small"
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  background: 'rgba(14,46,31,0.08)',
                  color: '#0e2e1f',
                  border: '1px solid rgba(14,46,31,0.15)',
                }}
              />
            )}
            <Chip
              label={item.source}
              size="small"
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 500,
                fontSize: '0.75rem',
                background: 'transparent',
                color: '#9e8a7a',
                border: '1px solid rgba(122,110,101,0.2)',
              }}
            />
          </Box>

          {/* Title */}
          <Typography
            component="h1"
            sx={{
              fontFamily: '"EB Garamond", serif',
              fontSize: { xs: '1.8rem', md: '2.4rem' },
              fontWeight: 700,
              color: '#2c1a0e',
              direction: 'rtl',
              textAlign: 'center',
              lineHeight: 1.3,
              mb: { xs: 4, md: 5 },
            }}
          >
            {item.title}
          </Typography>

          {/* Content with inline vocab */}
          <Box
            sx={{
              background: '#fff',
              border: '1px solid rgba(184,134,11,0.1)',
              borderRadius: '12px',
              p: { xs: 3, md: 5 },
            }}
          >
            {isPoem ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {lines.map((line, i) => (
                  <Typography
                    key={i}
                    component="div"
                    sx={{
                      fontFamily: '"EB Garamond", serif',
                      fontSize: { xs: '1.25rem', md: '1.5rem' },
                      fontWeight: 600,
                      color: '#2c1a0e',
                      direction: 'rtl',
                      textAlign: 'center',
                      lineHeight: 1.8,
                    }}
                  >
                    <InlineVocabText text={line} vocabMap={vocabMap} textScale={1.1} />
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography
                component="div"
                sx={{
                  fontFamily: '"EB Garamond", serif',
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  color: '#2c1a0e',
                  direction: 'rtl',
                  textAlign: 'right',
                  lineHeight: 1.9,
                }}
              >
                <InlineVocabText text={item.content} vocabMap={vocabMap} textScale={1} />
              </Typography>
            )}
          </Box>

          {/* External link for Wikipedia articles */}
          {!isPoem && 'url' in item && item.url && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNew sx={{ fontSize: 16 }} />}
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: '#b8860b',
                  textTransform: 'none',
                  '&:hover': { background: 'rgba(184,134,11,0.08)' },
                }}
              >
                Read full article on Wikipedia
              </Button>
            </Box>
          )}
        </Container>
      </Box>
    </>
  )
}
