import 'server-only'
import { serviceClient } from '@/app/lib/supabase'
import { asRecord, list, string, type EnrichmentSource, type SourceKind } from './types'

export async function loadEnrichmentSource(
  kind: SourceKind,
  id: string,
): Promise<EnrichmentSource | null> {
  if (kind === 'chapter' || kind === 'episode') {
    const table = kind === 'chapter' ? 'chapters' : 'episodes'
    const { data, error } = await serviceClient.from(table).select('*').eq('id', id).maybeSingle()
    if (error) throw new Error('source_read_failed')
    if (!data) return null
    const row = data as Record<string, unknown>
    const parentId = String(row[kind === 'chapter' ? 'book_id' : 'show_id'])
    const { data: parent, error: parentError } = await serviceClient
      .from(kind === 'chapter' ? 'books' : 'shows')
      .select('title,slug,level')
      .eq('id', parentId)
      .maybeSingle()
    if (parentError) throw new Error('source_parent_read_failed')
    if (!parent) throw new Error('source_parent_unavailable')
    return {
      kind,
      id,
      title: string(row.title),
      parentId,
      parentTitle: parent?.title,
      url:
        kind === 'chapter'
          ? `/admin/books/preview/${id}`
          : `/cartoons/${parent?.slug}/${string(row.slug)}`,
      originalUrl:
        kind === 'episode' && row.youtube_id
          ? `https://www.youtube.com/watch?v=${String(row.youtube_id)}`
          : undefined,
      language: 'ar',
      level: string(row.level ?? parent?.level),
      content: row[kind === 'chapter' ? 'content' : 'transcript'],
    }
  }
  if (kind === 'vocabulary') {
    const { data, error } = await serviceClient
      .from('vocabulary')
      .select('word_id,word_di,word_tr,level,examples,definitions')
      .eq('word_id', id)
      .maybeSingle()
    if (error) throw new Error('source_read_failed')
    const row = asRecord(data)
    return row
      ? {
          kind,
          id,
          title: string(row.word_di),
          url: '/admin/phrases',
          language: 'ar',
          level: string(row.level),
          content: row,
        }
      : null
  }
  const { data, error } = await serviceClient
    .from('youtube_transcripts')
    .select('id,title,status,source_origin,raw_transcript,canonical_transcript,canonical_url')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error('source_read_failed')
  if (
    !data ||
    data.status !== 'ready' ||
    !['awm', 'website_admin_transcript'].includes(string(data.source_origin))
  )
    return null
  const language = asRecord(data.raw_transcript)?.source_language === 'en' ? 'en' : 'ar'
  const segments: unknown[] = []
  const unitKeys: string[] = []
  for (let offset = 0; ; offset += 500) {
    const { data: batch, error: segmentError } = await serviceClient
      .from('transcript_segments')
      .select('id,position,start_seconds,original_text,english_text,canonical_paragraph')
      .eq('transcript_id', id)
      .order('position')
      .range(offset, offset + 499)
    if (segmentError) throw new Error('source_segments_read_failed')
    for (const segment of batch ?? []) {
      const canonical = asRecord(segment.canonical_paragraph)
      unitKeys.push(`segment/${String(segment.id)}`)
      segments.push(
        canonical
          ? { ...canonical, timestamp: canonical.timestamp ?? String(segment.start_seconds) }
          : language === 'en'
            ? {
                translation: segment.english_text,
                tokens: [{ english: segment.original_text }],
                timestamp: String(segment.start_seconds),
              }
            : {
                arabic: segment.original_text,
                translation: segment.english_text,
                timestamp: String(segment.start_seconds),
              },
      )
    }
    if ((batch?.length ?? 0) < 500) break
  }
  const root = asRecord(data.raw_transcript)
  const fallback = list(data.canonical_transcript).length
    ? data.canonical_transcript
    : (root?.content ?? data.raw_transcript)
  return {
    kind,
    id,
    title: data.title ?? 'Transcript',
    url: `/transcripts/${id}`,
    originalUrl: data.canonical_url ?? undefined,
    language,
    unitKeys: segments.length ? unitKeys : undefined,
    content: segments.length ? segments : fallback,
  }
}
