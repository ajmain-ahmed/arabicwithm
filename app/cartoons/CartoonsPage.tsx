'use client'

// NOTE: Because this page reads the filesystem, the actual data-fetching
// should happen in a Server Component. See the README comments below.
// This file is the CLIENT shell — pair it with a server component if needed,
// or convert to a pure Server Component by removing 'use client' and router.

// ─── If you want a pure Server Component (recommended for this page):
// Remove 'use client', remove useRouter, use <Link href={}> instead.

import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { useRouter } from 'next/navigation'
import Navbar from '../components/navbar'
import { ShowMeta } from '../lib/cartoons'

/* ─────────────────────────────────────────────
   This page receives shows as props from a
   Server Component parent, or you can fetch
   inline if you make this a Server Component.
───────────────────────────────────────────── */

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
    border-radius: 12px;
    overflow: hidden;
  }
  .show-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 24px 56px rgba(44,26,14,0.18) !important;
  }
  .show-card:hover .card-img {
    transform: scale(1.04);
  }
  .card-img {
    transition: transform 0.4s cubic-bezier(.22,1,.36,1);
  }
`

const LEVEL_COLORS: Record<string, string> = {
  A1: '#2d6a4f',
  A2: '#40916c',
  B1: '#b5861a',
  B2: '#9c6b00',
  C1: '#6d4c9e',
  C2: '#4a2f7a',
}

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
        {/* ── Page Header ── */}
        <Box
          sx={{
            background: `linear-gradient(160deg, var(--forest) 0%, #0a1f15 100%)`,
            borderBottom: '1px solid rgba(212,168,67,0.2)',
            px: { xs: 3, md: 8 },
            py: { xs: 6, md: 10 },
            textAlign: 'center',
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: 'var(--font-serif)',
              fontSize: { xs: '2.2rem', md: '3.4rem' },
              fontWeight: 700,
              color: '#f5ede0',
              lineHeight: 1.1,
              mb: 1.5,
            }}
          >
            Arabic Cartoons
          </Typography>

          {/* Arabic subtitle */}
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              fontSize: { xs: '1.3rem', md: '1.8rem' },
              color: 'var(--gold-lt)',
              mb: 2,
              direction: 'rtl',
            }}
          >
            الرسوم المتحركة بالعربية
          </Typography>

          <Box
            sx={{
              height: '1px',
              width: 80,
              background: 'linear-gradient(90deg, transparent, var(--gold-lt), transparent)',
              mx: 'auto',
              mb: 2.5,
            }}
          />

          <Typography
            sx={{
              fontFamily: 'Jost, var(--font-sans)',
              fontSize: { xs: '0.92rem', md: '1.05rem' },
              color: 'rgba(245,237,224,0.6)',
              maxWidth: 520,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            Watch your favourite cartoons subtitled in Arabic, then test yourself
            with worksheets and quizzes graded to your CEFR level.
          </Typography>
        </Box>

        {/* ── Shows Grid ── */}
        <Box
          sx={{
            px: { xs: 3, sm: 5, md: 8, lg: 14 },
            py: { xs: 6, md: 10 },
            maxWidth: 1200,
            mx: 'auto',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: { xs: 2.5, md: 4 },
            }}
          >
            {shows.map((show) => (
              <Box
                key={show.slug}
                className="show-card"
                onClick={() => router.push(`/cartoons/${show.slug}`)}
                sx={{
                  background: '#fff',
                  boxShadow: '0 4px 20px rgba(44,26,14,0.10)',
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

                  {/* Level badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: LEVEL_COLORS[show.level] ?? 'var(--forest)',
                      color: '#fff',
                      fontFamily: 'Jost, var(--font-sans)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      px: 1.2,
                      py: 0.4,
                      borderRadius: '4px',
                    }}
                  >
                    {show.level}
                  </Box>
                </Box>

                {/* Info */}
                <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: { xs: '0.95rem', md: '1.05rem' },
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
                      fontSize: '0.76rem',
                      color: 'var(--muted)',
                    }}
                  >
                    {show.episodeCount} {show.episodeCount === 1 ? 'episode' : 'episodes'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </>
  )
}