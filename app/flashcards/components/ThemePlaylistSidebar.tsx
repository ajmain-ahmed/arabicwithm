'use client'

import React, { useState, useMemo } from 'react'
import {
    Box, Typography, Button, IconButton, LinearProgress,
} from '@mui/material'
import { CheckCircle, HelpOutlineRounded } from '@mui/icons-material'
import type { ThemeProgress } from '@/app/actions/vocab'

function themeDoneCount(t: { completed_count: number; revision_count: number }): number {
    return t.completed_count + t.revision_count
}

function themeProgressPct(t: { completed_count: number; revision_count: number; total_words: number }): number {
    return t.total_words > 0 ? Math.round((themeDoneCount(t) / t.total_words) * 100) : 0
}

/* ─────────────────────────────────────────────
   ThemePlaylistSidebar  (PAGINATED — 10 per page)
───────────────────────────────────────────── */
function ThemePlaylistSidebar({
    themes, selectedTheme, onSelectTheme, label, onOpenTutorial,
}: {
    themes: ThemeProgress[]
    selectedTheme: ThemeProgress | null
    onSelectTheme: (theme: ThemeProgress) => void
    label: string
    onOpenTutorial?: () => void
}) {
    const [page, setPage] = useState(0)
    const pageSize = 10
    const totalPages = Math.ceil(themes.length / pageSize)
    const pagedThemes = themes.slice(page * pageSize, (page + 1) * pageSize)

    const overallProgress = useMemo(() => {
        const total = themes.reduce((s, t) => s + t.total_words, 0)
        if (total === 0) return 0
        return Math.round(themes.reduce((s, t) => s + themeDoneCount(t), 0) / total * 100)
    }, [themes])

    return (
        <Box sx={{
            background: '#fff',
            border: '1px solid rgba(184,134,11,0.15)',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            <Box sx={{
                background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)',
                px: 2, py: 1.75,
                flexShrink: 0,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: '#f5ede0', lineHeight: 1.2 }}>
                        {label}
                    </Typography>
                    {onOpenTutorial && (
                        <IconButton onClick={onOpenTutorial} size="small" aria-label="Open tutorial" sx={{ width: 22, height: 22, color: 'rgba(245,237,224,0.7)', p: 0 }}>
                            <HelpOutlineRounded sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                    )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: 'rgba(245,237,224,0.6)', fontWeight: 500 }}>
                        {themes.reduce((s, t) => s + t.total_words, 0)} words · {themes.length} themes
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: '#d4a843', fontWeight: 600 }}>
                        {overallProgress}%
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={overallProgress}
                    sx={{
                        height: 4, borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(90deg, #b8860b 0%, #d4a843 100%)',
                            borderRadius: 2,
                        },
                    }}
                />
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {pagedThemes.map((theme, idx) => {
                    const progress = themeProgressPct(theme)
                    const isActive = selectedTheme?.theme_id === theme.theme_id
                    const isComplete = progress === 100
                    const globalIdx = page * pageSize + idx

                    return (
                        <Box key={theme.theme_id} onClick={() => onSelectTheme(theme)} sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            px: 2, py: 1.25, cursor: 'pointer',
                            background: isActive ? 'rgba(184,134,11,0.08)' : 'transparent',
                            borderLeft: isActive ? '3px solid #b8860b' : '3px solid transparent',
                            borderBottom: '1px solid rgba(184,134,11,0.07)',
                            transition: 'all 0.15s',
                            '&:hover': { background: isActive ? 'rgba(184,134,11,0.1)' : 'rgba(184,134,11,0.04)' },
                        }}>
                            <Box sx={{
                                width: 28, height: 28, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '50%',
                                background: isActive ? 'rgba(184,134,11,0.15)' : isComplete ? 'rgba(46,125,50,0.08)' : 'rgba(122,110,101,0.08)',
                            }}>
                                {isComplete ? <CheckCircle sx={{ fontSize: '1rem', color: '#2e7d32' }} />
                                    : isActive ? <Box sx={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #b8860b', ml: '2px' }} />
                                        : <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 600, color: '#7a6e65' }}>{globalIdx + 1}</Typography>
                                }
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#2c1a0e' : '#3d3028', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {theme.display_name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.4 }}>
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', color: '#6b5f55' }}>{theme.total_words} words</Typography>
                                    {theme.revision_count > 0 && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', color: '#1565c0' }}>· {theme.revision_count} revision</Typography>}
                                </Box>
                                <Box sx={{ mt: 0.75, height: 3, borderRadius: 2, background: 'rgba(184,134,11,0.1)', overflow: 'hidden' }}>
                                    <Box sx={{ height: '100%', borderRadius: 2, width: `${progress}%`, background: isComplete ? 'linear-gradient(90deg, #2e7d32, #4caf50)' : 'linear-gradient(90deg, #b8860b, #d4a843)', transition: 'width 0.4s ease' }} />
                                </Box>
                            </Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: isComplete ? '#2e7d32' : isActive ? '#b8860b' : '#9e8a7a', flexShrink: 0 }}>
                                {progress}%
                            </Typography>
                        </Box>
                    )
                })}
            </Box>
            {totalPages > 1 && (
                <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    px: 2, py: 1.25, borderTop: '1px solid rgba(184,134,11,0.1)', flexShrink: 0,
                }}>
                    <Button
                        size="small"
                        disabled={page === 0}
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', textTransform: 'none', color: '#7a6e65', minWidth: 0 }}
                    >
                        Prev
                    </Button>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: '#6b5f55' }}>
                        {page + 1} / {totalPages}
                    </Typography>
                    <Button
                        size="small"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', textTransform: 'none', color: '#7a6e65', minWidth: 0 }}
                    >
                        Next
                    </Button>
                </Box>
            )}
        </Box>
    )
}

export default ThemePlaylistSidebar
