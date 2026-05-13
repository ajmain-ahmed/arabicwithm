'use client'

import { Box, Container, Skeleton } from '@mui/material'

export default function LoadingSkeleton() {
    return (
        <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
            <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 3, md: 4 } }}>
                    <Skeleton variant="text" width={140} height={40} />
                    <Skeleton variant="rounded" width={180} height={36} />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 200px' }, gap: { xs: 2, lg: 3 }, alignItems: 'start' }}>
                    <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '1.5rem 1rem', md: '2rem 1.5rem' }, minHeight: 340, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Skeleton variant="rounded" height={4} sx={{ mb: 2, borderRadius: '999px' }} />
                        <Skeleton variant="rounded" height={24} width={220} />
                        <Skeleton variant="rounded" height={88} width="55%" sx={{ mx: 'auto', mt: 1 }} />
                        <Skeleton variant="rounded" height={32} width="30%" sx={{ mx: 'auto' }} />
                        <Skeleton variant="rounded" height={44} width="100%" sx={{ mt: 'auto' }} />
                    </Box>
                    <Box sx={{ display: { xs: 'none', lg: 'block' } }}><Skeleton variant="rounded" height={120} sx={{ borderRadius: '10px' }} /></Box>
                </Box>
            </Container>
        </Box>
    )
}
