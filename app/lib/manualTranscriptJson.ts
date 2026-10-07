import type { CanonicalChunk } from '@/app/lib/manualTranscripts'
import { MAX_TRANSCRIPT_TIME_MS, MissingTranscriptDuration, parseTranscriptTime } from '@/app/lib/transcriptTiming'

/** Resource budget for authenticated imports, not a per-sentence/count restriction. */
export const MAX_TRANSCRIPT_BYTES = 20 * 1024 * 1024
const MAX_TIME = MAX_TRANSCRIPT_TIME_MS
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))

/** Detect legitimate AWM inputs once; every caller saves the same canonical model. */
export function normaliseManualTranscriptJson(input: string, videoDurationSeconds?: number): { provider: 'manual'; lang: 'ar'; content: CanonicalChunk[] } {
  if (new TextEncoder().encode(input).length > MAX_TRANSCRIPT_BYTES) throw new Error('Transcript JSON exceeds the 20 MB import budget.')
  let parsed: unknown
  try { parsed = JSON.parse(input) } catch (error) { throw new Error(`Invalid transcript JSON: ${error instanceof Error ? error.message : 'Check quotes, commas and brackets.'}`) }
  const root = object(parsed) ? parsed : {}
  // Both native chapter arrays and episode wrappers occur in AWM content.
  const key = ['content', 'sentences', 'segments', 'scriptBlocks', 'transcript'].find(key => Array.isArray(root[key]))
  const values = Array.isArray(parsed) ? parsed : key ? root[key] : null
  if (!Array.isArray(values) || !values.length) throw new Error('This transcript format could not be recognised. Supply a non-empty content[], sentences[], segments[], or timed AWM block array.')
  const label = key === 'sentences' ? 'Sentence' : 'Segment'
  const starts = values.map((value, index) => {
    if (!object(value)) return undefined
    try {
      if ('offset' in value) return parseTranscriptTime(value.offset)
      if ('start_ms' in value) return parseTranscriptTime(value.start_ms)
      if ('start_seconds' in value) return parseTranscriptTime(value.start_seconds, 'seconds')
      if ('timestamp' in value) return parseTranscriptTime(value.timestamp, 'seconds')
      return undefined
    } catch (error) { throw new Error(`${label} ${index + 1}: invalid start_ms / offset / timestamp. ${error instanceof Error ? error.message : ''}`) }
  })
  let videoEnd: number | undefined
  try {
    if (root.duration_ms !== undefined) videoEnd = parseTranscriptTime(root.duration_ms)
    else if (root.duration_seconds !== undefined) videoEnd = parseTranscriptTime(root.duration_seconds, 'seconds')
    else if (typeof root.duration === 'string') videoEnd = parseTranscriptTime(root.duration)
    else if (videoDurationSeconds !== undefined) videoEnd = parseTranscriptTime(videoDurationSeconds, 'seconds')
  } catch (error) { throw new Error(`Invalid video duration. ${error instanceof Error ? error.message : ''}`) }
  const content = values.map((value, index): CanonicalChunk => {
    const fail = (reason: string): never => { throw new Error(`${label} ${index + 1}: ${reason}`) }
    if (!object(value)) return fail('must be an object.')
    const item = value
    let tokens: Record<string, unknown>[] | undefined
    if (item.tokens !== undefined) {
      if (!Array.isArray(item.tokens)) return fail('tokens must be an array.')
      tokens = item.tokens.map((token, tokenIndex) => {
        if (!object(token) || typeof (token.ar ?? token.arabic ?? token.surface) !== 'string' || !String(token.ar ?? token.arabic ?? token.surface).trim()) return fail(`Token ${tokenIndex + 1} needs ar or arabic text.`)
        if (token.gloss !== undefined && typeof token.gloss !== 'string' || token.english !== undefined && typeof token.english !== 'string') return fail(`Token ${tokenIndex + 1} gloss must be a string.`)
        if (token.start_ms !== undefined || token.end_ms !== undefined) {
          if (!Number.isSafeInteger(token.start_ms) || !Number.isSafeInteger(token.end_ms) || Number(token.start_ms) < 0 || Number(token.end_ms) <= Number(token.start_ms) || Number(token.end_ms) > MAX_TIME) return fail(`Token ${tokenIndex + 1} needs valid start_ms and end_ms.`)
        }
        return token
      })
    }
    const tokenText = tokens?.map(t => String(t.ar ?? t.arabic ?? t.surface)).join(' ')
    const text = item.text ?? item.arabic ?? item.original_text ?? (tokenText ? tokenText + (typeof item.punctuation === 'string' ? item.punctuation : '') : undefined)
    if (typeof text !== 'string' || !text.trim() || !/\p{Script=Arabic}/u.test(text)) return fail('text must contain Arabic (text or arabic, or Arabic tokens).')
    const offset = starts[index]
    if (!Number.isSafeInteger(offset) || Number(offset) < 0) return fail('missing or invalid start_ms / offset / timestamp; timed imports require a start time.')
    let end: number | undefined
    try {
      if (item.end_ms !== undefined) end = parseTranscriptTime(item.end_ms)
      else if (item.end_seconds !== undefined) end = parseTranscriptTime(item.end_seconds, 'seconds')
      else if (item.duration_ms !== undefined) end = Number(offset) + parseTranscriptTime(item.duration_ms)
      // Legacy numeric duration is milliseconds; explicit duration_seconds is seconds.
      else if (item.duration !== undefined) end = Number(offset) + parseTranscriptTime(item.duration)
      else if (item.duration_seconds !== undefined) end = Number(offset) + parseTranscriptTime(item.duration_seconds, 'seconds')
      else if (index < values.length - 1) end = starts[index + 1]
      else end = videoEnd
    } catch (error) { return fail(`invalid end_ms / duration. ${error instanceof Error ? error.message : ''}`) }
    if (end === undefined && index === values.length - 1) throw new MissingTranscriptDuration()
    if (end === undefined) return fail('the next block needs a valid start time to infer this block\'s end.')
    if (end <= Number(offset)) return fail('end time must be after its start. Check timestamp order and that video duration extends beyond the final start.')
    if (end > MAX_TIME) return fail('end time exceeds the 12-hour limit. Numeric offset, start_ms, end_ms and duration use milliseconds; *_seconds fields use seconds.')
    if (tokens?.some(token => token.start_ms !== undefined && (Number(token.start_ms) < Number(offset) || Number(token.end_ms) > Number(end)))) return fail('token timing must fall within its sentence.')
    const english = item.english ?? item.translation ?? item.english_text
    if (english !== undefined && english !== null && typeof english !== 'string') return fail('english / translation must be a string.')
    const metadata: Record<string, unknown> = {}
    if (item.paragraph !== undefined && (!Number.isSafeInteger(item.paragraph) || Number(item.paragraph) < 1)) return fail('paragraph must be a positive integer.')
    for (const key of ['sentence_id', 'sentence_index', 'id', 'index', 'punctuation', 'paragraph']) if (item[key] !== undefined) {
      if (typeof item[key] !== 'string' && typeof item[key] !== 'number') return fail(`${key} must be text or a number.`)
      metadata[key] = item[key]
    }
    return { text, offset: Number(offset), duration: Number(end) - Number(offset), ...(typeof english === 'string' ? { english } : {}), ...(tokens ? { tokens } : {}), ...metadata }
  }).sort((a, b) => a.offset - b.offset)
  const result = { provider: 'manual' as const, lang: 'ar' as const, content }
  if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_TRANSCRIPT_BYTES) throw new Error('Normalised transcript exceeds the 20 MB import budget.')
  return result
}

interface ExportSegment {
  original_text: string
  english_text: string | null
  start_seconds: number
  end_seconds: number
  start_ms?: number | null
  end_ms?: number | null
}

/** Portable canonical JSON; no database or processing metadata. */
export function serialiseTranscriptJson(segments: readonly ExportSegment[]): string {
  const content = segments.map(segment => {
    const offset = segment.start_ms ?? Math.round(segment.start_seconds * 1000)
    const end = segment.end_ms ?? Math.round(segment.end_seconds * 1000)
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset < 0 || end <= offset) {
      throw new Error('This transcript contains invalid segment timing and cannot be exported.')
    }
    return { text: segment.original_text, offset, duration: end - offset, english: segment.english_text ?? '' }
  }).sort((a, b) => a.offset - b.offset)
  return JSON.stringify({ content }, null, 2)
}

export function transcriptJsonFilename(title: string): string {
  const name = title.normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 100)
  return `${name || 'video'}_transcript.json`
}
