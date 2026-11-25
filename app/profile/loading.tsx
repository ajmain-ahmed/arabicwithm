
import {UiText} from '@/app/components/WebsiteLocaleProvider'
import { Box, CircularProgress, Typography } from '@mui/material'

export default function ProfileRedirectLoading() {
  return (
    <Box component="div" sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', bgcolor: 'var(--awm-cream-light)', textAlign: 'center' }}>
      <Box><CircularProgress size={34} sx={{ color: 'var(--awm-gold)' }} /><Typography sx={{ mt: 1.5, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif' }}><UiText>{"Opening your profile…"}</UiText></Typography></Box>
    </Box>
  )
}
