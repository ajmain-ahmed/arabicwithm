'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'

interface DonutChartProps {
  segments: { label: string; color: string; pct: number }[]
  total: number
  label: string
  size?: number
  strokeWidth?: number
}

export default function DonutChart({
  segments,
  total,
  label,
  size = 140,
  strokeWidth = 18,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(44,26,14,0.06)"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg) => {
            const segLen = (seg.pct / 100) * circumference
            const circleOffset = -offset
            offset += segLen
            return (
              <circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segLen} ${circumference - segLen}`}
                strokeDashoffset={circleOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 0.8s ease', opacity: seg.pct > 0 ? 1 : 0 }}
              />
            )
          })}
        </svg>
        {/* Center text */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e', lineHeight: 1 }}>
            {total}
          </Typography>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.6rem', color: '#9e8a7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {label}
          </Typography>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 12px' }}>
        {segments.map((seg) => (
          <Box key={seg.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: '#7a6e65', fontWeight: 500 }}>
              {seg.label}
            </Typography>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: '#9e8a7a' }}>
              {Math.round(seg.pct)}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
