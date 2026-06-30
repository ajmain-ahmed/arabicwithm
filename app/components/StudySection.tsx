// app/components/StudySection.tsx
'use client'

import React from 'react'
import { Box, Typography, Button, Card, CardContent, CardMedia, Container } from '@mui/material'
import { useRouter } from 'next/navigation'
import { ArrowForwardSharp } from '@mui/icons-material'

const FEATURES = [
    {
        title: 'Themed Flashcards',
        body: 'Browse vocabulary by real-world topics and CEFR level, with audio and example sentences.',
    },
    {
        title: 'CEFR-Graded Themes',
        body: 'Food, travel, emotions, work — vocabulary organised by level and real-world topic.',
    },
    {
        title: 'Smart Flashcards',
        body: 'Arabic front, English back. Audio, context sentences, and difficulty tracking built in.',
    },
]

export default function StudySection() {
    const router = useRouter()

    return (
        <Box
            component="section"
            sx={{
                position: 'relative',
                background: '#ffffff',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23458700' fill-opacity='0.18'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                pt: 10,
                pb: { xs: 10, md: 14, lg: 16 },
            }}
        >
            <Container
                maxWidth={false}
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: '2000px !important',
                    mx: 'auto',
                    px: { xs: 3, sm: 4, md: 6, lg: 8 }
                }}
            >
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 10 } }}>
                    <Typography
                        component="h2"
                        sx={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: { xs: '1.9rem', sm: '2.5rem', md: '3.2rem' },
                            fontWeight: 700,
                            lineHeight: 1.12,
                            color: 'var(--bark)',
                            mx: 'auto',
                            mb: 1.5,
                        }}
                    >
                        Study Smarter
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: { xs: '0.93rem', md: '1.05rem' },
                            color: 'var(--muted)',
                            lineHeight: 1.7,
                            mx: 'auto',
                            mb: { xs: 3, md: 4 },
                        }}
                    >
                        Master Arabic vocabulary with spaced repetition, themed decks, and CEFR-graded flashcards.
                    </Typography>

                    <Button
                        variant="contained"
                        size="large"
                        endIcon={<ArrowForwardSharp />}
                        onClick={() => router.push('/flashcards/Apprentice')}
                        sx={{
                            background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-lt) 100%)',
                            color: '#1a0e00',
                            fontFamily: 'var(--font-sans)',
                            fontWeight: 700,
                            fontSize: { xs: '0.95rem', md: '1rem' },
                            textTransform: 'none',
                            borderRadius: '4px',
                            px: { xs: 4, md: 5 },
                            py: { xs: 1.5, md: 1.7 },
                            boxShadow: '0 6px 28px rgba(184,134,11,0.35)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                background: 'linear-gradient(135deg, var(--gold-lt) 0%, #e6c060 100%)',
                                boxShadow: '0 10px 36px rgba(184,134,11,0.5)',
                                transform: 'translateY(-1px)',
                            },
                        }}
                    >
                        Start Studying
                    </Button>
                </Box>

                {/* ── Desktop: image left | cards right ── */}
                <Box
                    sx={{
                        display: { xs: 'none', md: 'grid' },
                        gridTemplateColumns: { md: '1.1fr 1fr' },
                        gap: { md: 4, lg: 5, xl: 6 },
                        mx: 'auto',
                        alignItems: 'center', // Changed from 'start' to 'center' for perfect vertical alignment
                    }}
                >
                    {/* Main flashcard image */}
                    <Box
                        component="img"
                        src="/homepage/homepage-desktop-flashcards.avif"
                        alt="Arabic flashcards interface"
                        sx={{
                            width: '100%',
                            borderRadius: '16px',
                            boxShadow: '0 24px 64px rgba(44,26,14,0.15)',
                            display: 'block', // Removes any inline spacing issues
                        }}
                    />

                    {/* Stacked feature cards */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        {FEATURES.map(({ title, body }) => (
                            <Card
                                key={title}
                                elevation={0}
                                sx={{
                                    borderRadius: '14px',
                                    border: '1px solid rgba(44,26,14,0.08)',
                                    boxShadow: '0 4px 18px rgba(44,26,14,0.06)',
                                    overflow: 'hidden',
                                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                                    '&:hover': {
                                        transform: 'translateY(-3px)',
                                        boxShadow: '0 10px 32px rgba(44,26,14,0.12)',
                                    },
                                }}
                            >
                                <CardMedia
                                    component="img"
                                    image="/cartoons/cartooons.avif"
                                    alt=""
                                    sx={{
                                        height: 130,
                                        objectFit: 'cover',
                                        opacity: 0.9,
                                    }}
                                />
                                <CardContent sx={{ py: 2, px: 2.5 }}>
                                    <Typography
                                        sx={{
                                            fontFamily: 'var(--font-sans)',
                                            fontWeight: 700,
                                            fontSize: '0.95rem',
                                            color: 'var(--bark)',
                                            mb: 0.5,
                                        }}
                                    >
                                        {title}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontFamily: 'var(--font-sans)',
                                            fontSize: '0.82rem',
                                            color: 'var(--muted)',
                                            lineHeight: 1.55,
                                        }}
                                    >
                                        {body}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Box>

                {/* ── Mobile: first card, image, then second card ── */}
                <Box
                    sx={{
                        display: { xs: 'flex', md: 'none' },
                        flexDirection: 'column',
                        gap: 3,
                    }}
                >
                    {/* First feature card */}
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: '14px',
                            border: '1px solid rgba(44,26,14,0.08)',
                            boxShadow: '0 4px 18px rgba(44,26,14,0.06)',
                            overflow: 'hidden',
                        }}
                    >
                        <CardMedia
                            component="img"
                            image="/cartoons/cartooons.avif"
                            alt=""
                            sx={{
                                height: 140,
                                objectFit: 'cover',
                                opacity: 0.9,
                            }}
                        />
                        <CardContent sx={{ py: 2, px: 2.5 }}>
                            <Typography
                                sx={{
                                    fontFamily: 'var(--font-sans)',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    color: 'var(--bark)',
                                    mb: 0.5,
                                }}
                            >
                                {FEATURES[0].title}
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '0.82rem',
                                    color: 'var(--muted)',
                                    lineHeight: 1.55,
                                }}
                            >
                                {FEATURES[0].body}
                            </Typography>
                        </CardContent>
                    </Card>

                    {/* Image in between */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', px: 2 }}>
                        <Box
                            component="img"
                            src="/homepage/homepage-mobile-flashcards.avif"
                            alt="Arabic flashcards on mobile"
                            sx={{
                                width: '100%',
                                borderRadius: '16px',
                                boxShadow: '0 24px 64px rgba(44,26,14,0.15)',
                            }}
                        />
                    </Box>

                    {/* Second feature card */}
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: '14px',
                            border: '1px solid rgba(44,26,14,0.08)',
                            boxShadow: '0 4px 18px rgba(44,26,14,0.06)',
                            overflow: 'hidden',
                        }}
                    >
                        <CardMedia
                            component="img"
                            image="/cartoons/cartooons.avif"
                            alt=""
                            sx={{
                                height: 140,
                                objectFit: 'cover',
                                opacity: 0.9,
                            }}
                        />
                        <CardContent sx={{ py: 2, px: 2.5 }}>
                            <Typography
                                sx={{
                                    fontFamily: 'var(--font-sans)',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    color: 'var(--bark)',
                                    mb: 0.5,
                                }}
                            >
                                {FEATURES[1].title}
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '0.82rem',
                                    color: 'var(--muted)',
                                    lineHeight: 1.55,
                                }}
                            >
                                {FEATURES[1].body}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Container>
        </Box>
    )
}