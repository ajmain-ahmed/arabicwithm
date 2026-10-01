'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowBack, Refresh } from '@mui/icons-material'
import { Box, Button, Container, Typography } from '@mui/material'

export default function BookReaderError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[book-reader] Reader route failed', error)
  }, [error])

  return (
    <Box component="main" sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', bgcolor: 'var(--awm-cream-light)', py: 6 }}>
      <Container maxWidth="sm">
        <Box sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '16px', bgcolor: 'var(--awm-white)' }}>
          <Typography component="h1" sx={{ color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 30, sm: 38 }, fontWeight: 600 }}>
            This chapter could not be opened
          </Typography>
          <Typography sx={{ mt: 1.25, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', lineHeight: 1.65 }}>
            The reader could not load the chapter data. Please try again; if the problem continues, return to the books page and choose the chapter again.
          </Typography>
          {error.digest && (
            <Typography sx={{ mt: 1, color: 'var(--awm-muted-light)', fontFamily: 'monospace', fontSize: 12 }}>
              Reference: {error.digest}
            </Typography>
          )}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Button onClick={reset} variant="contained" startIcon={<Refresh />} sx={{ bgcolor: 'var(--awm-gold)', textTransform: 'none', '&:hover': { bgcolor: '#946c08' } }}>
              Try again
            </Button>
            <Button component={Link} href="/books" variant="outlined" startIcon={<ArrowBack />} sx={{ color: 'var(--awm-bark)', borderColor: 'color-mix(in srgb, var(--awm-bark) 22%, transparent)', textTransform: 'none' }}>
              Back to books
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
