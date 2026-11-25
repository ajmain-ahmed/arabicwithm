'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'
import { forwardRef, type MouseEventHandler, type ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

export function formatTranscriptTimestamp(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

const TranscriptBlock = forwardRef<HTMLDivElement, {
  active?: boolean
  timestamp?: number | null
  title?: ReactNode
  children: ReactNode
  id?: string
  blockIndex?: number
  interactive?: boolean
  dimmed?: boolean
  scrollMarginTop?: string | number
  onClick?: MouseEventHandler<HTMLDivElement>
  onTimestampClick?: () => void
}>(function TranscriptBlock({ active = false, timestamp, title, children, id, blockIndex, interactive = false, dimmed = false, scrollMarginTop, onClick, onTimestampClick }, ref) {
  const {t}=useWebsiteLocale()
  return <Box
    ref={ref}
    id={id}
    data-reader-block={blockIndex}
    data-active={active || undefined}
    onClick={onClick}
    sx={{
      position: 'relative',
      px: 2,
      py: 1.5,
      mb: 1,
      borderRadius: '8px',
      borderLeft: '3px solid',
      borderLeftColor: active ? 'var(--awm-gold)' : 'transparent',
      bgcolor: active ? 'rgba(184,134,11,0.12)' : 'transparent',
      cursor: interactive ? 'pointer' : 'default',
      opacity: dimmed ? 0.75 : 1,
      scrollMarginTop,
      transition: 'background-color 150ms ease, border-color 200ms ease',
      '&:hover': { bgcolor: active ? 'rgba(184,134,11,0.12)' : 'rgba(184,134,11,0.06)' },
    }}
  >
    {(timestamp != null || title) && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
      {timestamp != null && <Typography dir="ltr" component={onTimestampClick ? 'button' : 'span'} type={onTimestampClick ? 'button' : undefined} onClick={onTimestampClick} aria-label={onTimestampClick ? t('Seek to {time}',{time:formatTranscriptTimestamp(timestamp)}) : undefined} sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.65rem', color: 'var(--awm-gold)', letterSpacing: '0.04em', fontWeight: 600, lineHeight: 1, cursor: onTimestampClick ? 'pointer' : 'default', border: 0, bgcolor: 'transparent', p: 0 }}>
        {formatTranscriptTimestamp(timestamp)}
      </Typography>}
      {title}
    </Box>}
    {children}
  </Box>
})

export default TranscriptBlock
