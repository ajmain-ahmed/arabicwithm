'use client'

import { School, Movie, MenuBook, LibraryBooks } from '@mui/icons-material'
import React from 'react'

export const NAV_ITEMS = ['Learn', 'About', 'Contact'] as const

export const NAV_ROUTES: Record<string, string> = {
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
        header: 'Study',
        icon: React.createElement(School, { sx: { fontSize: 20, color: 'var(--awm-forest)' } }),
        items: ['Beginner', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    },
    {
        header: 'Cartoons',
        icon: React.createElement(Movie, { sx: { fontSize: 20, color: 'var(--awm-forest)' } }),
        items: ['Spongebob', 'Amazing World of Gumball', 'Dragonball Z', 'Yu-Gi-Oh!', 'TMNT', 'Others'],
    },
    {
        header: 'Reading',
        icon: React.createElement(MenuBook, { sx: { fontSize: 20, color: 'var(--awm-forest)' } }),
        items: ['Visual', 'Written', 'News', 'Literature'],
    },
    {
        header: 'Stories',
        icon: React.createElement(LibraryBooks, { sx: { fontSize: 20, color: 'var(--awm-forest)' } }),
        items: ['The Girl Who Escaped', 'The Turn of Success', 'The Sanctity of Marriage', 'Yusuf and the Stolen Necklace', 'The Recurring Dream', 'Seeking Advice', 'Late for School', 'Others'],
    },
]

export const STUDY_LEVEL_MAP: Record<string, string> = {
    Beginner: 'Beginner',
    A1: 'Apprentice',
    A2: 'Competent',
    B1: 'Proficient',
    B2: 'Highly-Proficient',
    C1: 'Expert',
    C2: 'Native',
}

export type MegaSection = (typeof MEGA_MENU_ITEMS)[number]
export type NavigateFn = (url: string) => void
