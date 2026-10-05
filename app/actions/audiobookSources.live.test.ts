// @vitest-environment node
// Opt in with AWM_LIVE_AUDIO_CHECK=1 and node --env-file=.env.local.
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
vi.mock('@/app/actions/auth', () => ({ guardAdmin: async () => {}, getAuthenticatedUserId: async () => 'test' }))
vi.mock('@/app/actions/entitlements', () => ({ requireEntitlement: async () => {} }))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
import { serviceClient } from '@/app/lib/supabase'
import { deleteChapterAudioForAdmin, fetchChapterAudioForAdmin, fetchPublishedChapterAudio, requestChapterAudio, saveChapterAudioResult } from './audiobooks'

describe.skipIf(process.env.AWM_LIVE_AUDIO_CHECK !== '1')('live stable audiobook sources', () => {
  const chapterId = randomUUID()
  const paths: string[] = []
  // One second of PCM silence: a real browser-playable WAV, no user data.
  const bytes = Buffer.alloc(16044)
  bytes.write('RIFF'); bytes.writeUInt32LE(16036, 4); bytes.write('WAVEfmt ', 8)
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34)
  bytes.write('data', 36); bytes.writeUInt32LE(16000, 40)
  beforeAll(async () => {
    const { data: book, error } = await serviceClient.from('books').select('id').limit(1).single()
    if (error || !book) throw error ?? new Error('No book for temporary test.')
    const { error: insertError } = await serviceClient.from('chapters').insert({ id: chapterId, book_id: book.id, slug: `audio-source-check-${chapterId}`, title: 'Temporary audiobook source verification', chapter_number: 999999, content: [] })
    if (insertError) throw insertError
  })
  afterAll(async () => {
    const { error } = await serviceClient.from('chapters').delete().eq('id', chapterId)
    if (error) throw error
    if (paths.length) {
      const { error: storageError } = await serviceClient.storage.from('audiobooks').remove(paths)
      if (storageError) throw storageError
    }
  })
  it('handles no audio, both signed uploads, nested paths, replacement, legacy sources and removal', async () => {
    expect(await fetchPublishedChapterAudio(chapterId)).toBeNull()
    const browser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
    for (const language of ['ar', 'en'] as const) {
      const path = `${chapterId}/${language}/${randomUUID()}.wav`
      paths.push(path)
      const { data: token, error } = await serviceClient.storage.from('audiobooks').createSignedUploadUrl(path)
      if (error || !token) throw error ?? new Error('Missing token')
      const { error: uploadError } = await browser.storage.from('audiobooks').uploadToSignedUrl(path, token.token, bytes, { contentType: 'audio/wav' })
      if (uploadError) throw uploadError
      expect(await saveChapterAudioResult({ chapterId, language, sourceType: 'supabase_storage', storagePath: `audiobooks/${path}`, durationSeconds: 1, isPublished: true })).toEqual({ ok: true })
      const playback = await requestChapterAudio(chapterId, language)
      if (playback.sourceType !== 'supabase_storage') throw new Error('Incorrect player')
      expect(Buffer.from(await (await fetch(playback.url)).arrayBuffer())).toEqual(bytes)
      expect((await browser.storage.from('audiobooks').download(path)).error).not.toBeNull()
    }
    const nested = `arabic/audio-source-check-${chapterId}/odd-filename`
    paths.push(nested)
    const uploaded = await serviceClient.storage.from('audiobooks').upload(nested, bytes, { contentType: 'audio/wav' })
    if (uploaded.error) throw uploaded.error
    const signed = await serviceClient.storage.from('audiobooks').createSignedUrl(nested, 60)
    if (!signed.data) throw signed.error
    expect(await saveChapterAudioResult({ chapterId, sourceType: 'supabase_storage', storagePath: signed.data.signedUrl, isPublished: true })).toEqual({ ok: true })
    expect((await fetchChapterAudioForAdmin(chapterId))?.storagePath).toBe(nested)
    expect((await fetchChapterAudioForAdmin(chapterId))?.durationSeconds).toBeNull()
    expect((await serviceClient.from('book_chapter_audio').select('id').eq('chapter_id', chapterId)).data).toHaveLength(2)
    // A legacy row has no explicit bucket; it still resolves through the shared service.
    const legacy = await serviceClient.from('book_chapter_audio').update({ storage_bucket: null }).eq('chapter_id', chapterId).eq('language', 'ar')
    if (legacy.error) throw legacy.error
    expect((await requestChapterAudio(chapterId)).sourceType).toBe('supabase_storage')
    expect(await saveChapterAudioResult({ chapterId, sourceType: 'external_url', externalUrl: 'https://example.com/image.png', isPublished: true })).toEqual(expect.objectContaining({ ok: false }))
    await deleteChapterAudioForAdmin(chapterId)
    expect(await fetchPublishedChapterAudio(chapterId)).toBeNull()
    expect(await fetchPublishedChapterAudio(chapterId, 'en')).not.toBeNull()
    expect((await serviceClient.storage.from('audiobooks').info(nested)).error).toBeNull()
  }, 60000)
})
