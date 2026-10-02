'use client'
import Link from 'next/link'
import { AccountCircleOutlined, BookmarkRounded, ManageSearchRounded, PsychologyOutlined } from '@mui/icons-material'
import { Box, Paper, Typography } from '@mui/material'

export default function HomeQuickActions({ bookmarkHref, bookmarkLabel }: { bookmarkHref: string; bookmarkLabel: string }) {
  const actions = [
    { title: 'Bookmark', detail: bookmarkLabel, href: bookmarkHref, icon: BookmarkRounded },
    { title: 'My Profile', detail: 'Your progress & trophy cabinet', href: '/profile', icon: AccountCircleOutlined },
    { title: 'Word Search', detail: 'Discover Arabic words', href: '/word-search', icon: ManageSearchRounded },
    { title: 'Memory', detail: 'Practise your recall', href: '/memory', icon: PsychologyOutlined },
  ]
  return <Box component="nav" aria-label="Learning shortcuts" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,minmax(0,1fr))' }, gap: 2.5, mb: 2.5 }}>
    {actions.map(action => <Paper key={action.title} component={Link} href={action.href} elevation={0} sx={{ minWidth: 0, minHeight: { xs: 145, md: 166 }, p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none', bgcolor: 'var(--awm-white)', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)', borderRadius: '16px', transition: 'transform .18s ease, box-shadow .18s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px color-mix(in srgb, var(--awm-gold) 14%, transparent)' }, '&:focus-visible': { outline: '3px solid var(--awm-gold)', outlineOffset: 3 }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } } }}>
      <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: '11px', bgcolor: 'color-mix(in srgb, var(--awm-gold) 14%, transparent)', color: 'var(--awm-gold)' }}><action.icon aria-hidden="true" /></Box>
      <Box sx={{ mt: 1.5 }}><Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 22, md: 25 }, fontWeight: 600, color: 'var(--awm-bark)' }}>{action.title}</Typography><Typography sx={{ color: 'var(--awm-muted)', fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 36 }}>{action.detail}</Typography></Box>
    </Paper>)}
  </Box>
}
