'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import Grid from '@mui/material/Grid'
import { useRouter } from 'next/navigation'
import Navbar from '../components/navbar'
import { ShowMeta } from '../lib/cartoons'

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

  .show-card {
    cursor: pointer;
    transition: transform 0.28s cubic-bezier(.22,1,.36,1), box-shadow 0.28s ease;
    border-radius: 14px;
    overflow: hidden;
  }
  .show-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 32px 64px rgba(44,26,14,0.22) !important;
  }
  .show-card:hover .card-img {
    transform: scale(1.05);
  }
  .card-img {
    transition: transform 0.4s cubic-bezier(.22,1,.36,1);
  }

  .banner-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  .banner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(10,31,21,0.40) 0%,
      rgba(10,31,21,0.60) 55%,
      rgba(10,31,21,0.88) 100%
    );
  }
  
  .banner-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle,
      rgba(0,0,0,0) 0%,
      rgba(0,0,0,0.5) 70%,
      rgba(0,0,0,0.8) 100%
    );
  }

  .banner-content {
    position: relative;
    z-index: 1;
  }
`

export default function CartoonsPage({ shows }: { shows: ShowMeta[] }) {
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
        {/* ── Page Header with banner image ── */}
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
              className="banner-img"
              src="/cartoons/cartooons.avif"
              alt=""
              aria-hidden="true"
            />

            {/* Dark overlay so text stays legible */}
            <Box className="banner-overlay" />

            {/* Darker vignette */}
            <Box className="banner-vignette" />

            {/* Text content sits above both */}
            <Box className="banner-content">
              <Typography
                component="h1"
                sx={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: { xs: '2.4rem', md: '3.6rem' },
                  fontWeight: 700,
                  color: '#f5ede0',
                  lineHeight: 1.1,
                  mb: 1.5,
                }}
              >
                Arabic Cartoons
              </Typography>

              <Typography
                sx={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: { xs: '1.3rem', md: '1.9rem' },
                  color: 'var(--gold-lt)',
                  mb: 1.5,
                  direction: 'rtl',
                }}
              >
                الرسوم المتحركة بالعربية
              </Typography>

              <Typography
                sx={{
                  fontFamily: 'Jost, var(--font-sans)',
                  fontSize: { xs: '0.95rem', md: '1.15rem' },
                  color: 'rgba(245,237,224,0.85)',
                  lineHeight: 1.6,
                  maxWidth: 560,
                  mx: 'auto',
                }}
              >
                Learn Arabic naturally through your favourite shows, with interactive subtitles and vocabulary.
              </Typography>
            </Box>
          </Box>

        {/* ── Shows Grid ── */}
        <Box
          sx={{
            px: { xs: 2, sm: 4, md: 6, lg: 8 },
            py: { xs: 6, md: 10 },
            mx: 'auto',
          }}
        >
          <Grid
            container
            spacing={{ xs: 3, md: 4, lg: 5 }}
            sx={{ justifyContent: 'center' }}
          >
            {shows.map((show) => (
              <Grid
                key={show.slug}
                size={{ xs: 6, sm: 4, md: 3, lg: 2.4, xl: 2 }}
              >
                <Box
                  className="show-card"
                  onClick={() => router.push(`/cartoons/${show.slug}`)}
                  sx={{
                    background: '#fff',
                    boxShadow: '0 4px 20px rgba(44,26,14,0.10)',
                    height: '100%',
                  }}
                >
                  {/* Thumbnail */}
                  <Box
                    sx={{
                      position: 'relative',
                      aspectRatio: '3/4',
                      overflow: 'hidden',
                      background: '#e8d8bf',
                    }}
                  >
                    <Box
                      component="img"
                      className="card-img"
                      src={show.cover}
                      alt={show.title}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </Box>

                  {/* Info */}
                  <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: { xs: '0.95rem', md: '1.1rem' },
                        fontWeight: 700,
                        color: 'var(--bark)',
                        lineHeight: 1.25,
                        mb: 0.5,
                      }}
                    >
                      {show.title}
                    </Typography>

                    <Typography
                      sx={{
                        fontFamily: 'Jost, var(--font-sans)',
                        fontSize: '0.78rem',
                        color: 'var(--muted)',
                      }}
                    >
                      {show.episodeCount} {show.episodeCount === 1 ? 'episode' : 'episodes'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </>
  )
}