import { Box, CircularProgress, Typography } from '@mui/material'

export default function Loading() {
  return (
    <Box component="main" sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', bgcolor: 'var(--awm-cream-light)', textAlign: 'center' }}>
      <Box><CircularProgress size={34} sx={{ color: 'var(--awm-gold)' }} /><Typography sx={{ mt: 1.5, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif' }}>Preparing your Memory cards…</Typography></Box>
    </Box>
  )
}
