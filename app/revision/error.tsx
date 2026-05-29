'use client'

import { Box, Typography, Button } from '@mui/material'

export default function RevisionError({ reset }: { reset: () => void }) {
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
        background: '#f5ede0',
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#2c1a0e',
        }}
      >
        Session Error
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.95rem',
          color: '#7a6e65',
          maxWidth: 400,
        }}
      >
        Something went wrong loading your revision session. Your progress has been saved.
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
