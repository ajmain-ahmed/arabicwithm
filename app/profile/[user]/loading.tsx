import { Box, Container, Paper, Skeleton } from '@mui/material'

export default function ProfileLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ minHeight: 'calc(100dvh - var(--awm-navbar-height))', bgcolor: 'var(--awm-cream-light)', pb: { xs: 9, md: 0 } }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
        <Box sx={{ display: 'flex', gap: { md: 5 }, alignItems: 'flex-start' }}>
          <Box sx={{ display: { xs: 'none', md: 'grid' }, width: 220, flexShrink: 0, gap: 1 }}>
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} variant="rounded" height={46} />)}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width={90} height={18} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Skeleton variant="text" width={210} height={42} />
              <Skeleton variant="rounded" width={70} height={36} />
            </Box>
            <Paper elevation={0} sx={{ mb: 4, border: '1px solid rgba(184,134,11,.18)', borderRadius: '4px', overflow: 'hidden' }}>
              <Box sx={{ width: '100%', aspectRatio: '3 / 1', minHeight: 120, maxHeight: 240 }}><Skeleton variant="rectangular" sx={{ width: '100%', height: '100%' }} /></Box>
              <Box sx={{ position: 'relative', px: { xs: 2, sm: 3, md: 4 }, pt: 8, pb: 3 }}>
                <Skeleton variant="circular" sx={{ position: 'absolute', left: { xs: 16, sm: 24, md: 32 }, top: { xs: -44, sm: -56 }, width: { xs: 88, sm: 112 }, height: { xs: 88, sm: 112 }, border: '4px solid var(--awm-white)' }} />
                <Skeleton variant="text" width={220} height={36} />
                <Skeleton variant="text" width={150} height={20} />
                <Skeleton variant="text" width={180} height={20} />
              </Box>
            </Paper>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Box key={index} sx={{ gridColumn: index === 4 ? '1 / -1' : undefined }}>
                  <Skeleton variant="text" width={110} height={18} />
                  <Skeleton variant="rounded" height={44} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
