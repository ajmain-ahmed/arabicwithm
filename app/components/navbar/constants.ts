'use client'

import { Movie } from '@mui/icons-material'
import React from 'react'

export const NAV_ITEMS = ['Cartoons', 'About', 'Contact'] as const

export const NAV_ROUTES: Record<string, string> = {
    Cartoons: '/cartoons',
    About: '/about',
    Contact: '/contact',
}

export const CARTOON_SLUG_MAP: Record<string, string> = {
    Spongebob: 'sb',
    'Amazing World of Gumball': 'amazing-world-of-gumball',
    'Dragonball Z': 'dragonball-z',
    'Yu-Gi-Oh!': 'yu-gi-oh',
    TMNT: 'tmnt',
    Others: 'others',
}

export const MEGA_MENU_ITEMS = [
    {
        header: 'Cartoons',
        icon: React.createElement(Movie, { sx: { fontSize: 20, color: 'var(--awm-forest)' } }),
        items: ['Spongebob', 'Amazing World of Gumball', 'Dragonball Z', 'Yu-Gi-Oh!', 'TMNT', 'Others'],
    },
]

export type MegaSection = (typeof MEGA_MENU_ITEMS)[number]
export type NavigateFn = (url: string) => void
