'use client'

import React from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  Card,
  CardMedia,
  Container,
  Grid,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/navbar'
import { ShowMeta, EpisodeMeta } from '../../lib/cartoons'
import { ArrowBackIosNewSharp } from '@mui/icons-material'

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,700&family=Jost:wght@300;400;500;600&display=swap');

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

const LEVEL_COLORS: Record<string, string> = {
  A1: '#2d6a4f',
  A2: '#40916c',
  B1: '#b5861a',
  B2: '#9c6b00',
  C1: '#6d4c9e',
  C2: '#4a2f7a',
}

interface ShowPageProps {
  show: ShowMeta
  episodes: EpisodeMeta[]
}

export default function ShowPage({ show, episodes }: ShowPageProps) {
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
        {/* ── Hero ── */}
        <Box
          sx={{
            position: 'relative',
            height: { xs: 300, md: 420 },
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={show.cover}
            alt={show.title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: 'brightness(0.48)',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              background:
                'linear-gradient(to top, rgba(14,46,31,0.96) 0%, rgba(14,46,31,0.5) 55%, transparent 100%)',
            }}
          >
            <Container maxWidth="xl" sx={{ px: { xs: 3, md: 8 }, pb: { xs: 4, md: 8 } }}>
              <Box sx={{ mx: 'auto', textAlign: 'center' }}>
                {show.titleAr && (
                  <Typography
                    sx={{
                      fontFamily: "'EB Garamond', serif",
                      fontSize: { xs: '1.5rem', md: '2.2rem' },
                      fontWeight: 700,
                      color: 'var(--gold-lt)',
                      lineHeight: 1.3,
                      mb: 1,
                      opacity: 0.95,
                    }}
                  >
                    {show.titleAr}
                  </Typography>
                )}

                <Typography
                  sx={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: { xs: '2.6rem', md: '4.2rem' },
                    fontWeight: 700,
                    color: '#f5ede0',
                    lineHeight: 1.05,
                    mb: 2,
                    textShadow: '0 2px 16px rgba(0,0,0,0.35)',
                  }}
                >
                  {show.title}
                </Typography>

                {show.description && (
                  <Typography
                    sx={{
                      fontFamily: 'Jost, var(--font-sans)',
                      fontSize: { xs: '1rem', md: '1.25rem' },
                      color: 'rgba(245,237,224,0.85)',
                      lineHeight: 1.6,
            
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    {show.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                  <Box
                    sx={{
                      background: LEVEL_COLORS[show.level] ?? 'var(--forest)',
                      color: '#fff',
                      fontFamily: 'Jost, var(--font-sans)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      px: 1.4,
                      py: 0.5,
                      borderRadius: '4px',
                    }}
                  >
                    {show.level}
                  </Box>
                </Box>
              </Box>
            </Container>
          </Box>
        </Box>

        {/* ── Content ── */}
        <Container
          maxWidth="xl"
          sx={{ px: { xs: 3, md: 8 }, py: { xs: 5, md: 8 } }}
        >
          <Button
            onClick={() => router.push('/cartoons')}
            startIcon={<ArrowBackIosNewSharp sx={{ fontSize: 18 }} />}
            sx={{
              mb: { xs: 3, md: 4 },
              color: 'var(--forest)',
              fontFamily: 'Jost, var(--font-sans)',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              pl: 0,
              '&:hover': { background: 'transparent', color: 'var(--gold)' },
            }}
          >
            Back to Cartoons
          </Button>

          {episodes.length === 0 ? (
            <Typography
              sx={{
                fontFamily: 'Jost, var(--font-sans)',
                color: 'var(--muted)',
                fontSize: '1rem',
                lineHeight: 1.7,
              }}
            >
              No content available yet.
            </Typography>
          ) : (
            <Grid container spacing={{ xs: 2, md: 2.5 }}>
              {episodes.map((ep) => (
                <Grid
                  key={ep.slug}
                  size={{ xs: 12, lg: 6 }}
                  sx={{ display: 'flex' }}
                >
                  <Card
                    onClick={() => router.push(`/cartoons/${show.slug}/${ep.slug}`)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'stretch',
                      width: '100%',
                      background: '#fff',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 12px rgba(44,26,14,0.06)',
                      cursor: 'pointer',
                      transition: 'transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(44,26,14,0.1)',
                      },
                      '&:hover .MuiCardMedia-root': {
                        transform: 'scale(1.05)',
                      },
                    }}
                  >
                    {/* Content */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minWidth: 0,
                        py: { xs: 1.25, md: 1.5 },
                        px: { xs: 1.75, md: 2 },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                        <Box
                          sx={{
                            background: LEVEL_COLORS[ep.level] ?? 'var(--forest)',
                            color: '#fff',
                            fontFamily: 'Jost, var(--font-sans)',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            px: 0.9,
                            py: 0.25,
                            borderRadius: '3px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {ep.level}
                        </Box>
                      </Box>

                      <Typography
                        component="div"
                        sx={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: { xs: '1rem', md: '1.15rem' },
                          fontWeight: 700,
                          color: 'var(--bark)',
                          lineHeight: 1.3,
                          mb: 0.5,
                        }}
                      >
                        {ep.title}
                      </Typography>

                      {ep.description && (
                        <Typography
                          sx={{
                            fontFamily: 'Jost, var(--font-sans)',
                            fontSize: { xs: '0.8rem', md: '0.85rem' },
                            color: 'var(--muted)',
                            lineHeight: 1.5,
                            mb: 0.75,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ep.description}
                        </Typography>
                      )}

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          flexWrap: 'wrap',
                          mt: 'auto',
                        }}
                      >
                        {ep.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{
                              fontFamily: 'Jost, var(--font-sans)',
                              fontSize: '0.68rem',
                              background: 'rgba(44,26,14,0.05)',
                              color: 'var(--muted)',
                              height: 22,
                              borderRadius: '3px',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Thumbnail */}
                    <CardMedia
                      component="img"
                      image={`/cartoons/${show.slug}/${ep.slug}.avif`}
                      alt={ep.title}
                      sx={{
                        width: { xs: 80, sm: 100, md: 120 },
                        flexShrink: 0,
                        objectFit: 'cover',
                        display: 'block',
                        background: '#e8d8bf',
                        transition: 'transform 0.35s cubic-bezier(.22,1,.36,1)',
                      }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>
    </>
  )
}