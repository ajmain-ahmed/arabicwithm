'use client'

import { Box, Typography, Button } from '@mui/material'

interface ErrorPageProps {
  title: string
  message: string
  reset?: () => void
}

export default function ErrorPage({ title, message, reset }: ErrorPageProps) {
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
        variant="h3"
        sx={{
          textAlign: 'center',
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: 'var(--awm-muted)',
          maxWidth: 400,
        }}
      >
        {message}
      </Typography>
      {reset && (
        <Button
          variant="outlined"
          onClick={reset}
          sx={{
            textTransform: 'none',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            borderColor: 'var(--awm-gold)',
            color: 'var(--awm-gold)',
            borderRadius: 'var(--awm-radius-xs)',
            px: 3,
            '&:hover': { background: 'rgba(184, 134, 11, 0.08)' },
          }}
        >
          Try Again
        </Button>
      )}
    </Box>
  )
}
