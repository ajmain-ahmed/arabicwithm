'use client'

import { useEffect } from 'react'
import { Box, Button, Typography } from '@mui/material'

/* Root error boundary: catches render errors in every route segment that
   does not define its own error.tsx. Without it, an uncaught server error
   falls through to Next's bare production 500 page. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[route error]', error)
  }, [error])

  return (
    <Box
      component="main"
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 8,
        textAlign: 'center',
        gap: 2,
        bgcolor: 'var(--awm-cream-light)',
      }}
    >
      <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 28, md: 34 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
        Something went wrong
      </Typography>
      <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 15, color: 'var(--awm-muted)', maxWidth: 420, lineHeight: 1.6 }}>
        We hit an unexpected problem loading this page. Please try again — if it keeps happening, a refresh usually clears it.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
        <Button
          onClick={reset}
          variant="contained"
          sx={{ bgcolor: 'var(--awm-gold)', color: '#fff', textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 3, '&:hover': { bgcolor: '#946c08' } }}
        >
          Try again
        </Button>
        <Button
          href="/"
          sx={{ color: 'var(--awm-bark)', textTransform: 'none', fontWeight: 600, borderRadius: '8px', px: 3, border: '1px solid rgba(44,26,14,0.15)' }}
        >
          Go home
        </Button>
      </Box>
    </Box>
  )
}
