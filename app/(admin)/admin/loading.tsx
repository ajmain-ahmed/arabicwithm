import { Box, Skeleton, Typography } from '@mui/material'

export default function AdminLoading() {
  return <Box role="status" aria-label="Loading Admin section">
    <Typography variant="h4" sx={{ mb: 2 }}>Admin</Typography>
    <Skeleton variant="rounded" height={52} sx={{ mb: 2 }} />
    <Skeleton variant="rounded" height={260} />
  </Box>
}
