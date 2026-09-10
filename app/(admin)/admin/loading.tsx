import { Box, CircularProgress, Typography } from '@mui/material'

export default function AdminLoading() {
  return (
    <Box component="main" sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Box><CircularProgress size={34} sx={{ color: 'var(--awm-gold)' }} /><Typography sx={{ mt: 1.5, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif' }}>Loading admin…</Typography></Box>
    </Box>
  )
}
