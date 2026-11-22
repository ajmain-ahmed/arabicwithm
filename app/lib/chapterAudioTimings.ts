import { z } from 'zod'

export const chapterAudioTimingSegmentSchema = z.object({
  blockIndex: z.number().int().nonnegative(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
}).refine(segment => segment.endMs > segment.startMs, { message: 'Each audio segment must end after it starts.' })

export const chapterAudioTimingDraftSchema = z.object({
  durationMs: z.number().int().positive().max(86_400_000),
  segments: z.array(chapterAudioTimingSegmentSchema).max(5000),
}).superRefine((draft, context) => {
  draft.segments.forEach((segment, index) => {
    if (segment.endMs > draft.durationMs) context.addIssue({ code: 'custom', message: `Segment ${index + 1} ends after the audio.`, path: ['segments', index, 'endMs'] })
    const previous = draft.segments[index - 1]
    if (!previous) return
    if (segment.blockIndex <= previous.blockIndex) context.addIssue({ code: 'custom', message: 'Segment block indexes must be strictly increasing.', path: ['segments', index, 'blockIndex'] })
    if (segment.startMs < previous.endMs) context.addIssue({ code: 'custom', message: 'Audio segments cannot overlap.', path: ['segments', index, 'startMs'] })
  })
})

export const chapterAudioTimingsSchema = z.object({
  version: z.literal(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  durationMs: z.number().int().positive().max(86_400_000),
  segments: z.array(chapterAudioTimingSegmentSchema).max(5000),
}).superRefine((timings, context) => {
  const result = chapterAudioTimingDraftSchema.safeParse({ durationMs: timings.durationMs, segments: timings.segments })
  if (!result.success) {
    for (const issue of result.error.issues) context.addIssue({ code: 'custom', message: issue.message, path: issue.path })
  }
})

export type ChapterAudioTimingSegment = z.infer<typeof chapterAudioTimingSegmentSchema>
export type ChapterAudioTimingDraft = z.infer<typeof chapterAudioTimingDraftSchema>
export type ChapterAudioTimings = z.infer<typeof chapterAudioTimingsSchema>

export interface ChapterAudioSentence {
  blockIndex: number
  arabic: string
  translation: string
}

export function chapterAudioSentences(content: unknown): ChapterAudioSentence[] {
  if (!Array.isArray(content)) return []
  return content.flatMap((value, blockIndex) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const block = value as Record<string, unknown>
    const tokens = Array.isArray(block.tokens) ? block.tokens : []
    const arabic = tokens.map(token => {
      if (!token || typeof token !== 'object' || Array.isArray(token)) return ''
      const value = token as Record<string, unknown>
      return `${typeof value.prefix === 'string' ? value.prefix : ''}${typeof value.arabic === 'string' ? value.arabic : ''}${typeof value.suffix === 'string' ? value.suffix : ''}`
    }).filter(Boolean).join(' ')
    return [{
      blockIndex,
      arabic: `${arabic}${typeof block.punctuation === 'string' ? block.punctuation : ''}`,
      translation: typeof block.translation === 'string' ? block.translation : '',
    }]
  })
}

export function canonicalChapterContent(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalChapterContent).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalChapterContent(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

export function parseChapterAudioTimings(value: unknown): ChapterAudioTimings | null {
  const parsed = chapterAudioTimingsSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function chapterAudioSegmentAtTime(timings: ChapterAudioTimings | null, seconds: number): ChapterAudioTimingSegment | null {
  if (!timings || !Number.isFinite(seconds)) return null
  const milliseconds = seconds * 1000
  let low = 0
  let high = timings.segments.length - 1
  let candidate = -1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (timings.segments[middle].startMs <= milliseconds) {
      candidate = middle
      low = middle + 1
    } else high = middle - 1
  }
  const segment = candidate >= 0 ? timings.segments[candidate] : null
  return segment && milliseconds < segment.endMs ? segment : null
}

export function chapterAudioSegmentForPage(timings: ChapterAudioTimings | null, pageStarts: number[], page: number, sourceLength: number): ChapterAudioTimingSegment | null {
  if (!timings || page < 1 || page > pageStarts.length) return null
  const start = pageStarts[page - 1]
  const end = pageStarts[page] ?? sourceLength
  return timings.segments.find(segment => segment.blockIndex >= start && segment.blockIndex < end) ?? null
}

export interface ChapterAudioPageMarker {
  page: number
  seconds: number
}

export function chapterAudioPageMarkers(timings: ChapterAudioTimings | null, pageStarts: number[], sourceLength: number, durationSeconds: number): ChapterAudioPageMarker[] {
  if (!timings || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return []
  const markers: ChapterAudioPageMarker[] = []
  for (let page = 1; page <= pageStarts.length; page++) {
    const segment = chapterAudioSegmentForPage(timings, pageStarts, page, sourceLength)
    if (!segment) continue
    const seconds = page === 1 ? 0 : segment.startMs / 1000
    if (seconds < durationSeconds) markers.push({ page, seconds })
  }
  return markers
}

export function chapterAudioBlockAtTime(timings: ChapterAudioTimings | null, seconds: number): number | null {
  if (!timings || !Number.isFinite(seconds)) return null
  const active = chapterAudioSegmentAtTime(timings, seconds)
  if (active) return active.blockIndex
  const milliseconds = seconds * 1000
  let blockIndex: number | null = null
  for (const segment of timings.segments) {
    if (segment.startMs > milliseconds) break
    blockIndex = segment.blockIndex
  }
  return blockIndex
}
