'use client'

import { useEffect } from 'react'
import { Alert, Button, Container } from '@mui/material'

export default function MemoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[memory boundary]', error) }, [error])
  return <Container maxWidth="md" sx={{ py: 6 }}>
    <Alert severity="error" action={<Button onClick={reset}>Try again</Button>}>
      Memory could not be loaded. Please try again.
      {error.digest && ` Reference: ${error.digest}`}
    </Alert>
  </Container>
}
