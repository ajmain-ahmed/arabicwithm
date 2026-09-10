import { Box, Container, Paper, Skeleton } from '@mui/material'

export default function ChapterLoading() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', py: { xs: 2.5, md: 5 } }}>
      <Container maxWidth="xl">
        {/* back link + chapter counter */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
          <Skeleton variant="rounded" width={150} height={26} />
          <Skeleton variant="rounded" width={90} height={22} />
        </Box>

        {/* reader body */}
        <Paper elevation={0} sx={{ p: { xs: 3, md: 7 }, border: '1px solid rgba(44,26,14,0.08)', borderRadius: '14px' }}>
          <Skeleton variant="rounded" width="42%" height={30} sx={{ mx: 'auto', mb: 4 }} />
          {[72, 95, 88, 60].map((width, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              width={`${width}%`}
              height={26}
              sx={{ mx: 'auto', my: 2, display: 'block' }}
            />
          ))}
          <Skeleton variant="rounded" width="55%" height={20} sx={{ mx: 'auto', mt: 4, display: 'block' }} />
        </Paper>

        {/* prev / all chapters / next row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' }, gap: 1.5, alignItems: 'center', mt: 3 }}>
          <Skeleton variant="rounded" width={170} height={40} />
          <Skeleton variant="rounded" width={130} height={40} sx={{ justifySelf: 'center' }} />
          <Skeleton variant="rounded" width={170} height={40} sx={{ justifySelf: { xs: 'start', sm: 'end' } }} />
        </Box>
      </Container>
    </Box>
  )
}
