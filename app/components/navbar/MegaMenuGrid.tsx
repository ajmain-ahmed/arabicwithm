'use client'

import { Box } from '@mui/material'
import DropdownContent from './DropdownContent'
import { MEGA_MENU_ITEMS, NavigateFn } from './constants'

interface MegaMenuGridProps {
    isMobile?: boolean
    navigate: NavigateFn
    closeAll: () => void
}

export default function MegaMenuGrid({ isMobile = false, navigate, closeAll }: MegaMenuGridProps) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: isMobile ? 2 : 6,
                py: isMobile ? 2 : 3,
                px: isMobile ? 0 : 2,
            }}
        >
            {MEGA_MENU_ITEMS.map((section) => (
                <DropdownContent
                    key={section.header}
                    section={section}
                    isMobile={isMobile}
                    navigate={navigate}
                    closeAll={closeAll}
                />
            ))}
        </Box>
    )
}
