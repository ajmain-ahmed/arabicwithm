'use client'

import { Avatar, Box, Container, Skeleton, Typography } from '@mui/material'
import { formatMonthYear } from '@/app/lib/date'
import { type ProfileData } from '@/app/actions/profile'

const HERO_BG = {
    position: 'relative',
    pt: { xs: 10, sm: 12 },
    pb: { xs: 4, sm: 5 },
    overflow: 'hidden',
    backgroundImage: 'url(/cartoons/cartooons.avif)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background:
            'radial-gradient(ellipse at center, color-mix(in srgb, var(--awm-forest) 55%, transparent) 0%, color-mix(in srgb, var(--awm-forest) 85%, transparent) 70%, color-mix(in srgb, var(--awm-forest) 95%, transparent) 100%)',
    },
} as const

export function ProfileHeaderSkeleton() {
    return (
        <Box sx={HERO_BG}>
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                <Skeleton variant="text" width={240} height={48} sx={{ bgcolor: 'color-mix(in srgb, var(--awm-white) 8%, transparent)' }} />
                <Skeleton variant="text" width={180} height={20} sx={{ bgcolor: 'color-mix(in srgb, var(--awm-white) 6%, transparent)', mt: 1 }} />
            </Container>
        </Box>
    )
}

interface ProfileHeaderProps {
    profile: ProfileData
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
    return (
        <Box sx={HERO_BG}>
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Avatar
                        sx={{
                            width: { xs: 52, sm: 64 },
                            height: { xs: 52, sm: 64 },
                            background: 'linear-gradient(135deg, var(--awm-gold), var(--awm-gold-light))',
                            color: 'var(--awm-forest)',
                            fontFamily: 'var(--font-sans)',
                            fontWeight: 700,
                            fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        }}
                    >
                        {profile.email.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography
                            sx={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3.2rem' },
                                fontWeight: 700,
                                color: 'var(--awm-cream)',
                                lineHeight: 1.1,
                                textShadow: '0 2px 16px color-mix(in srgb, var(--awm-bark) 55%, transparent)',
                            }}
                        >
                            {profile.email?.split('@')[0] ?? ''}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.05rem' },
                                color: 'color-mix(in srgb, var(--awm-cream) 85%, transparent)',
                                mt: 0.5,
                                textShadow: '0 1px 10px color-mix(in srgb, var(--awm-bark) 45%, transparent)',
                            }}
                        >
                            Member since {formatMonthYear(profile.joinedAt)}
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}
