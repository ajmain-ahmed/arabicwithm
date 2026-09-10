import { Box, Container, Paper, Skeleton } from '@mui/material'

export default function ProfileLoading() {
  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
      <Skeleton variant="text" width={280} height={56} sx={{ fontSize: 48 }} />
      <Skeleton variant="text" width={180} height={24} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, my: 3 }}>
        {Array.from({ length: 4 }, (_, index) => (
          <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
            <Skeleton variant="text" width="70%" height={20} />
            <Skeleton variant="text" width="40%" height={44} />
          </Paper>
        ))}
      </Box>
      <Skeleton variant="text" width={200} height={42} sx={{ fontSize: 30 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, my: 3 }}>
        {Array.from({ length: 4 }, (_, index) => (
          <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: '16px', textAlign: 'center' }}>
            <Skeleton variant="circular" width={52} height={52} sx={{ mx: 'auto', my: 1 }} />
            <Skeleton variant="text" width="80%" height={24} sx={{ mx: 'auto' }} />
            <Skeleton variant="text" width="60%" height={18} sx={{ mx: 'auto' }} />
          </Paper>
        ))}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 6 }}>
        <Skeleton variant="rounded" width={34} height={34} />
        <Skeleton variant="text" width={220} height={40} sx={{ fontSize: 30 }} />
      </Box>
      <Box sx={{ mt: 3 }}>
        <Skeleton variant="rounded" width="100%" height={140} sx={{ borderRadius: '14px' }} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <Skeleton variant="rounded" width={120} height={38} />
      </Box>
    </Container>
  )
}
