import { expect, it } from 'vitest'
import { bilingualItemAtTime, bilingualTimelinePosition, buildBilingualTimeline } from './bilingualAudio'

const timings = {
  version: 1 as const,
  contentHash: 'a'.repeat(64),
  durationMs: 10000,
  segments: [
    { blockIndex: 0, startMs: 1000, endMs: 4000 },
    { blockIndex: 1, startMs: 5000, endMs: 7000 },
  ],
}

it('alternates Arabic then English with cumulative per-sentence timing', () => {
  const { items, timings: combined } = buildBilingualTimeline(timings, timings)
  expect(items.map(item => item.language)).toEqual(['ar', 'en', 'ar', 'en'])
  expect(items.map(item => item.blockIndex)).toEqual([0, 0, 1, 1])
  expect(items.map(item => item.timelineStartMs)).toEqual([0, 3000, 6000, 8000])
  expect(combined.durationMs).toBe(10000)
  expect(combined.segments.map(segment => [segment.blockIndex, segment.startMs, segment.endMs])).toEqual([[0, 0, 3000], [1, 6000, 8000]])
})

it('maps seeks and media time to the correct bilingual position', () => {
  const { items } = buildBilingualTimeline(timings, timings)
  const second = bilingualItemAtTime(items, 4)
  expect(second.language).toBe('en')
  expect(second.blockIndex).toBe(0)
  expect(bilingualTimelinePosition(second, 3.5)).toBe(5.5)
  const last = bilingualItemAtTime(items, 99)
  expect(last.blockIndex).toBe(1)
  expect(last.language).toBe('en')
})
