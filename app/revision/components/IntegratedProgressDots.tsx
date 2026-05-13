'use client'

import { Box } from '@mui/material'
import { useMediaQuery } from '@mui/material'
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

    /* ── stepped bar: extend past last answered dot ── */
    const lastAnsweredIndex = dotOrder.reduce(
        (last, id, idx) => (answeredDots.has(id) ? idx : last),
        -1
    )

    let fillWidth = '0%'
    if (total > 0 && lastAnsweredIndex >= 0) {
        if (total === 1) {
            fillWidth = '82%'
        } else {
            const dotPosition = (lastAnsweredIndex / (total - 1)) * 100
            const gap = 100 / (total - 1)
            const extension = gap * 0.35 // push past dot, stop before next
            fillWidth = `${Math.min(dotPosition + extension, 100)}%`
        }
    }

    /* ── windowing ── */
    const MAX_DESKTOP_DOTS = 20
    const DESKTOP_HALF = 10
    const MAX_MOBILE_DOTS = 10
    let visible: DotInfo[] = dots
    let isWindowed = false
    let windowStart = 0

    if (isMobile && total > MAX_MOBILE_DOTS) {
        const currentIdx = currentDotId ? dotOrder.indexOf(currentDotId) : 0
        let start = Math.max(0, currentIdx - 5)
        let end = Math.min(total, start + MAX_MOBILE_DOTS)
        if (end - start < MAX_MOBILE_DOTS && end === total) {
            start = Math.max(0, total - MAX_MOBILE_DOTS)
            end = total
        }
        visible = dots.slice(start, end)
        windowStart = start
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
        windowStart = start
        isWindowed = true
    }

    /* ── current indicator position (slides smoothly) ── */
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
            <Box
                sx={{
                    height: 4,
                    background: 'rgba(184,134,11,0.1)',
                    borderRadius: '999px',
                    overflow: 'visible',
                    position: 'relative',
                }}
            >
                {/* filled track */}
                <Box
                    sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, #b8860b, #d4a843)',
                        borderRadius: '999px',
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        width: fillWidth,
                    }}
                />

                {/* sliding "current" ring — moves smoothly between dots */}
                {currentLeftPct !== null && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: `${currentLeftPct}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: '2.5px solid #b8860b',
                            background: 'transparent',
                            boxShadow: '0 0 0 4px rgba(184,134,11,0.15)',
                            transition: 'left 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            zIndex: 4,
                            pointerEvents: 'none',
                            animation: 'dotPulse 1.8s ease-in-out infinite',
                        }}
                    />
                )}

                {/* dots */}
                {visible.map((dot, idx) => {
                    const leftPct = isWindowed
                        ? visible.length === 1
                            ? 50
                            : (idx / (visible.length - 1)) * 100
                        : total === 1
                            ? 50
                            : (idx / (total - 1)) * 100

                    const answered = dot.color !== undefined
                    const bg = answered
                        ? dot.color!
                        : dot.isAgainPending
                            ? 'rgba(198,40,40,0.12)'
                            : 'rgba(122,110,101,0.18)'
                    const border = answered
                        ? 'none'
                        : dot.isAgainPending
                            ? '1.5px solid rgba(198,40,40,0.35)'
                            : 'none'

                    return (
                        <Box
                            key={dot.dotId}
                            sx={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: bg,
                                border,
                                boxShadow: answered
                                    ? `0 0 0 2px ${dot.color}18`
                                    : 'none',
                                /* smooth glide when reinsertion shifts positions */
                                transition:
                                    'left 0.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                                    'background 0.35s ease, ' +
                                    'box-shadow 0.35s ease',
                                zIndex: answered ? 2 : 1,
                            }}
                        />
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
