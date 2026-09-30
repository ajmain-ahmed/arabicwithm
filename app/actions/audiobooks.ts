'use server'

import { z } from 'zod'
import { guardAdmin, getAuthenticatedUserId } from '@/app/actions/auth'
import { requireEntitlement } from '@/app/actions/entitlements'
import { serviceClient } from '@/app/lib/supabase'
import { isMissingDatabaseFeature } from '@/app/lib/databaseErrors'
import { revalidatePath } from 'next/cache'

export type AudioSourceType = 'supabase_storage' | 'youtube'
export interface ChapterAudioSummary {
  chapterId: string
  durationSeconds: number | null
  narrator: string | null
}
export interface AdminChapterAudio extends ChapterAudioSummary {
  sourceType: AudioSourceType
  storagePath: string | null
  externalVideoId: string | null
  isPublished: boolean
}
export type ChapterAudioPlayback =
  | { sourceType: 'supabase_storage'; url: string; expiresIn: number; positionSeconds: number }
  | { sourceType: 'youtube'; videoId: string; positionSeconds: number }

const audioInput = z.object({
  chapterId: z.string().uuid(),
  sourceType: z.enum(['supabase_storage', 'youtube']),
  storagePath: z.string().regex(/^[0-9a-f-]{36}\/audio\.(mp3|m4a)$/i).nullable(),
  externalVideoId: z.string().trim().regex(/^[A-Za-z0-9_-]{11}$/).nullable(),
  durationSeconds: z.number().int().positive().max(86400).nullable(),
  narrator: z.string().trim().max(160).nullable(),
  isPublished: z.boolean(),
}).superRefine((value, context) => {
  if (value.sourceType === 'supabase_storage' && (!value.storagePath || value.externalVideoId)) context.addIssue({ code: 'custom', message: 'Choose one uploaded audio file.' })
  if (value.sourceType === 'youtube' && (!value.externalVideoId || value.storagePath)) context.addIssue({ code: 'custom', message: 'Enter one valid YouTube video ID.' })
})

function summary(row: Record<string, unknown>): ChapterAudioSummary {
  return { chapterId: String(row.chapter_id), durationSeconds: typeof row.duration_seconds === 'number' ? row.duration_seconds : null, narrator: typeof row.narrator === 'string' ? row.narrator : null }
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
  const { data, error } = await serviceClient.from('book_chapter_audio').select('chapter_id, duration_seconds, narrator').eq('is_published', true).in('chapter_id', ids)
  if (isMissingDatabaseFeature(error)) return []
  if (error) throw new Error('Unable to load audiobook availability.')
  return ((data ?? []) as Record<string, unknown>[]).map(summary)
}

export async function fetchPublishedChapterAudio(chapterId: string): Promise<ChapterAudioSummary | null> {
  const { data, error } = await serviceClient.from('book_chapter_audio').select('chapter_id, duration_seconds, narrator').eq('chapter_id', chapterId).eq('is_published', true).maybeSingle()
  if (isMissingDatabaseFeature(error)) return null
  if (error) throw new Error('Unable to load audiobook availability.')
  return data ? summary(data as Record<string, unknown>) : null
}

export async function requestChapterAudio(chapterId: string): Promise<ChapterAudioPlayback> {
  await requireEntitlement('audiobooks')
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to listen.')
  const [{ data, error }, { data: progress }] = await Promise.all([
    serviceClient.from('book_chapter_audio').select('*').eq('chapter_id', chapterId).eq('is_published', true).maybeSingle(),
    serviceClient.from('book_audio_progress').select('position_seconds').eq('user_id', userId).eq('chapter_id', chapterId).maybeSingle(),
  ])
  if (error || !data) throw new Error('This audiobook chapter is not available.')
  const positionSeconds = Number(progress?.position_seconds ?? 0)
  if (data.source_type === 'youtube' && data.external_video_id) return { sourceType: 'youtube', videoId: data.external_video_id, positionSeconds }
  if (!data.storage_path) throw new Error('This audiobook chapter is not available.')
  const expiresIn = 15 * 60
  const { data: signed, error: signedError } = await serviceClient.storage.from('audiobooks').createSignedUrl(data.storage_path, expiresIn)
  if (signedError || !signed?.signedUrl) throw new Error('Unable to start audiobook playback.')
  return { sourceType: 'supabase_storage', url: signed.signedUrl, expiresIn, positionSeconds }
}

export async function saveAudioProgress(chapterId: string, positionSeconds: number, completed: boolean): Promise<void> {
  await requireEntitlement('audiobooks')
  const userId = await getAuthenticatedUserId()
  if (!userId || !z.string().uuid().safeParse(chapterId).success) throw new Error('Invalid playback progress.')
  const position = Math.max(0, Math.min(Math.trunc(positionSeconds), 86400))
  const { error } = await serviceClient.from('book_audio_progress').upsert({ user_id: userId, chapter_id: chapterId, position_seconds: position, completed, updated_at: new Date().toISOString() }, { onConflict: 'user_id,chapter_id' })
  if (error) throw new Error('Unable to save audiobook progress.')
}

export async function fetchChapterAudioForAdmin(chapterId: string): Promise<AdminChapterAudio | null> {
  await guardAdmin()
  const { data, error } = await serviceClient.from('book_chapter_audio').select('*').eq('chapter_id', chapterId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return { ...summary(data as Record<string, unknown>), sourceType: data.source_type, storagePath: data.storage_path, externalVideoId: data.external_video_id, isPublished: data.is_published }
}

export async function saveChapterAudioForAdmin(input: z.input<typeof audioInput>): Promise<void> {
  await guardAdmin()
  const value = audioInput.parse(input)
  const { error } = await serviceClient.from('book_chapter_audio').upsert({ chapter_id: value.chapterId, source_type: value.sourceType, storage_path: value.storagePath, external_video_id: value.externalVideoId, duration_seconds: value.durationSeconds, narrator: value.narrator || null, is_published: value.isPublished, updated_at: new Date().toISOString() }, { onConflict: 'chapter_id' })
  if (error) throw new Error(error.message)
  await revalidateChapterAudio(value.chapterId)
}

export async function deleteChapterAudioForAdmin(chapterId: string): Promise<void> {
  await guardAdmin()
  const { error } = await serviceClient.from('book_chapter_audio').delete().eq('chapter_id', chapterId)
  if (error) throw new Error(error.message)
  await revalidateChapterAudio(chapterId)
}
