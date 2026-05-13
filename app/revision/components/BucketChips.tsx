'use client'

import { Box } from '@mui/material'
import { type Queue, QUEUE_CONFIG } from '../types'

export default function BucketChips({ counts, currentQueue }: { counts: Record<Queue, number>; currentQueue: Queue }) {
    return (
        <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, alignItems: 'center', overflow: 'auto' }}>
            {(['new', 'learning', 'review'] as Queue[]).map(q => {
                const cfg = QUEUE_CONFIG[q]
                const isActive = currentQueue === q
                const count = counts[q]
                return (
                    <Box key={q} sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: { xs: '11px', sm: '13px' },
                        fontWeight: isActive ? 700 : 500,
                        px: { xs: '8px', sm: '12px' },
                        py: '4px',
                        borderRadius: '999px',
                        border: `${isActive ? '2px' : '1px'} solid`,
                        borderColor: isActive ? cfg.border : 'rgba(122,110,101,0.2)',
                        color: isActive ? cfg.color : '#7a6e65',
                        background: isActive ? cfg.activeBg : 'transparent',
                        transition: 'all 0.2s',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        opacity: count === 0 && !isActive ? 0.45 : 1,
                        flexShrink: 0,
                    }}>
                        {count} {cfg.label}
                    </Box>
                )
            })}
        </Box>
    )
}
