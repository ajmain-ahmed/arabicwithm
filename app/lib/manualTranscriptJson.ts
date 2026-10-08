import type { CanonicalChunk } from '@/app/lib/manualTranscripts'
import { MAX_TRANSCRIPT_TIME_MS, MissingTranscriptDuration, parseTranscriptTime } from '@/app/lib/transcriptTiming'

/** Resource budget for authenticated imports, not a per-sentence/count restriction. */
export const MAX_TRANSCRIPT_BYTES = 20 * 1024 * 1024
const MAX_TIME = MAX_TRANSCRIPT_TIME_MS
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))

const contentFields = new Set(['text', 'arabic', 'original_text', 'english', 'translation', 'english_text', 'tokens', 'offset', 'start_ms', 'start_seconds', 'timestamp', 'end_ms', 'end_seconds', 'duration_ms', 'duration', 'duration_seconds'])

function explicitEnd(item: Record<string, unknown>, start: number): number | undefined {
  if (item.end_ms !== undefined) return parseTranscriptTime(item.end_ms)
  if (item.end_seconds !== undefined) return parseTranscriptTime(item.end_seconds, 'seconds')
  if (item.duration_ms !== undefined) return start + parseTranscriptTime(item.duration_ms)
  if (item.duration !== undefined) return start + parseTranscriptTime(item.duration)
  if (item.duration_seconds !== undefined) return start + parseTranscriptTime(item.duration_seconds, 'seconds')
}

/** Merge only adjacent simultaneous captions, retaining every supplied token. */
function mergeSimultaneousSegments(items: Record<string, unknown>[], start: number, label: string, numbers: number[]): Record<string, unknown> {
  const fail = (reason: string): never => { throw new Error(`${label}s ${numbers.join(', ')}: duplicate timestamp ${start} ms cannot be merged safely: ${reason}`) }
  const metadata: Record<string, unknown> = Object.create(null)
  const texts: string[] = [], translations: string[] = [], tokens: unknown[] = []
  const tokenBearing = items.filter(item => item.tokens !== undefined).length
  if (tokenBearing && tokenBearing !== items.length) fail('some blocks have tokens and others do not. Supply matching token data or correct the timestamps.')
  let end: number | undefined
  for (const item of items) {
    const itemTokens = item.tokens
    if (itemTokens !== undefined && !Array.isArray(itemTokens)) fail('tokens must be an array.')
    const words = Array.isArray(itemTokens) ? itemTokens : []
    const tokenText = words.map(token => object(token) ? token.ar ?? token.arabic ?? token.surface : '').join(' ')
    const text = item.text ?? item.arabic ?? item.original_text ?? (tokenText ? tokenText + (typeof item.punctuation === 'string' ? item.punctuation : '') : undefined)
    if (typeof text !== 'string' || !text.trim()) fail('a block has no Arabic text.')
    texts.push(text as string)
    const english = item.english ?? item.translation ?? item.english_text
    if (english !== undefined && english !== null && typeof english !== 'string') fail('translation must be a string.')
    if (typeof english === 'string' && english.trim()) translations.push(english)
    tokens.push(...words)
    let itemEnd: number | undefined
    try { itemEnd = explicitEnd(item, start) } catch { return fail('an explicit end or duration is invalid.') }
    if (itemEnd !== undefined) {
      if (itemEnd <= start) fail('an explicit end is not after the shared start.')
      if (end !== undefined && end !== itemEnd) fail('explicit end times disagree. Correct the intervals instead of merging them.')
      end = itemEnd
    }
    for (const [key, value] of Object.entries(item)) {
      if (contentFields.has(key)) continue
      if ((key === 'plain' || key === 'arabic_plain') && typeof value === 'string') {
        metadata[key] = metadata[key] ? `${metadata[key]} ${value}` : value
      } else if (metadata[key] !== undefined && JSON.stringify(metadata[key]) !== JSON.stringify(value)) {
        fail(`metadata field "${key}" differs. Keep its meaning by correcting the timestamps or grouping explicitly.`)
      } else metadata[key] = value
    }
  }
  return {...metadata,text:texts.join(' '),offset:start,...(end !== undefined ? {end_ms:end} : {}),...(translations.length ? {english:translations.join(' ')} : {}),...(tokenBearing ? {tokens} : {})}
}

/** Detect legitimate AWM inputs once; every caller saves the same canonical model. */
export function normaliseManualTranscriptJson(input: string, videoDurationSeconds?: number): { provider: 'manual'; lang: 'ar'; content: CanonicalChunk[] } {
  if (new TextEncoder().encode(input).length > MAX_TRANSCRIPT_BYTES) throw new Error('Transcript JSON exceeds the 20 MB import budget.')
  let parsed: unknown
  try { parsed = JSON.parse(input) } catch (error) { throw new Error(`Invalid transcript JSON: ${error instanceof Error ? error.message : 'Check quotes, commas and brackets.'}`) }
  const root = object(parsed) ? parsed : {}
  // Both native chapter arrays and episode wrappers occur in AWM content.
  const key = ['content', 'sentences', 'segments', 'scriptBlocks', 'transcript'].find(key => Array.isArray(root[key]))
  const detectedValues = Array.isArray(parsed) ? parsed : key ? root[key] : null
  if (!Array.isArray(detectedValues) || !detectedValues.length) throw new Error('This transcript format could not be recognised. Supply a non-empty content[], sentences[], segments[], or timed AWM block array.')
  let values: unknown[] = detectedValues
  const label = key === 'sentences' ? 'Sentence' : 'Segment'
  const issues: string[] = []
  let starts = values.map((value, index) => {
    if (!object(value)) return undefined
    try {
      if ('offset' in value) return parseTranscriptTime(value.offset)
      if ('start_ms' in value) return parseTranscriptTime(value.start_ms)
      if ('start_seconds' in value) return parseTranscriptTime(value.start_seconds, 'seconds')
      if ('timestamp' in value) return parseTranscriptTime(value.timestamp, 'seconds')
      return undefined
    } catch (error) { issues.push(`${label} ${index + 1}: invalid start_ms / offset / timestamp. ${error instanceof Error ? error.message : ''}`); return undefined }
  })
  const sourceNumbers = values.map((_, index) => [index + 1])
  for (let index = 0; index < values.length; index++) {
    if (!object(values[index])) issues.push(`${label} ${index + 1}: must be an object.`)
    if (starts[index] === undefined) issues.push(`${label} ${index + 1}: missing or invalid start_ms / offset / timestamp; timed imports require a start time.`)
    const value = values[index]
    const start = starts[index]
    if (object(value) && start !== undefined) {
      try {
        const end = explicitEnd(value,start)
        if (end !== undefined && end <= start) issues.push(`${label} ${index + 1}: end time must be after its start.`)
        if (end !== undefined && end > MAX_TIME) issues.push(`${label} ${index + 1}: end time exceeds the 12-hour limit.`)
      } catch (error) { issues.push(`${label} ${index + 1}: invalid end_ms / duration. ${error instanceof Error ? error.message : ''}`) }
    }
    if (index > 0 && starts[index] !== undefined && starts[index - 1] !== undefined && starts[index]! < starts[index - 1]!) {
      issues.push(`${label} ${index + 1}: timestamp-order error; start ${starts[index]} ms precedes ${label.toLowerCase()} ${index}'s start ${starts[index - 1]} ms. Check timestamp order; timestamps have not been changed.`)
    }
  }
  if (issues.length) throw new Error([...new Set(issues)].join('\n'))
  const grouped: unknown[] = [], groupedStarts: (number | undefined)[] = [], groupedNumbers: number[][] = []
  for (let index = 0; index < values.length;) {
    let next = index + 1
    while (next < values.length && starts[next] === starts[index]) next++
    const numbers = sourceNumbers.slice(index,next).flat()
    grouped.push(next === index + 1 ? values[index] : mergeSimultaneousSegments(values.slice(index,next) as Record<string,unknown>[],starts[index]!,label,numbers))
    groupedStarts.push(starts[index]);groupedNumbers.push(numbers)
    index = next
  }
  values = grouped;starts = groupedStarts
  let videoEnd: number | undefined
  try {
    if (root.duration_ms !== undefined) videoEnd = parseTranscriptTime(root.duration_ms)
    else if (root.duration_seconds !== undefined) videoEnd = parseTranscriptTime(root.duration_seconds, 'seconds')
    else if (typeof root.duration === 'string') videoEnd = parseTranscriptTime(root.duration)
    else if (videoDurationSeconds !== undefined) videoEnd = parseTranscriptTime(videoDurationSeconds, 'seconds')
  } catch (error) { throw new Error(`Invalid video duration. ${error instanceof Error ? error.message : ''}`) }
  let missingDuration = false
  const content = values.flatMap((value, index): CanonicalChunk[] => {
    try {
      const fail = (reason: string): never => { throw new Error(`${label} ${groupedNumbers[index].join(', ')}: ${reason}`) }
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
      const english = item.english ?? item.translation ?? item.english_text
      if (english !== undefined && english !== null && typeof english !== 'string') return fail('english / translation must be a string.')
      const metadata: Record<string, unknown> = Object.fromEntries(Object.entries(item).filter(([key]) => !contentFields.has(key)))
      if (item.paragraph !== undefined && (!Number.isSafeInteger(item.paragraph) || Number(item.paragraph) < 1)) return fail('paragraph must be a positive integer.')
      for (const key of ['sentence_id', 'sentence_index', 'id', 'index', 'punctuation', 'paragraph', 'plain', 'arabic_plain']) if (item[key] !== undefined) {
        if (typeof item[key] !== 'string' && typeof item[key] !== 'number') return fail(`${key} must be text or a number.`)
        metadata[key] = item[key]
      }
      let end: number | undefined
      try {
        end = explicitEnd(item, Number(offset))
        if (end === undefined) end = index < values.length - 1 ? starts[index + 1] : videoEnd
      } catch (error) { return fail(`invalid end_ms / duration. ${error instanceof Error ? error.message : ''}`) }
      if (end === undefined && index === values.length - 1) throw new MissingTranscriptDuration()
      if (end === undefined) return fail('the next block needs a valid start time to infer this block\'s end.')
      if (end <= Number(offset)) return fail('end time must be after its start. Check timestamp order and that video duration extends beyond the final start.')
      if (end > MAX_TIME) return fail('end time exceeds the 12-hour limit. Numeric offset, start_ms, end_ms and duration use milliseconds; *_seconds fields use seconds.')
      if (tokens?.some(token => token.start_ms !== undefined && (Number(token.start_ms) < Number(offset) || Number(token.end_ms) > Number(end)))) return fail('token timing must fall within its sentence.')
      return [{ text, offset: Number(offset), duration: Number(end) - Number(offset), ...(typeof english === 'string' ? { english } : {}), ...(tokens ? { tokens } : {}), ...metadata }]
    } catch (error) {
      if (error instanceof MissingTranscriptDuration) missingDuration = true
      else issues.push(error instanceof Error ? error.message : `${label} ${groupedNumbers[index].join(', ')}: invalid data.`)
      return []
    }
  })
  if (issues.length) {
    throw new Error([...new Set(issues)].join('\n'))
  }
  if (missingDuration) throw new MissingTranscriptDuration()
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
  position?: number
  canonical_paragraph?: unknown
}

/** Portable canonical JSON; no database or processing metadata. */
export function serialiseTranscriptJson(segments: readonly ExportSegment[], raw?: unknown): string {
  const sources = object(raw) && Array.isArray(raw.content) ? [...raw.content].filter(object).sort((a, b) => Number(a.offset) - Number(b.offset)) : []
  const content = segments.map((segment, index) => {
    const offset = segment.start_ms ?? Math.round(segment.start_seconds * 1000)
    const end = segment.end_ms ?? Math.round(segment.end_seconds * 1000)
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset < 0 || end <= offset) {
      throw new Error('This transcript contains invalid segment timing and cannot be exported.')
    }
    const source = sources[segment.position ?? index]
    const metadata: Record<string, unknown> = Object.create(null)
    if (source && source.text === segment.original_text && source.offset === offset && source.duration === end - offset) {
      for (const [key,value] of Object.entries(source)) if (!contentFields.has(key) || key === 'tokens') metadata[key] = value
    }
    const canonical = segment.canonical_paragraph
    if (object(canonical)) {
      if (Array.isArray(canonical.tokens)) {
        const canonicalTokens = canonical.tokens
        const storedTokens = metadata.tokens
        if (!Array.isArray(storedTokens) || !storedTokens.length) metadata.tokens = canonical.tokens
        else if (storedTokens.length === canonical.tokens.length) metadata.tokens = storedTokens.map((token, index) => {
          const enriched = canonicalTokens[index]
          // Merge only exact token matches; retain original IDs, glosses and timing.
          return object(token) && object(enriched) && (token.ar ?? token.arabic ?? token.surface) === enriched.arabic ? { ...enriched, ...token } : token
        })
      }
      if (metadata.paragraph === undefined && canonical.paragraph !== undefined) metadata.paragraph = canonical.paragraph
    }
    return { ...metadata, text: segment.original_text, offset, duration: end - offset, english: segment.english_text ?? (object(canonical) && typeof canonical.translation === 'string' ? canonical.translation : '') }
  }).sort((a, b) => a.offset - b.offset)
  return JSON.stringify({ content }, null, 2)
}

export function transcriptJsonFilename(title: string): string {
  const name = title.normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 100)
  return `${name || 'video'}_transcript.json`
}
