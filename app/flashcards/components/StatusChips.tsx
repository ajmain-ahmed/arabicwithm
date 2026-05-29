'use client'

import React from 'react'
import { Box } from '@mui/material'

export type CardStatus = 'new' | 'revision' | 'completed'
export type FilterType = 'all' | 'new' | 'revision' | 'completed'

const STATUS_CHIP_COLORS: Record<CardStatus, { activeBg: string; activeColor: string; border: string }> = {
    new: { activeBg: 'rgba(122,110,101,0.12)', activeColor: '#4a3d35', border: 'rgba(122,110,101,0.35)' },
    revision: { activeBg: 'rgba(21,101,192,0.1)', activeColor: '#0d47a1', border: 'rgba(21,101,192,0.35)' },
    completed: { activeBg: 'rgba(46,125,50,0.1)', activeColor: '#1b5e20', border: 'rgba(46,125,50,0.35)' },
}

interface StatusChipsProps {
    newCount: number
    revisionCount: number
    completedCount: number
    filter: FilterType
    currentStatus: CardStatus | null
    onFilterChange: (f: FilterType) => void
}

export default function StatusChips({ newCount, revisionCount, completedCount, filter, currentStatus, onFilterChange }: StatusChipsProps) {
    const chips: { type: CardStatus; count: number }[] = [
        { type: 'new', count: newCount },
        { type: 'revision', count: revisionCount },
        { type: 'completed', count: completedCount },
    ]
    return (
        <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1.5 }, flexWrap: 'wrap' }}>
            {chips.map(({ type, count }) => {
                const colors = STATUS_CHIP_COLORS[type]
                const isFilterActive = filter === type
                const isCurrentCard = currentStatus === type
                const isHighlighted = isFilterActive || isCurrentCard
                const isDisabled = count === 0
                return (
                    <Box
                        key={type}
                        onClick={isDisabled ? undefined : () => onFilterChange(filter === type ? 'all' : type)}
                        sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: { xs: '12px', sm: '13px', md: '14px' },
                            fontWeight: isHighlighted ? 700 : 500,
                            padding: { xs: '4px 10px', sm: '5px 14px' },
                            borderRadius: '999px',
                            border: `${isHighlighted ? 2 : 1}px solid`,
                            borderColor: isHighlighted ? colors.border : 'rgba(122,110,101,0.18)',
                            color: isHighlighted ? colors.activeColor : isDisabled ? 'rgba(122,110,101,0.35)' : '#7a6e65',
                            background: isHighlighted ? colors.activeBg : 'transparent',
                            cursor: isDisabled ? 'default' : 'pointer',
                            transition: 'all 0.15s',
                            userSelect: 'none',
                            outline: isCurrentCard && !isFilterActive ? `2px solid ${colors.border}` : 'none',
                            outlineOffset: '1px',
                            '&:hover': isDisabled ? {} : { background: colors.activeBg, borderColor: colors.border, color: colors.activeColor },
                        }}
                    >
                        {count} {type}
                    </Box>
                )
            })}
        </Box>
    )
}
