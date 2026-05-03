'use client'

import React from 'react'
import { Box, Typography, Card, CardContent, CardMedia, CardActionArea } from '@mui/material'
import Grid from '@mui/material/Grid'
import { useRouter } from 'next/navigation'
import Navbar from '../components/navbar'
import { LevelMeta } from '../lib/study'

const LEVEL_COLORS: Record<string, string> = {
  A0: '#2d6a4f',
  A1: '#40916c',
  A2: '#52b788',
  B1: '#b5861a',
  B2: '#9c6b00',
  C1: '#6d4c9e',
  C2: '#4a2f7a',
}

const LEVEL_IMAGE: Record<string, string> = {
  A0: '/levels/level-a0.avif',
  A1: '/levels/level-a1.avif',
  A2: '/levels/level-a2.avif',
}

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,700;1,700&family=Jost:wght@300;400;500;600&display=swap');

  :root {
    --bark:   #2c1a0e;
    --forest: #0e2e1f;
    --gold:   #b8860b;
    --gold-lt:#d4a843;
    --muted:  #7a6e65;
    --sand:   #f5ede0;
    --cream:  #faf7f2;
    --font-serif: Georgia, "Times New Roman", serif;
    --font-sans:  system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  html, body { background: var(--cream); margin: 0; }
`

export default function FlashcardsLandingPage({ levels }: { levels: LevelMeta[] }) {
  const router = useRouter()

  return (
    <>
      <style>{PAGE_CSS}</style>
      <Navbar />

      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          background: 'var(--cream)',
          pt: { xs: '56px', md: '64px' },
        }}
      >
        {/* ── Page Header ── */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(212,168,67,0.2)',
            px: { xs: 3, md: 8 },
            py: { xs: 8, md: 14 },
            textAlign: 'center',
            minHeight: { xs: 280, md: 380 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Banner image */}
          <Box
            component="img"
            src="/banners/study.avif"
            alt=""
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />

          {/* Dark overlay so text stays legible */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(10,31,21,0.45) 0%, rgba(10,31,21,0.65) 55%, rgba(10,31,21,0.90) 100%)',
            }}
          />

          {/* Darker vignette */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.7) 100%)',
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              component="h1"
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: { xs: '2.4rem', md: '4.8rem' },
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.1,
                mb: 1.5,
              }}
            >
              Study Arabic
            </Typography>

            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: { xs: '1.3rem', md: '2.4rem' },
                color: '#f5d88a',
                mb: 2,
                direction: 'rtl',
              }}
            >
              تعلم اللغة العربية
            </Typography>

            <Typography
              sx={{
                fontFamily: 'Jost, var(--font-sans)',
                fontSize: { xs: '0.9rem', md: '1.25rem' },
                color: 'rgba(255,255,255,0.85)',
                maxWidth: 520,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              Master vocabulary through themed flashcards, organised by CEFR level from Beginner to Native.
            </Typography>
          </Box>
        </Box>

        {/* ── Levels Grid ── */}
        <Box
          sx={{
            px: { xs: 2, sm: 4, md: 6, lg: 8 },
            py: { xs: 6, md: 10 },
            mx: 'auto',
            maxWidth: 1400,
          }}
        >
          <Grid
            container
            spacing={{ xs: 3, md: 4, lg: 5 }}
            sx={{ justifyContent: 'center' }}
          >
            {levels.map((level) => {
              const image = LEVEL_IMAGE[level.code]
              const color = LEVEL_COLORS[level.code] ?? 'var(--forest)'

              return (
                <Grid
                  key={level.code}
                  size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                >
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: '14px',
                      border: '1px solid rgba(44,26,14,0.08)',
                      boxShadow: '0 4px 18px rgba(44,26,14,0.06)',
                      overflow: 'hidden',
                      transition: 'transform 0.28s ease, box-shadow 0.28s ease',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: '0 16px 40px rgba(44,26,14,0.14)',
                      },
                    }}
                  >
                    <CardActionArea onClick={() => router.push(`/flashcards/${level.slug}`)}>
                      {image ? (
                        <CardMedia
                          component="img"
                          image={image}
                          alt={level.label}
                          sx={{
                            height: 220,
                            objectFit: 'cover',
                            objectPosition: 'center',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 160,
                            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: '"EB Garamond", serif',
                              fontSize: '2.5rem',
                              fontWeight: 700,
                              color: '#fff',
                              opacity: 0.9,
                            }}
                          >
                            {level.code}
                          </Typography>
                        </Box>
                      )}

                      <CardContent sx={{ py: 2.5, px: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '10px',
                              background: `${color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: '"EB Garamond", serif',
                              fontSize: '0.95rem',
                              fontWeight: 700,
                              color: color,
                              flexShrink: 0,
                            }}
                          >
                            {level.code}
                          </Box>
                          <Typography
                            sx={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: '1.05rem',
                              fontWeight: 700,
                              color: 'var(--bark)',
                              lineHeight: 1.25,
                            }}
                          >
                            {level.slug}
                          </Typography>
                        </Box>

                        <Typography
                          sx={{
                            fontFamily: 'Jost, var(--font-sans)',
                            fontSize: '0.82rem',
                            color: 'var(--muted)',
                            lineHeight: 1.55,
                          }}
                        >
                          {level.wordCount} {level.wordCount === 1 ? 'word' : 'words'}
                          {' · '}
                          {level.themeCount} {level.themeCount === 1 ? 'theme' : 'themes'}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Box>
      </Box>
    </>
  )
}
