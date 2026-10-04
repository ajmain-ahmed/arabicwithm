import type { CanonicalChunk } from '@/app/lib/manualTranscripts'

export function normaliseManualTranscriptJson(input: string): { provider: 'manual'; lang: 'ar'; content: CanonicalChunk[] } {
  if (new TextEncoder().encode(input).length > 1048576) throw new Error('Transcript JSON must be at most 1 MB.')
  let parsed: unknown
  try { parsed = JSON.parse(input) } catch (error) { throw new Error(`Invalid transcript JSON: ${error instanceof Error ? error.message : 'Check quotes, commas and brackets.'}`) }
  const values = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>).content : null
  if (!Array.isArray(values) || !values.length || values.length > 5000) throw new Error('Supply an object with a content array containing 1 to 5,000 timed segments.')
  const content = values.map((value, index): CanonicalChunk => {
    const fail = (reason: string): never => { throw new Error(`Segment ${index + 1}: ${reason}`) }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('must be an object.')
    const item = value as Record<string, unknown>
    if (typeof item.text !== 'string' || !item.text.trim() || item.text.length > 10000 || !/[\u0621-\u063a\u0641-\u064a]/.test(item.text)) return fail('text must contain Arabic, at most 10,000 characters.')
    if (typeof item.offset !== 'number' || !Number.isInteger(item.offset) || item.offset < 0) return fail('offset must be a non-negative integer in milliseconds.')
    if (typeof item.duration !== 'number' || !Number.isInteger(item.duration) || item.duration <= 0 || item.offset + item.duration > 43200000) return fail('duration must be a positive integer in milliseconds; end must be within 12 hours.')
    if (item.english !== undefined && (typeof item.english !== 'string' || item.english.length > 10000)) return fail('english must be a string of at most 10,000 characters.')
    return { text: item.text, offset: item.offset, duration: item.duration, ...(typeof item.english === 'string' ? { english: item.english } : {}) }
  }).sort((a, b) => a.offset - b.offset)
  const result = { provider: 'manual' as const, lang: 'ar' as const, content }
  if (new TextEncoder().encode(JSON.stringify(result)).length > 1048576) throw new Error('Normalized transcript exceeds the 1 MB limit.')
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
