import { Box, Container, Paper, Skeleton } from '@mui/material'

export default function ChapterLoading() {
  return (
    <Box component="div" data-loading-page="true" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pt: { xs: 2.5, md: 5 }, pb: { xs: 'var(--awm-mobile-bottom-clearance)', md: 5 } }}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
          <Skeleton variant="rounded" width={150} height={26} />
          <Skeleton variant="rounded" width={90} height={22} />
        </Box>
        <Paper elevation={0} sx={{ border: '1px solid rgba(44,26,14,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2.25, md: 2.75 }, bgcolor: '#0e2e1f' }}>
            <Skeleton variant="text" width={180} height={16} sx={{ mx: 'auto', bgcolor: 'rgba(255,255,255,0.1)' }} />
            <Skeleton variant="text" width="42%" height={40} sx={{ mx: 'auto', bgcolor: 'rgba(255,255,255,0.1)' }} />
            <Skeleton variant="rounded" width={280} height={44} sx={{ mx: 'auto', mt: 2, maxWidth: '100%', borderRadius: '9999px', bgcolor: 'rgba(255,255,255,0.1)' }} />
          </Box>
          <Box sx={{ px: { xs: 2.5, md: 7 }, py: { xs: 4, md: 7 } }}>
            {[96, 88, 94, 76, 92, 84, 96, 62].map((width, index) => (
              <Skeleton key={index} variant="text" width={`${width}%`} height={34} sx={{ ml: index % 2 ? 'auto' : 0, display: 'block' }} />
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 4 }}>
              <Skeleton variant="rounded" width={90} height={44} />
              <Skeleton variant="text" width={90} />
              <Skeleton variant="rounded" width={90} height={44} />
            </Box>
          </Box>
        </Paper>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' }, gap: 1.5, alignItems: 'center', mt: 3 }}>
          <Skeleton variant="rounded" width={170} height={40} />
          <Skeleton variant="rounded" width={130} height={40} sx={{ justifySelf: 'center' }} />
          <Skeleton variant="rounded" width={170} height={40} sx={{ justifySelf: { xs: 'start', sm: 'end' } }} />
        </Box>
      </Container>
    </Box>
  )
}
