'use client'

import { Box, Typography, Button } from '@mui/material'

export default function CartoonsError({ reset }: { reset: () => void }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        px: 3,
        textAlign: 'center',
        gap: 2,
        background: 'var(--awm-cream)',
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.75rem',
          fontWeight: 600,
          color: 'var(--awm-bark)',
        }}
      >
        Cartoons Error
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.95rem',
          color: 'var(--awm-muted)',
          maxWidth: 400,
        }}
      >
        We couldn&apos;t load the cartoons page. Please try again.
      </Typography>
      <Button
        variant="outlined"
        onClick={reset}
        sx={{
          textTransform: 'none',
          fontFamily: 'Jost, sans-serif',
          fontWeight: 500,
          borderColor: '#b8860b',
          color: '#b8860b',
          borderRadius: '8px',
          px: 3,
          '&:hover': { background: 'rgba(184,134,11,0.08)' },
        }}
      >
        Try Again
      </Button>
    </Box>
  )
}
