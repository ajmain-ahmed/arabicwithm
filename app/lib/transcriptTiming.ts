/** All manual-import timing becomes integer milliseconds before validation. */
export const MAX_TRANSCRIPT_TIME_MS = 12 * 60 * 60 * 1000
export const FINAL_DURATION_MESSAGE = 'This transcript uses start-only timestamps. Enter the video duration (MM:SS or HH:MM:SS) so the final segment can be timed.'

export class MissingTranscriptDuration extends Error {
  constructor() { super(FINAL_DURATION_MESSAGE) }
}

export function parseTranscriptTime(value: unknown, unit: 'milliseconds' | 'seconds' = 'milliseconds'): number {
  if (typeof value === 'number') {
    const milliseconds = unit === 'seconds' ? Math.round(value * 1000) : value
    if (!Number.isFinite(value) || !Number.isSafeInteger(milliseconds) || milliseconds < 0) throw new Error('Use a finite, non-negative time value.')
    return milliseconds
  }
  if (typeof value !== 'string') throw new Error('Enter a time as MM:SS or HH:MM:SS.')
  const time = value.trim()
  if (!/^\d+(?::\d{2}){1,2}(?:\.\d{1,3})?$/.test(time)) throw new Error('Enter a time as MM:SS or HH:MM:SS, for example 10:57 or 1:10:57.')
  const parts = time.split(':').map(Number)
  if (parts.slice(1).some(part => part >= 60)) throw new Error('Minutes and seconds after a colon must be between 00 and 59.')
  const milliseconds = Math.round(parts.reduce((total, part) => total * 60 + part, 0) * 1000)
  if (!Number.isSafeInteger(milliseconds)) throw new Error('Time is too large.')
  return milliseconds
}

export function parseVideoDuration(value: string): number | undefined {
  if (!value.trim()) return undefined
  const milliseconds = parseTranscriptTime(value)
  if (milliseconds <= 0 || milliseconds > MAX_TRANSCRIPT_TIME_MS) throw new Error('Video duration must be greater than zero and no longer than 12 hours.')
  return milliseconds
}
