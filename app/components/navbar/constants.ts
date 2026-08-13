'use client'

import { Movie } from '@mui/icons-material'
import React from 'react'

export const NAV_ITEMS = ['Cartoons', 'Books', 'Practice', 'About', 'Contact'] as const

export const NAV_ROUTES: Record<string, string> = {
    Cartoons: '/cartoons',
    Books: '/books',
    Practice: '/practice',
    About: '/about',
    Contact: '/contact',
}

export const CARTOON_SLUG_MAP: Record<string, string> = {
    'Teenage Mutant Ninja Turtles': 'tmnt',
    'Islamic Stories': 'qss',
    'Naruto': 'nar',
    'The Omar Series': 'omar',
    'Companions of the Prophet': 'cotp',
    'Spongebob Squarepants': 'sb',
    'Invincible': 'inv',
    'Spy Family': 'spyx',
}

export const MEGA_MENU_ITEMS = [
    {
        header: 'Cartoons',
        icon: React.createElement(Movie, { sx: { fontSize: 20, color: 'var(--awm-forest)' } }),
        items: [
            'Teenage Mutant Ninja Turtles',
            'Islamic Stories',
            'Naruto',
            'The Omar Series',
            'Companions of the Prophet',
            'Spongebob Squarepants',
            'Invincible',
            'Spy Family',
        ],
    },
]

export type MegaSection = (typeof MEGA_MENU_ITEMS)[number]
export type NavigateFn = (url: string) => void
