'use client'

import React from 'react'
import { Box, Typography, Chip, Paper, Button } from '@mui/material'
import Grid from '@mui/material/Grid'
import { Lock, StarBorder, NotificationsNone } from '@mui/icons-material'

/* ── Palette ── */
const BARK = '#2c1a0e'
const GOLD = '#b8860b'
const WARM_WHITE = '#fffaf0'
const MUTED = '#7a6e65'
const LABEL = '#9e8a7a'

const DIFFICULTY_COLORS: Record<string, string> = {
  'A1-A2': '#6b8f5e',
  'A2-B1': '#5a7d8c',
  'B1-B2': '#c4904a',
  'B2-C1': '#8a6a8a',
}

/* ═══════════════════════════════════════════════
   Coming Soon Item
   ═══════════════════════════════════════════════ */
export interface ComingSoonItem {
  title: string
  category: string
  level: string
  date: string
}

export interface ComingSoonSectionProps {
  label?: string
  heading?: string
  items: ComingSoonItem[]
  showNotifyButton?: boolean
}

export default function ComingSoonSection({
  label = 'Coming Soon',
  heading = 'More on the Way',
  items,
  showNotifyButton = true,
}: ComingSoonSectionProps) {
  return (
    <Box sx={{ pt: { xs: 5, md: 7 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: { xs: 13, md: 14 },
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: GOLD,
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: { xs: 24, md: 32 },
              color: BARK,
            }}
          >
            {heading}
          </Typography>
        </Box>
        {showNotifyButton && (
          <Button
            startIcon={<NotificationsNone sx={{ fontSize: 16 }} />}
            sx={{
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: { xs: 13, md: 14 },
              fontWeight: 500,
              textTransform: 'none',
              color: GOLD,
              '&:hover': { backgroundColor: 'rgba(184,134,11,0.06)' },
              display: { xs: 'none', sm: 'flex' },
            }}
          >
            Notify Me
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        {items.map((item) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={item.title}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                textAlign: 'center',
                borderRadius: '10px',
                backgroundColor: WARM_WHITE,
                border: '1px solid rgba(44,26,14,0.12)',
                opacity: 0.7,
                position: 'relative',
              }}
            >
              {/* Lock icon */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(44,26,14,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock sx={{ fontSize: 14, color: LABEL }} />
              </Box>
              {/* Star icon */}
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(184,134,11,0.1)',
                  color: GOLD,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <StarBorder sx={{ fontSize: 18 }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: { xs: 15, md: 17 },
                  fontWeight: 500,
                  color: BARK,
                  mb: 1,
                }}
              >
                {item.title}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <Chip
                  label={item.category}
                  size="small"
                  sx={{
                    height: 20,
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(44,26,14,0.04)',
                    color: MUTED,
                    fontSize: 10,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: DIFFICULTY_COLORS[item.level] || MUTED,
                  }}
                >
                  {item.level}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: 'rgba(44,26,14,0.5)',
                }}
              >
                {item.date}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
