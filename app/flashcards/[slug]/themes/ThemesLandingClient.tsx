'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Typography, Card, CardContent, Container, Breadcrumbs, Link,
  LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { NavigateNext } from '@mui/icons-material'
import type { ThemeProgress } from '@/app/actions/vocab'

function themeDoneCount(t: ThemeProgress): number {
  return t.completed_count + t.revision_count
}

function themeProgressPct(t: ThemeProgress): number {
  return t.total_words > 0 ? Math.round((themeDoneCount(t) / t.total_words) * 100) : 0
}

export default function ThemesLandingClient({
  slug, levelCode, label, themes,
}: {
  slug: string
  levelCode: string
  label: string
  themes: ThemeProgress[]
}) {
  const router = useRouter()

  return (
    <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 10, sm: 12 } }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Breadcrumbs */}
        <Breadcrumbs
          separator={<NavigateNext sx={{ fontSize: 16, color: '#9e8a7a' }} />}
          sx={{ mb: 3, '& .MuiBreadcrumbs-li': { fontFamily: 'Jost, sans-serif' } }}
        >
          <Link
            underline="hover"
            color="inherit"
            onClick={() => router.push('/flashcards')}
            sx={{ cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: '#7a6e65' }}
          >
            Flashcards
          </Link>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: '#2c1a0e', fontWeight: 600 }}>
            {label.split(' | ')[0]}
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: { xs: 3, md: 5 } }}>
          <Typography sx={{
            fontFamily: "'EB Garamond', serif", fontSize: { xs: '1.8rem', md: '2.6rem' },
            fontWeight: 700, color: '#2c1a0e', lineHeight: 1.2, mb: 1,
          }}>
            {label}
          </Typography>
          <Typography sx={{
            fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.9rem', md: '1.05rem' },
            color: '#7a6e65', lineHeight: 1.6,
          }}>
            {themes.reduce((s, t) => s + t.total_words, 0).toLocaleString()} words across {themes.length} themes
          </Typography>
        </Box>

        {/* Theme grid */}
        {themes.length === 0 ? (
          <Box sx={{
            background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px',
            p: { xs: '2rem 1rem', md: '3rem 1.5rem' }, textAlign: 'center',
          }}>
            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e' }}>
              No themes yet
            </Typography>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: '#7a6e65', mt: 1 }}>
              There are no themes for {label} yet.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
            {themes.map((theme) => {
              const progress = themeProgressPct(theme)
              const isComplete = progress === 100
              return (
                <Grid key={theme.theme_id} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card
                    elevation={0}
                    onClick={() => router.push(`/flashcards/${slug}?theme=${encodeURIComponent(theme.theme_id)}`)}
                    sx={{
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: isComplete ? 'rgba(46,125,50,0.2)' : 'rgba(184,134,11,0.12)',
                      background: '#fff',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 32px rgba(44,26,14,0.1)',
                        borderColor: isComplete ? 'rgba(46,125,50,0.35)' : 'rgba(184,134,11,0.3)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography sx={{
                          fontFamily: 'Jost, sans-serif', fontSize: '1.05rem',
                          fontWeight: 600, color: '#2c1a0e', lineHeight: 1.3,
                        }}>
                          {theme.display_name}
                        </Typography>
                        <Typography sx={{
                          fontFamily: 'Jost, sans-serif', fontSize: '0.78rem',
                          fontWeight: 700,
                          color: isComplete ? '#2e7d32' : '#b8860b',
                          background: isComplete ? 'rgba(46,125,50,0.08)' : 'rgba(184,134,11,0.08)',
                          px: 1, py: 0.4, borderRadius: '6px',
                          flexShrink: 0, ml: 1,
                        }}>
                          {progress}%
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, mb: 2 }}>
                        <Box>
                          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: '#9e8a7a', fontWeight: 500 }}>
                            Words
                          </Typography>
                          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.92rem', fontWeight: 600, color: '#2c1a0e' }}>
                            {theme.total_words}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: '#9e8a7a', fontWeight: 500 }}>
                            Completed
                          </Typography>
                          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.92rem', fontWeight: 600, color: '#2e7d32' }}>
                            {theme.completed_count}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: '#9e8a7a', fontWeight: 500 }}>
                            Revision
                          </Typography>
                          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.92rem', fontWeight: 600, color: '#1565c0' }}>
                            {theme.revision_count}
                          </Typography>
                        </Box>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 6, borderRadius: 3,
                          backgroundColor: 'rgba(184,134,11,0.1)',
                          '& .MuiLinearProgress-bar': {
                            background: isComplete
                              ? 'linear-gradient(90deg, #2e7d32, #4caf50)'
                              : 'linear-gradient(90deg, #b8860b, #d4a843)',
                            borderRadius: 3,
                          },
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        )}
      </Container>
    </Box>
  )
}
