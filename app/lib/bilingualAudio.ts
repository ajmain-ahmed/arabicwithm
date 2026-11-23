import type { ChapterAudioTimings } from '@/app/lib/chapterAudioTimings'

export interface BilingualTimelineItem {
  blockIndex: number
  language: 'ar' | 'en'
  startMs: number
  endMs: number
  timelineStartMs: number
  timelineEndMs: number
}

export function buildBilingualTimeline(arabic: ChapterAudioTimings | null, english: ChapterAudioTimings | null) {
  if (!arabic || !english || arabic.contentHash !== english.contentHash) throw new Error('Bilingual playback requires matching Arabic and English timing maps.')
  const englishByBlock = new Map(english.segments.map(segment => [segment.blockIndex, segment]))
  const items: BilingualTimelineItem[] = []
  let durationMs = 0
  for (const arabicSegment of arabic.segments) {
    const englishSegment = englishByBlock.get(arabicSegment.blockIndex)
    if (!englishSegment) continue
    for (const [language, segment] of [['ar', arabicSegment], ['en', englishSegment]] as const) {
      const item = {
        blockIndex: arabicSegment.blockIndex,
        language,
        startMs: segment.startMs,
        endMs: segment.endMs,
        timelineStartMs: durationMs,
        timelineEndMs: durationMs + segment.endMs - segment.startMs,
      }
      items.push(item)
      durationMs = item.timelineEndMs
    }
  }
  if (!items.length) throw new Error('Bilingual playback requires matching sentence timings in both languages.')
  return {
    items,
    timings: {
      version: 1 as const,
      contentHash: arabic.contentHash,
      durationMs,
      segments: items.filter(item => item.language === 'ar').map(item => ({
        blockIndex: item.blockIndex,
        startMs: item.timelineStartMs,
        endMs: item.timelineEndMs,
      })),
    },
  }
}

export function bilingualItemAtTime(items: BilingualTimelineItem[], seconds: number): BilingualTimelineItem {
  const milliseconds = Math.max(0, seconds * 1000)
  const active = items.find(item => milliseconds < item.timelineEndMs)
  return active ?? items[items.length - 1]
}

export function bilingualTimelinePosition(item: BilingualTimelineItem, mediaSeconds: number): number {
  const offsetMs = Math.max(0, Math.min(mediaSeconds * 1000 - item.startMs, item.endMs - item.startMs))
  return (item.timelineStartMs + offsetMs) / 1000
}
