'use client'

import React from 'react'
import { Box, Container } from '@mui/material'
import type { DashboardData } from '@/app/actions/dashboard'
import DashboardSidebar from './DashboardSidebar'
import WelcomeHeader from './WelcomeHeader'
import StatsCard from './StatsCard'
import ContinueLearningCard from './ContinueLearningCard'
import TodaysProgress from './TodaysProgress'
import QuickActions from './QuickActions'
import ProgressStats from './ProgressStats'
import StudyStreak from './StudyStreak'
import ContinueWhereLeftOff from './ContinueWhereLeftOff'
import Insights from './Insights'
import RecentActivity from './RecentActivity'
import Achievements from './Achievements'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Jost:wght@300;400;500;600;700&display=swap');
  :root {
    --cream: #f5ede0;
    --forest: #0e2e1f;
    --gold: #b8860b;
    --gold-lt: #d4a843;
    --muted: #7a6e65;
    --bark: #2c1a0e;
    --font-serif: 'EB Garamond', Georgia, 'Times New Roman', serif;
    --font-sans: 'Jost', system-ui, -apple-system, sans-serif;
  }
`

export default function DashboardHome({ data }: { data: DashboardData }) {
  return (
    <>
      <style>{CSS}</style>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#f5ede0',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Desktop sidebar */}
        <DashboardSidebar data={data} />

        <Box
          sx={{
            ml: { md: '220px', lg: '240px' },
            minHeight: '100vh',
            pb: { xs: 4, md: 6 },
          }}
        >
          <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4, lg: 5 } }}>
            {/* ── Top row: Welcome + Stats ── */}
            <Box
              sx={{
                pt: { xs: 3, md: 4 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr' },
                gap: { xs: 2, md: 3 },
                alignItems: 'start',
              }}
            >
              <WelcomeHeader data={data} />
              <StatsCard data={data} />
            </Box>

            {/* ── Continue Learning + Today's Progress ── */}
            <Box
              sx={{
                mt: { xs: 2, md: 3 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr' },
                gap: { xs: 2, md: 3 },
                alignItems: 'start',
              }}
            >
              <ContinueLearningCard data={data} />
              <TodaysProgress data={data} />
            </Box>

            {/* ── Quick Actions ── */}
            <Box sx={{ mt: { xs: 2, md: 3 } }}>
              <QuickActions />
            </Box>

            {/* ── Progress Stats + Study Heatmap ── */}
            <Box
              sx={{
                mt: { xs: 2, md: 3 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr' },
                gap: { xs: 2, md: 3 },
                alignItems: 'start',
              }}
            >
              <ProgressStats data={data} />
              <StudyStreak data={data} />
            </Box>

            {/* ── Insights + Recent Activity ── */}
            <Box
              sx={{
                mt: { xs: 2, md: 3 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: { xs: 2, md: 3 },
                alignItems: 'start',
              }}
            >
              <Insights data={data} />
              <RecentActivity />
            </Box>

            {/* ── Achievements ── */}
            <Box sx={{ mt: { xs: 2, md: 3 }, mb: { xs: 2, md: 4 } }}>
              <Achievements data={data} />
            </Box>
          </Container>
        </Box>
      </Box>
    </>
  )
}
