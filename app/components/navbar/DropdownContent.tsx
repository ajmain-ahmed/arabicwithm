'use client'

import { Box, Typography } from '@mui/material'
import { MegaSection, NavigateFn, CARTOON_SLUG_MAP } from './constants'

interface DropdownContentProps {
    section: MegaSection
    isMobile?: boolean
    navigate: NavigateFn
    closeAll: () => void
}

export default function DropdownContent({ section, isMobile = false, navigate, closeAll }: DropdownContentProps) {
    const handleItemClick = (item: string) => {
        const slug = CARTOON_SLUG_MAP[item] ?? item.toLowerCase().replace(/\s+/g, '-')
        navigate(`/cartoons/${slug}`)
        closeAll()
    }

    const handleHeaderClick = () => {
        navigate('/cartoons')
        closeAll()
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5,
                    pb: 1,
                    borderBottom: '1px solid color-mix(in srgb, var(--awm-gold) 10%, transparent)',
                }}
            >
                {!isMobile && section.icon}
                <Typography
                    className="cartoon-header-link"
                    onClick={handleHeaderClick}
                    variant="h6"
                    sx={{
                        letterSpacing: '0.02em',
                        cursor: 'pointer',
                    }}
                >
                    {section.header}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0.5 : 0.75, pl: isMobile ? 4 : 0 }}>
                {section.items.map((item) => (
                    <Typography
                        key={item}
                        className="mega-menu-item"
                        onClick={() => handleItemClick(item)}
                        variant="body2"
                        sx={{ cursor: 'pointer', width: 'fit-content' }}
                    >
                        {item}
                    </Typography>
                ))}
            </Box>
        </Box>
    )
}
