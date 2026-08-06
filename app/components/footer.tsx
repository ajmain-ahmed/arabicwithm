'use client'

import React from 'react'
import { Box, Container, Grid, IconButton, Typography } from '@mui/material'
import { Email } from '@mui/icons-material'
import { useRouter } from 'next/navigation'

/* ─────────────────────────────────────────────
   Types & data
───────────────────────────────────────────── */
interface FooterProps {
  onContactClick?: () => void
}

const FOOTER_SECTIONS = (onContactClick?: () => void) => [
  {
    title: 'Explore',
    links: [
      { label: 'Cartoons', href: '/cartoons', onClick: undefined },
      { label: 'About',    href: '/about',    onClick: undefined },
      { label: 'FAQ',      href: '/faq',      onClick: undefined },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact Us', href: null, onClick: onContactClick },
    ],
  },
]

const LEGAL_LINKS = [
  { label: 'Privacy Policy',   href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
]

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/arabicwithm',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@arabicwithm',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@arabicwithm',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
      </svg>
    ),
  },
]

/* ─────────────────────────────────────────────
   CSS
───────────────────────────────────────────── */
const FOOTER_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap');

  .awm-footer-link {
    font-family: 'Jost', sans-serif;
    font-size: 0.85rem;
    font-weight: 400;
    color: #7a6e65;
    cursor: pointer;
    transition: color 0.2s;
    text-decoration: none;
    display: inline-block;
    background: none;
    border: none;
    padding: 0;
    text-align: left;
  }
  .awm-footer-link:hover { color: #b8860b; }

  .awm-legal-link {
    font-family: 'Jost', sans-serif;
    font-size: 0.72rem;
    color: #767676;
    cursor: pointer;
    transition: color 0.2s;
    background: none;
    border: none;
    padding: 0;
  }
  .awm-legal-link:hover { color: #2c1a0e; }

  .awm-social-btn {
    transition: transform 0.2s, color 0.2s, border-color 0.2s !important;
  }
  .awm-social-btn:hover {
    transform: translateY(-3px);
    border-color: rgba(184,134,11,0.5) !important;
    color: #b8860b !important;
  }

  @keyframes shimmer-awm-footer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .awm-footer-gold-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(184,134,11,0.4), transparent);
    background-size: 200% auto;
    animation: shimmer-awm-footer 4s linear infinite;
  }
`

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function Footer({ onContactClick }: FooterProps) {
  const router   = useRouter()
  const sections = FOOTER_SECTIONS(onContactClick)

  return (
    <Box component="footer" sx={{ display: { xs: 'none', md: 'block' }, background: '#ffffff', borderTop: '1px solid rgba(184,134,11,0.12)' }}>
      <style>{FOOTER_CSS}</style>

      {/* ── main columns ── */}
      <Container maxWidth="xl" sx={{ py: { xs: 7, md: 9 } }}>
        <Grid container spacing={{ xs: 5, md: 4 }}>

          {/* Brand column */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 320 }}>
              {/* logo */}
              <Box>
                <Box
                  component="img"
                  src="/homepage/arabicwithm-notext.png"
                  alt="ArabicWithM"
                  sx={{ height: 52, width: 'auto', display: 'block', mb: 1 }}
                />
                {/* wordmark */}
                <Typography sx={{
                  fontFamily: '"Cookie", cursive',
                  fontSize: '2rem', fontWeight: 500,
                  background: 'linear-gradient(135deg, #2c1a0e 0%, #0e2e1f 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1, mb: 1,
                }}>
                  ArabicWithM
                </Typography>
                <Box sx={{ height: '1px', width: 72, background: 'linear-gradient(90deg, #b8860b, transparent)' }} />
              </Box>

              <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.88rem', fontWeight: 300,
                color: '#7a6e65', lineHeight: 1.8,
              }}>
                Modern Standard Arabic made accessible — through immersive cartoons with interactive subtitles.
              </Typography>

              {/* contact */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Email sx={{ fontSize: 15, color: 'rgba(184,134,11,0.7)' }} />
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.83rem', color: '#7a6e65' }}>
                  hello@arabicwithm.com
                </Typography>
              </Box>

              {/* socials */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {SOCIALS.map(s => (
                  <IconButton
                    key={s.label}
                    className="awm-social-btn"
                    aria-label={s.label}
                    size="small"
                    onClick={() => window.open(s.href, '_blank', 'noopener noreferrer')}
                    sx={{
                      color: '#7a6e65',
                      border: '1px solid rgba(44,26,14,0.12)',
                      borderRadius: '2px',
                      width: 34, height: 34,
                    }}
                  >
                    {s.icon}
                  </IconButton>
                ))}
              </Box>
            </Box>
          </Grid>

          {/* spacer */}
          <Grid size={{ xs: 0, md: 1 }} sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* link columns */}
          {sections.map(section => (
            <Grid key={section.title} size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.68rem', fontWeight: 600,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: '#b8860b', mb: 2.5,
              }}>
                {section.title}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                {section.links.map(link => (
                  <button
                    key={link.label}
                    className="awm-footer-link"
                    onClick={() => link.onClick ? link.onClick() : link.href && router.push(link.href)}
                  >
                    {link.label}
                  </button>
                ))}
              </Box>
            </Grid>
          ))}

        </Grid>
      </Container>

      {/* ── bottom bar ── */}
      <Box>
        <div className="awm-footer-gold-line" />
        <Container maxWidth="xl">
          <Box sx={{
            py: 3,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}>
            <Typography sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.72rem', color: '#767676', letterSpacing: '0.04em',
            }}>
              © {new Date().getFullYear()} ArabicWithM. All rights reserved.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {LEGAL_LINKS.map((link, i) => (
                <React.Fragment key={link.label}>
                  <button className="awm-legal-link" onClick={() => router.push(link.href)}>
                    {link.label}
                  </button>
                  {i < LEGAL_LINKS.length - 1 && (
                    <Box sx={{
                      width: 3, height: 3, borderRadius: '50%',
                      background: 'rgba(44,26,14,0.15)', mx: 0.5,
                    }} />
                  )}
                </React.Fragment>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}