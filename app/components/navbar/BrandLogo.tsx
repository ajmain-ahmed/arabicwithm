'use client'

import { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { motion, useReducedMotion } from 'framer-motion'
import { useColorMode } from '@/app/components/ThemeProvider'

interface BrandLogoProps {
    isMobile: boolean
    onClick: () => void
    shouldAnimate: boolean
    overlay?: boolean
}

export default function BrandLogo({ isMobile, onClick, shouldAnimate, overlay = false }: BrandLogoProps) {
    const reduceMotion = useReducedMotion()
    const { mode } = useColorMode()
    /* Gate the entrance animation on post-hydration state: server and first
       client render must produce identical markup or hydration fails (which
       cascades into the image rows never revealing). */
    const [runEntrance, setRunEntrance] = useState(false)
    useEffect(() => {
        if (!shouldAnimate || reduceMotion) return
        const frame = requestAnimationFrame(() => setRunEntrance(true))
        return () => cancelAnimationFrame(frame)
    }, [shouldAnimate, reduceMotion])

    return (
        <Box
            component="button"
            type="button"
            onClick={onClick}
            aria-label="ArabicWithM home"
            sx={{
                m: 0,
                p: 0,
                border: 0,
                bgcolor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 0.45, md: 0.75 },
                cursor: 'pointer',
                py: 0.5,
                minWidth: 0,
                minHeight: 44,
                color: 'inherit',
                '&:focus-visible': {
                    outline: '2px solid var(--awm-gold-light)',
                    outlineOffset: 4,
                    borderRadius: '6px',
                },
            }}
        >
            <Box
                component="img"
                src="/homepage/arabicwithm-notext.png"
                alt=""
                aria-hidden="true"
                sx={{ flexShrink: 0, height: isMobile ? 26 : 38, width: 'auto', objectFit: 'contain' }}
            />
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0, height: isMobile ? 26 : 38 }}>
                <motion.span
                    initial={runEntrance ? { opacity: 0, y: isMobile ? 6 : 7 } : false}
                    animate={{ opacity: 1, y: isMobile ? 1 : 2 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        position: 'relative',
                        fontFamily: 'var(--font-decorative)',
                        fontSize: isMobile ? 'clamp(.88rem, 4.4vw, 1.28rem)' : '1.72rem',
                        fontWeight: 400,
                        color: overlay ? '#fff' : mode === 'dark' ? '#f5ede0' : 'var(--awm-forest)',
                        textShadow: overlay ? '0 1px 8px rgba(0,0,0,0.48)' : 'none',
                        letterSpacing: '-0.025em',
                        lineHeight: 1,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                    }}
                >
                    ArabicWithM
                </motion.span>
            </Box>
        </Box>
    )
}
