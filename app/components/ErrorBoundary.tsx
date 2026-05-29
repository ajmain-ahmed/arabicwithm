'use client'

import React, { Component, type ReactNode } from 'react'
import { Box, Typography, Button } from '@mui/material'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            px: 3,
            textAlign: 'center',
            gap: 2,
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
            Something went wrong
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.95rem',
              color: '#7a6e65',
              maxWidth: 400,
            }}
          >
            We&apos;re sorry — an unexpected error occurred. Please try refreshing the page.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
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
            Refresh Page
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}
