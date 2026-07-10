'use client'

import { Box, Container, Grid, Skeleton } from '@mui/material'

export default function ProfileSkeleton() {
    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 6 } }}>
            <Box
                sx={{
                    background: 'var(--awm-white)',
                    border: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                    borderRadius: 'var(--awm-radius-md)',
                    p: { xs: 3, md: 4 },
                    mb: 4,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: { xs: 3, md: 5 },
                    alignItems: 'center',
                }}
            >
                <Skeleton variant="circular" width={160} height={160} />
                <Box sx={{ flex: 1, width: '100%' }}>
                    <Skeleton variant="text" width={180} height={28} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width={260} height={18} sx={{ mb: 2.5 }} />
                    <Skeleton variant="rounded" height={32} sx={{ borderRadius: 'var(--awm-radius-sm)', mb: 1.5 }} />
                    <Box sx={{ display: 'flex', gap: 3 }}>
                        <Skeleton variant="text" width={80} height={16} />
                        <Skeleton variant="text" width={80} height={16} />
                        <Skeleton variant="text" width={80} height={16} />
                    </Box>
                </Box>
            </Box>
            <Skeleton variant="text" width={200} height={36} sx={{ mb: 3 }} />
            <Grid container spacing={3}>
                {[...Array(6)].map((_, i) => (
                    <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
                        <Box
                            sx={{
                                background: 'var(--awm-white)',
                                border: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                                borderRadius: 'var(--awm-radius-md)',
                                p: 3,
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Skeleton variant="text" width={80} height={24} />
                                <Skeleton variant="circular" width={50} height={50} />
                            </Box>
                            <Skeleton variant="rounded" height={6} sx={{ mb: 2, borderRadius: 'var(--awm-radius-pill)' }} />
                            <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                                <Skeleton variant="text" width={50} height={20} />
                                <Skeleton variant="text" width={50} height={20} />
                                <Skeleton variant="text" width={50} height={20} />
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Container>
    )
}
