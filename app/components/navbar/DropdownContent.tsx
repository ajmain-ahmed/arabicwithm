'use client'

import { Box, Typography } from '@mui/material'
import { MegaSection, NavigateFn, CARTOON_SLUG_MAP, STUDY_LEVEL_MAP } from './constants'

interface DropdownContentProps {
    section: MegaSection
    isMobile?: boolean
    navigate: NavigateFn
    closeAll: () => void
}

export default function DropdownContent({ section, isMobile = false, navigate, closeAll }: DropdownContentProps) {
    const handleItemClick = (item: string) => {
        if (section.header === 'Study') {
            const slug = STUDY_LEVEL_MAP[item] ?? item.toLowerCase().replace(/\s+/g, '-')
            navigate(`/flashcards/${slug}`)
        } else if (section.header === 'Cartoons') {
            const slug = CARTOON_SLUG_MAP[item] ?? item.toLowerCase().replace(/\s+/g, '-')
            navigate(`/cartoons/${slug}`)
        } else if (section.header === 'Reading' && item === 'News') {
            navigate('/news')
        } else if (section.header === 'Reading' && item === 'Literature') {
            navigate('/literature')
        } else if (section.header === 'Reading') {
            const key = item.toLowerCase().replace(/\s+/g, '-')
            navigate(`/learn/reading/${key}`)
        } else {
            const key = item.toLowerCase().replace(/\s+/g, '-')
            navigate(`/learn/${section.header.toLowerCase()}/${key}`)
        }
        closeAll()
    }

    const handleHeaderClick = () => {
        if (section.header === 'Cartoons') {
            navigate('/cartoons')
        } else if (section.header === 'Study') {
            navigate('/flashcards')
        } else if (section.header === 'Reading') {
            navigate('/news')
        }
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
                    className={section.header === 'Cartoons' ? 'cartoon-header-link' : undefined}
                    onClick={handleHeaderClick}
                    variant="h6"
                    sx={{
                        letterSpacing: '0.02em',
                        cursor: section.header === 'Cartoons' || section.header === 'Study' ? 'pointer' : 'default',
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
