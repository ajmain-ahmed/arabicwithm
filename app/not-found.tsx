'use client'

import Link from 'next/link'
import { Box, Button, Container, Typography } from '@mui/material'

export default function NotFound() {
  return (
    <Box component="main" sx={{ minHeight: '60vh', bgcolor: 'var(--awm-cream-light)', py: { xs: 8, md: 12 } }}>
      <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--awm-gold)' }}>
          404
        </Typography>
        <Typography component="h1" sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: { xs: 30, md: 38 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
          Page not found
        </Typography>
        <Typography sx={{ mt: 1.5, fontFamily: 'var(--font-sans), sans-serif', fontSize: 15, color: 'var(--awm-muted)', lineHeight: 1.65 }}>
          The page you are looking for does not exist or may have moved.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mt: 3 }}>
          <Button component={Link} href="/" variant="contained" sx={{ bgcolor: 'var(--awm-gold)', color: '#fff', textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 3, '&:hover': { bgcolor: '#946c08' } }}>
            Home
          </Button>
          <Button component={Link} href="/explore" sx={{ color: 'var(--awm-bark)', textTransform: 'none', fontWeight: 600, borderRadius: '8px', px: 3, border: '1px solid rgba(44,26,14,0.15)' }}>
            Explore
          </Button>
        </Box>
      </Container>
    </Box>
  )
}
