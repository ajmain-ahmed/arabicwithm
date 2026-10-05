'use server'

import { z } from 'zod'
import { guardAdmin, getAuthenticatedUserId } from '@/app/actions/auth'
import { requireEntitlement } from '@/app/actions/entitlements'
import { serviceClient } from '@/app/lib/supabase'
import { isMissingDatabaseFeature } from '@/app/lib/databaseErrors'
import { revalidatePath } from 'next/cache'
import { type AudioLanguage } from '@/app/lib/audioUpload'
import { verifyAudioObject } from '@/app/lib/verifyAudioObject'
import { getAudiobookPlaybackUrl, normalizeAudiobookSource, sourceFromAudioRecord } from '@/app/lib/audiobookSource'
import { normalizeYouTubeId } from '@/app/lib/cartoons'

export type AudioSourceType = 'supabase_storage' | 'youtube' | 'external_url'
export interface ChapterAudioSummary {
  chapterId: string
  language: AudioLanguage
  durationSeconds: number | null
  narrator: string | null
}
export interface AdminChapterAudio extends ChapterAudioSummary {
  sourceType: AudioSourceType
  storagePath: string | null
  storageBucket?: string | null
  externalUrl?: string | null
  externalVideoId: string | null
  isPublished: boolean
}
export type ChapterAudioPlayback =
  | { sourceType: 'supabase_storage'; url: string; expiresIn: number; positionSeconds: number }
  | { sourceType: 'youtube'; videoId: string; positionSeconds: number }

const audioInput = z.object({
  chapterId: z.string().uuid(),
  language: z.enum(['ar', 'en']).default('ar'),
  sourceType: z.enum(['supabase_storage', 'youtube', 'external_url']),
  storagePath: z.string().trim().min(1).nullish().transform(value => value ?? null),
  storageBucket: z.string().trim().nullish().transform(value => value ?? null),
  externalUrl: z.string().trim().nullish().transform(value => value ?? null),
  externalVideoId: z.string().trim().nullish().transform((value, context) => {
    if (!value) return null
    const id = normalizeYouTubeId(value)
    if (!id) context.addIssue({ code: 'custom', message: 'Enter a valid YouTube URL or video ID.' })
    return id ?? null
  }),
  durationSeconds: z.number().int().positive().max(2147483647).nullish().transform(value => value ?? null),
  narrator: z.string().trim().max(160).nullish().transform(value => value || null),
  isPublished: z.boolean(),
}).superRefine((value, context) => {
  if (value.sourceType === 'supabase_storage' && (!value.storagePath || value.externalVideoId)) context.addIssue({ code: 'custom', message: 'Choose one uploaded audio file.' })
  if (value.sourceType === 'external_url' && (!value.externalUrl || value.storagePath || value.externalVideoId)) context.addIssue({ code: 'custom', message: 'Enter one HTTPS audio URL.' })
  if (value.sourceType === 'youtube' && (!value.externalVideoId || value.storagePath)) context.addIssue({ code: 'custom', message: 'Enter one valid YouTube URL or video ID.' })
})

function summary(row: Record<string, unknown>): ChapterAudioSummary {
  return { chapterId: String(row.chapter_id), language: row.language === 'en' ? 'en' : 'ar', durationSeconds: typeof row.duration_seconds === 'number' ? row.duration_seconds : null, narrator: typeof row.narrator === 'string' ? row.narrator : null }
}

async function revalidateChapterAudio(chapterId: string): Promise<void> {
  const { data: chapter } = await serviceClient.from('chapters').select('slug, book_id').eq('id', chapterId).maybeSingle()
  if (!chapter) return
  const { data: book } = await serviceClient.from('books').select('slug').eq('id', chapter.book_id).maybeSingle()
  if (!book) return
  revalidatePath(`/books/${encodeURIComponent(book.slug)}`)
  revalidatePath(`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(chapter.slug)}`)
}

export async function fetchPublishedAudioForBook(bookId: string): Promise<ChapterAudioSummary[]> {
  const { data: chapters, error: chapterError } = await serviceClient.from('chapters').select('id').eq('book_id', bookId)
  if (isMissingDatabaseFeature(chapterError)) return []
  if (chapterError) throw new Error('Unable to load audiobook availability.')
  const ids = (chapters ?? []).map((chapter) => chapter.id)
  if (ids.length === 0) return []
  const { data, error } = await serviceClient.from('book_chapter_audio').select('*').eq('is_published', true).in('chapter_id', ids)
  if (isMissingDatabaseFeature(error)) return []
  if (error) throw new Error('Unable to load audiobook availability.')
  return ((data ?? []) as Record<string, unknown>[]).map(summary)
}

export async function fetchPublishedChapterAudio(chapterId: string, language: AudioLanguage = 'ar'): Promise<ChapterAudioSummary | null> {
  // Read legacy rows during deployment before the language migration is applied.
  const { data, error } = await serviceClient.from('book_chapter_audio').select('*').eq('chapter_id', chapterId).eq('is_published', true)
  if (isMissingDatabaseFeature(error)) return null
  if (error) throw new Error('Unable to load audiobook availability.')
  const row = data?.find(row => (row.language ?? 'ar') === language)
  return row ? summary(row as Record<string, unknown>) : null
}

export async function requestChapterAudio(chapterId: string, language: AudioLanguage = 'ar'): Promise<ChapterAudioPlayback> {
  z.enum(['ar', 'en']).parse(language)
  await requireEntitlement('audiobooks')
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to listen.')
  const [{ data: sources, error }, { data: positions }] = await Promise.all([
    serviceClient.from('book_chapter_audio').select('*').eq('chapter_id', chapterId).eq('is_published', true),
    serviceClient.from('book_audio_progress').select('*').eq('user_id', userId).eq('chapter_id', chapterId),
  ])
  const data = sources?.find(row => (row.language ?? 'ar') === language)
  const progress = positions?.find(row => (row.language ?? 'ar') === language)
  if (error || !data) throw new Error('This audiobook chapter is not available.')
  const positionSeconds = Number(progress?.position_seconds ?? 0)
  if (data.source_type === 'youtube' && data.external_video_id) return { sourceType: 'youtube', videoId: data.external_video_id, positionSeconds }
  const playback = await getAudiobookPlaybackUrl(sourceFromAudioRecord(data, process.env.SUPABASE_URL!), serviceClient.storage)
  return { sourceType: 'supabase_storage', ...playback, positionSeconds }
}

export async function saveAudioProgress(chapterId: string, positionSeconds: number, completed: boolean, language: AudioLanguage = 'ar'): Promise<void> {
  z.enum(['ar', 'en']).parse(language)
  await requireEntitlement('audiobooks')
  const userId = await getAuthenticatedUserId()
  if (!userId || !z.string().uuid().safeParse(chapterId).success) throw new Error('Invalid playback progress.')
  const position = Math.max(0, Math.min(Math.trunc(positionSeconds), 86400))
  const { error } = await serviceClient.from('book_audio_progress').upsert({ user_id: userId, chapter_id: chapterId, language, position_seconds: position, completed, updated_at: new Date().toISOString() }, { onConflict: 'user_id,chapter_id,language' })
  if (error) throw new Error('Unable to save audiobook progress.')
}

export async function fetchChapterAudioForAdmin(chapterId: string, language: AudioLanguage = 'ar'): Promise<AdminChapterAudio | null> {
  await guardAdmin()
  const { data: sources, error } = await serviceClient.from('book_chapter_audio').select('*').eq('chapter_id', chapterId)
  if (error) throw new Error(error.message)
  const data = sources?.find(row => (row.language ?? 'ar') === language)
  if (!data) return null
  return { ...summary(data as Record<string, unknown>), sourceType: data.source_type, storagePath: data.storage_path, storageBucket: data.storage_bucket, externalUrl: data.external_url, externalVideoId: data.external_video_id, isPublished: data.is_published }
}

export async function saveChapterAudioForAdmin(input: z.input<typeof audioInput>): Promise<void> {
  await guardAdmin()
  const value = audioInput.parse(input)
  if (value.sourceType !== 'youtube') {
    const normalized = normalizeAudiobookSource(value.externalUrl ?? value.storagePath ?? '', process.env.SUPABASE_URL!, value.storageBucket ?? 'audiobooks')
    value.storagePath = normalized.storagePath
    value.storageBucket = normalized.storageBucket
    value.externalUrl = normalized.externalUrl
    value.sourceType = normalized.externalUrl ? 'external_url' : 'supabase_storage'
    if (value.storagePath) await verifyAudioObject(value.storagePath, value.storageBucket!)
  }
  const { error } = await serviceClient.from('book_chapter_audio').upsert({ chapter_id: value.chapterId, language: value.language, source_type: value.sourceType, storage_path: value.storagePath, storage_bucket: value.storageBucket, external_url: value.externalUrl, external_video_id: value.externalVideoId, duration_seconds: value.durationSeconds, narrator: value.narrator || null, is_published: value.isPublished, updated_at: new Date().toISOString() }, { onConflict: 'chapter_id,language' })
  if (error) throw new Error(/PGRST204|42703|42P10/.test(error.code ?? '') ? 'Audiobook schema is out of date. Apply the audiobook_sources migration before saving audio.' : `Unable to save audiobook: ${error.message}`)
  const persisted = await fetchChapterAudioForAdmin(value.chapterId, value.language)
  if (!persisted || persisted.sourceType !== value.sourceType || persisted.storagePath !== value.storagePath || persisted.storageBucket !== value.storageBucket || persisted.externalUrl !== value.externalUrl || persisted.externalVideoId !== value.externalVideoId || persisted.narrator !== value.narrator || persisted.durationSeconds !== value.durationSeconds || persisted.isPublished !== value.isPublished) {
    throw new Error('The database did not confirm the saved audio source. Keep this dialog open and retry Save.')
  }
  await revalidateChapterAudio(value.chapterId)

}

// Return expected failures as data so production Server Action redaction does
// not hide useful storage/validation messages from the uploader.
export async function saveChapterAudioResult(input: z.input<typeof audioInput>): Promise<{ ok: true } | { ok: false; error: string }> {
  try { await saveChapterAudioForAdmin(input); return { ok: true } }
  catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : 'Unable to save chapter audio.'
    console.error('[chapter audio] Save failed:', message)
    return { ok: false, error: message }
  }
}

export async function deleteChapterAudioForAdmin(chapterId: string, language: AudioLanguage = 'ar'): Promise<void> {
  await guardAdmin()
  z.enum(['ar', 'en']).parse(language)
  if (!z.string().uuid().safeParse(chapterId).success) throw new Error('Invalid chapter.')
  const { error } = await serviceClient.from('book_chapter_audio').delete().eq('chapter_id', chapterId).eq('language', language)
  if (error) throw new Error(error.message)
  await revalidateChapterAudio(chapterId)
}

export async function resolveAudiobookForAdmin(source: string): Promise<{ ok: true; url: string; storagePath: string | null; storageBucket: string | null; externalUrl: string | null } | { ok: false; error: string }> {
  try {
    await guardAdmin()
    const normalized = normalizeAudiobookSource(source, process.env.SUPABASE_URL!)
    if (normalized.storagePath) await verifyAudioObject(normalized.storagePath, normalized.storageBucket!)
    const playback = await getAudiobookPlaybackUrl(normalized, serviceClient.storage)
    return { ok: true, ...normalized, url: playback.url }
  } catch (cause) { return { ok: false, error: cause instanceof Error ? cause.message : 'Unable to link audio.' } }
}
