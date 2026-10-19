'use client'

import { useState } from 'react'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import { ExploreOutlined, PersonOutlineRounded } from '@mui/icons-material'
import type { ExploreFeedItem } from '@/app/lib/explore'
import ExploreFeed from './ExploreFeed'
import ForYouFeed from './ForYouFeed'

type ExploreView = 'explore' | 'foryou'

const RAIL_ICON_SX = {
  width: { xs: 44, md: 50 }, height: { xs: 44, md: 50 },
  color: { xs: 'var(--awm-gold-light)', md: '#fff' },
  bgcolor: { xs: 'transparent', md: 'rgba(255,255,255,0.14)' },
  filter: { xs: 'drop-shadow(0 1px 3px #000)', md: 'none' },
  '&:hover': { bgcolor: { xs: 'transparent', md: 'rgba(255,255,255,0.24)' }, transform: 'scale(1.08)' },
  '&:active': { transform: 'scale(.95)' },
  '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
} as const

function ViewSwitch({ view, onChange, layout = 'rail' }: { view: ExploreView; onChange: (view: ExploreView) => void; layout?: 'rail' | 'row' }) {
  const buttons = [
    { id: 'explore' as const, label: 'Explore', icon: <ExploreOutlined /> },
    { id: 'foryou' as const, label: 'For You', icon: <PersonOutlineRounded /> },
  ]
  return (
    <Box sx={{ display: 'flex', flexDirection: layout === 'rail' ? 'column' : 'row', gap: { xs: 0.85, md: layout === 'rail' ? 1.4 : 1 }, alignItems: 'center' }}>
      {buttons.map((button) => {
        const active = view === button.id
        return (
          <Tooltip key={button.id} title={button.label} placement="left">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                onClick={() => onChange(button.id)}
                aria-label={`${button.label} feed`}
                aria-pressed={active}
                sx={{
                  ...RAIL_ICON_SX,
                  opacity: active ? 1 : 0.5,
                  transform: active ? 'scale(1.08)' : 'none',
                }}
              >
                {button.icon}
              </IconButton>
              <Typography sx={{ display: layout === 'rail' ? { xs: 'none', md: 'block' } : 'none', fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{button.label}</Typography>
            </Box>
          </Tooltip>
        )
      })}
    </Box>
  )
}

export default function ExploreViews({ seed, items, hasMore }: { seed: string; items: ExploreFeedItem[]; hasMore: boolean }) {
  const [view, setView] = useState<ExploreView>('explore')
  const railSwitch = <ViewSwitch view={view} onChange={setView} />
  const rowSwitch = <ViewSwitch view={view} onChange={setView} layout="row" />
  return view === 'explore'
    ? <ExploreFeed seed={seed} initialItems={items} initialHasMore={hasMore} railTop={railSwitch} />
    : <ForYouFeed switcher={rowSwitch} railSwitcher={railSwitch} />
}
