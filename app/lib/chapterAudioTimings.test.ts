// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  chapterAudioBlockAtTime,
  chapterAudioPageMarkers,
  chapterAudioSegmentAtTime,
  chapterAudioSegmentForPage,
  chapterAudioSentences,
  parseChapterAudioTimings,
} from '@/app/lib/chapterAudioTimings'
import {
  createChapterAudioTimings,
  hashChapterAudioContent,
  timingsForChapterContent,
} from '@/app/lib/chapterAudioTimings.server'

const content = [
  { tokens: [{ arabic: 'الأولى', english: 'first' }], translation: 'First sentence.' },
  { tokens: [{ prefix: 'و', arabic: 'الثانية', suffix: '!' }], translation: 'Second sentence.', punctuation: '.' },
]
const draft = {
  durationMs: 12_000,
  segments: [
    { blockIndex: 0, startMs: 500, endMs: 4_000 },
    { blockIndex: 1, startMs: 5_000, endMs: 10_000 },
  ],
}

describe('chapter audio timings', () => {
  it('extracts readable sentences and creates a stable content hash', () => {
    expect(chapterAudioSentences(content)).toEqual([
      { blockIndex: 0, arabic: 'الأولى', translation: 'First sentence.' },
      { blockIndex: 1, arabic: 'والثانية!.', translation: 'Second sentence.' },
    ])
    const reordered = { translation: 'First sentence.', tokens: [{ english: 'first', arabic: 'الأولى' }] }
    expect(hashChapterAudioContent([reordered, content[1]])).toBe(hashChapterAudioContent(content))
  })

  it('finds active segments and uses the last started sentence during pauses', () => {
    const timings = createChapterAudioTimings(content, draft)
    expect(chapterAudioSegmentAtTime(timings, 0.49)).toBeNull()
    expect(chapterAudioSegmentAtTime(timings, 0.5)?.blockIndex).toBe(0)
    expect(chapterAudioSegmentAtTime(timings, 3.999)?.blockIndex).toBe(0)
    expect(chapterAudioSegmentAtTime(timings, 4)).toBeNull()
    expect(chapterAudioBlockAtTime(timings, 4.5)).toBe(0)
    expect(chapterAudioBlockAtTime(timings, 5)).toBe(1)
    expect(chapterAudioBlockAtTime(timings, 11)).toBe(1)
    expect(chapterAudioBlockAtTime(timings, 0.1)).toBeNull()
    expect(chapterAudioSegmentForPage(timings, [0, 1], 1, 2)?.blockIndex).toBe(0)
    expect(chapterAudioSegmentForPage(timings, [0, 1], 2, 2)?.blockIndex).toBe(1)
    expect(chapterAudioSegmentForPage(timings, [0, 1], 3, 2)).toBeNull()
    expect(chapterAudioPageMarkers(timings, [0, 1], 2, 12)).toEqual([{ page: 1, seconds: 0 }, { page: 2, seconds: 5 }])
    expect(chapterAudioPageMarkers(timings, [0, 1], 2, 0)).toEqual([])
  })

  it('rejects malformed, overlapping, and out-of-range mappings', () => {
    expect(() => createChapterAudioTimings(content, { durationMs: 5_000, segments: [{ blockIndex: 0, startMs: 1_000, endMs: 2_000 }, { blockIndex: 1, startMs: 1_500, endMs: 3_000 }] })).toThrow(/overlap/i)
    expect(() => createChapterAudioTimings(content, { durationMs: 5_000, segments: [{ blockIndex: 2, startMs: 1_000, endMs: 2_000 }] })).toThrow(/outside/i)
    expect(parseChapterAudioTimings({ version: 1, contentHash: 'bad', durationMs: 1_000, segments: [] })).toBeNull()
  })

  it('disables timings after the chapter text changes', () => {
    const timings = createChapterAudioTimings(content, draft)
    expect(timingsForChapterContent(timings, content)).toEqual(timings)
    expect(timingsForChapterContent(timings, [content[0], { ...content[1], translation: 'Changed.' }])).toBeNull()
    expect(timingsForChapterContent(timings, { schema_version: '1.0.0', sections: [] })).toBeNull()
  })
})
