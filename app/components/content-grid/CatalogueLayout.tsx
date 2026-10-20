'use client'

import { useState, type ReactNode } from 'react'
import { Box, Button, Container, Drawer, IconButton, Typography } from '@mui/material'
import { Close, Tune } from '@mui/icons-material'

const BARK = 'var(--awm-bark)'
const WARM_WHITE = 'var(--awm-cream-light)'
const MUTED = 'var(--awm-muted)'

/* Shared catalogue shell used by /cartoons and /books: breadcrumbs, header
   row with a leading control/title, mobile filters button + drawer, sticky
   filter sidebar on desktop, and a content column with a right-aligned count
   label. Pages render their own grid (and empty state) as children. */

export interface CatalogueLayoutProps {
  breadcrumbs: ReactNode
  headerStart?: ReactNode
  activeFilterCount: number
  onClearFilters: () => void
  filtersPanel: ReactNode
  countLabel?: string
  drawerTitle?: string
  children: ReactNode
}

export default function CatalogueLayout({
  breadcrumbs,
  headerStart,
  activeFilterCount,
  onClearFilters,
  filtersPanel,
  countLabel,
  drawerTitle = 'Filters',
  children,
}: CatalogueLayoutProps) {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  return (
    <Box
      component="main"
      sx={{
        minHeight: { xs: 'calc(100vh - 56px)', md: '100vh' },
        '@supports (height: 100dvh)': { minHeight: { xs: 'calc(100dvh - 56px)', md: '100dvh' } },
        bgcolor: WARM_WHITE,
        pb: { xs: 2, md: 8 },
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 4 } }}>
        {breadcrumbs}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5, mb: { xs: 1.5, md: 3 } }}>
          <Box sx={{ display: 'flex', width: { xs: '100%', sm: 'auto' }, alignItems: 'center' }}>
            {headerStart}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Button startIcon={<Tune />} onClick={() => setFilterDrawerOpen(true)} sx={{ display: { xs: 'inline-flex', md: 'none' }, minHeight: 42, px: 2, borderRadius: '8px', color: BARK, border: '1px solid rgba(44,26,14,.15)', textTransform: 'none' }}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
            {activeFilterCount > 0 && <Button onClick={onClearFilters} sx={{ minHeight: 44 }}>Clear all</Button>}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: { md: 4, lg: 5 } }}>
          <Box sx={{ width: 240, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 100 }}>{filtersPanel}</Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {countLabel && (
              <Typography sx={{ display: { xs: 'none', md: 'block' }, mb: 2, color: MUTED, textAlign: 'right', fontSize: 13 }}>
                {countLabel}
              </Typography>
            )}
            {children}
          </Box>
        </Box>
      </Container>

      <Drawer anchor="left" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} slotProps={{ paper: { sx: { width: 310, bgcolor: WARM_WHITE, p: 3 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ color: BARK, fontFamily: 'var(--font-heading)', fontSize: 22 }}>{drawerTitle}</Typography>
          <IconButton onClick={() => setFilterDrawerOpen(false)} aria-label="Close filters"><Close /></IconButton>
        </Box>
        {filtersPanel}
      </Drawer>
    </Box>
  )
}
