'use client'

import { Box } from '@mui/material'
import { motion, Variants } from 'framer-motion'

interface BrandLogoProps {
    isMobile: boolean
    onClick: () => void
    shouldAnimate: boolean
}

export default function BrandLogo({ isMobile, onClick, shouldAnimate }: BrandLogoProps) {
    const text = 'ArabicWithM'
    const letters = text.split('')

    const containerVariants: Variants = {
        hidden: { opacity: 1 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 },
        },
    }

    const letterVariants: Variants = {
        hidden: { opacity: 0, y: 10, rotate: -5, scale: 0.8 },
        visible: {
            opacity: 1,
            y: 0,
            rotate: 0,
            scale: 1,
            transition: { type: 'spring' as const, damping: 20, stiffness: 300 },
        },
    }

    return (
        <Box
            onClick={onClick}
            sx={{
                mr: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                cursor: 'pointer',
                py: 0.5,
            }}
        >
            <Box
                component="img"
                src="/homepage/arabicwithm-notext.png"
                alt="Logo"
                sx={{ height: isMobile ? 28 : 45, width: 'auto', objectFit: 'contain' }}
            />
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <motion.div
                    variants={containerVariants}
                    initial={shouldAnimate ? 'hidden' : 'visible'}
                    animate="visible"
                    style={{
                        display: 'flex',
                        position: 'relative',
                        fontFamily: 'var(--font-decorative)',
                        fontSize: isMobile ? '2rem' : '2.6rem',
                        fontWeight: 500,
                        background: 'linear-gradient(135deg, var(--awm-bark) 0%, var(--awm-forest) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '0.01em',
                        lineHeight: 1,
                        marginTop: '0.15em',
                    }}
                >
                    {letters.map((letter, index) => (
                        <motion.span key={index} variants={letterVariants} style={{ display: 'inline-block' }}>
                            {letter}
                        </motion.span>
                    ))}
                </motion.div>
            </Box>
        </Box>
    )
}
