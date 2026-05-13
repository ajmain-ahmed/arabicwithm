'use client'

import { Box } from '@mui/material'
import { useMediaQuery } from '@mui/material'
import { motion } from 'framer-motion'
import { type DotInfo } from '../types'

export default function IntegratedProgressDots({
    dotOrder,
    answeredDots,
    currentDotId,
    againPendingIds,
}: {
    dotOrder: string[]
    answeredDots: Map<string, string>
    currentDotId: string | null
    againPendingIds: Set<string>
}) {
    const isMobile = useMediaQuery('(max-width:600px)')
    const total = dotOrder.length
    if (total === 0) return null

    const dots: DotInfo[] = dotOrder.map((id) => ({
        dotId: id,
        color: answeredDots.get(id),
        isCurrent: id === currentDotId,
        isAgainPending: againPendingIds.has(id),
    }))

    /* ── windowing ── */
    const MAX_DESKTOP_DOTS = 20
    const DESKTOP_HALF = 10
    const MAX_MOBILE_DOTS = 10
    let visible: DotInfo[] = dots
    let isWindowed = false

    if (isMobile && total > MAX_MOBILE_DOTS) {
        const currentIdx = currentDotId ? dotOrder.indexOf(currentDotId) : 0
        let start = Math.max(0, currentIdx - 5)
        let end = Math.min(total, start + MAX_MOBILE_DOTS)
        if (end - start < MAX_MOBILE_DOTS && end === total) {
            start = Math.max(0, total - MAX_MOBILE_DOTS)
            end = total
        }
        visible = dots.slice(start, end)
        isWindowed = true
    } else if (!isMobile && total > MAX_DESKTOP_DOTS) {
        const currentIdx = currentDotId ? dotOrder.indexOf(currentDotId) : 0
        let start = Math.max(0, currentIdx - DESKTOP_HALF)
        let end = Math.min(total, start + MAX_DESKTOP_DOTS)
        if (end - start < MAX_DESKTOP_DOTS && end === total) {
            start = Math.max(0, total - MAX_DESKTOP_DOTS)
            end = total
        }
        visible = dots.slice(start, end)
        isWindowed = true
    }

    const dotPositionPct = (idx: number) =>
        visible.length === 1 ? 50 : (idx / (visible.length - 1)) * 100

    /* ── single fill bar: width = position of the last answered dot ── */
    const lastAnsweredIdx = visible.reduce<number>(
        (acc, dot, idx) => (dot.color !== undefined ? idx : acc),
        -1,
    )
    const fillPct =
        visible.length <= 1 || lastAnsweredIdx < 0
            ? 0
            : (lastAnsweredIdx / (visible.length - 1)) * 100

    const currentVisibleIdx = currentDotId
        ? visible.findIndex((d) => d.dotId === currentDotId)
        : -1
    const currentLeftPct =
        currentVisibleIdx >= 0
            ? visible.length === 1
                ? 50
                : (currentVisibleIdx / (visible.length - 1)) * 100
            : null

    return (
        <Box sx={{ position: 'relative', mb: '1.25rem' }}>
            {/* base track */}
            <Box
                sx={{
                    height: 4,
                    background: 'rgba(184,134,11,0.1)',
                    borderRadius: '999px',
                    overflow: 'visible',
                    position: 'relative',
                }}
            >
                {/* ── single fill bar ── */}
                <motion.div
                    initial={false}
                    animate={{ width: `${fillPct}%` }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        borderRadius: '999px',
                        background: 'linear-gradient(90deg, #b8860b, #d4a843)',
                        zIndex: 1,
                    }}
                />

                {/* ── sliding current ring ── */}
                {currentLeftPct !== null && (
                    <motion.div
                        initial={false}
                        animate={{ left: `${currentLeftPct}%` }}
                        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: '2.5px solid #b8860b',
                            background: 'rgba(0,0,0,0)',
                            boxShadow: '0 0 0 4px rgba(184,134,11,0.15)',
                            zIndex: 4,
                            pointerEvents: 'none',
                        }}
                    >
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                animation: 'dotPulse 1.8s ease-in-out infinite',
                            }}
                        />
                    </motion.div>
                )}

                {/* ── dots ── */}
                {visible.map((dot, idx) => {
                    const leftPct = dotPositionPct(idx)
                    const answered = dot.color !== undefined
                    const borderColor = answered
                        ? 'rgba(0,0,0,0)'
                        : dot.isAgainPending
                            ? 'rgba(198,40,40,0.4)'
                            : 'rgba(122,110,101,0.3)'

                    return (
                        <motion.div
                            key={dot.dotId}
                            initial={false}
                            animate={{ left: `${leftPct}%` }}
                            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: answered ? 3 : 2,
                            }}
                        >
                            <motion.div
                                initial={false}
                                animate={{
                                    backgroundColor: answered ? dot.color! : 'rgba(0,0,0,0)',
                                    borderColor: borderColor,
                                }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    border: '1.5px solid',
                                    boxShadow: answered
                                        ? `0 0 0 2px ${dot.color}18`
                                        : 'none',
                                }}
                            />
                        </motion.div>
                    )
                })}
            </Box>

            <style>{`
        @keyframes dotPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(184,134,11,0.15); }
          50%      { box-shadow: 0 0 0 7px rgba(184,134,11,0.05); }
        }
      `}</style>
        </Box>
    )
}