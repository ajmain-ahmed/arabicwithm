import { createHash } from 'node:crypto'
import {
  canonicalChapterContent,
  chapterAudioSentences,
  chapterAudioTimingsSchema,
  parseChapterAudioTimings,
  type ChapterAudioTimingDraft,
  type ChapterAudioTimings,
} from '@/app/lib/chapterAudioTimings'

export function hashChapterAudioContent(content: unknown): string {
  return createHash('sha256').update(canonicalChapterContent(content)).digest('hex')
}

export function createChapterAudioTimings(content: unknown, draft: ChapterAudioTimingDraft): ChapterAudioTimings {
  const blockCount = chapterAudioSentences(content).length
  if (blockCount === 0) throw new Error('Sentence timings require a legacy chapter with readable blocks.')
  for (const segment of draft.segments) {
    if (segment.blockIndex >= blockCount) throw new Error(`Segment block index ${segment.blockIndex} is outside this chapter.`)
  }
  return chapterAudioTimingsSchema.parse({
    version: 1,
    contentHash: hashChapterAudioContent(content),
    ...draft,
  })
}

export function timingsForChapterContent(value: unknown, content: unknown): ChapterAudioTimings | null {
  const timings = parseChapterAudioTimings(value)
  if (!timings || timings.contentHash !== hashChapterAudioContent(content)) return null
  return timings
}
