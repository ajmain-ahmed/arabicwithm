'use client'

import React, { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'

interface LoadingViewProps {
    label: string
    isLoading: boolean
}

export default function LoadingView({ label, isLoading }: LoadingViewProps) {
    const [progress, setProgress] = useState(0)
    useEffect(() => {
        if (!isLoading) {
            setProgress(100)
            return
        }
        setProgress(0)
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 88) return prev
                const remaining = 88 - prev
                const increment = Math.max(2, Math.floor(remaining / 6))
                return Math.min(88, prev + increment)
            })
        }, 100)
        return () => clearInterval(timer)
    }, [isLoading])

    return (
        <Box sx={{
            background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px',
            padding: { xs: '1.5rem 1rem', md: '2rem 1.5rem' },
            minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2.5,
        }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress variant="determinate" value={progress} size={90} thickness={2.5} sx={{ color: '#b8860b' }} />
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.6rem', fontWeight: 700, color: '#2c1a0e' }}>
                        {progress}%
                    </Typography>
                </Box>
            </Box>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: '#7a6e65', letterSpacing: '0.02em' }}>
                {label}
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 280, height: 4, borderRadius: '999px', background: 'rgba(184,134,11,0.1)', overflow: 'hidden' }}>
                <Box sx={{
                    height: '100%', borderRadius: '999px',
                    background: 'linear-gradient(90deg, #b8860b, #d4a843)',
                    transition: 'width 0.3s ease',
                    width: `${progress}%`,
                }} />
            </Box>
        </Box>
    )
}
