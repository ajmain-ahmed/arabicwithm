// @vitest-environment node
// Opt-in: node --env-file=.env.local node_modules/vitest/vitest.mjs run
// app/actions/audiobooks.live.test.ts (set AWM_LIVE_AUDIO_FILE to a real MP3).
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID, createHash } from 'node:crypto'
import { File } from 'node:buffer'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// This verifies the real Storage/database pipeline with service credentials;
// authorization remains covered separately by the server-boundary tests.
vi.mock('@/app/actions/auth', () => ({ guardAdmin: async () => {}, getAuthenticatedUserId: async () => 'test' }))
vi.mock('@/app/actions/entitlements', () => ({ requireEntitlement: async () => {} }))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
import { serviceClient } from '@/app/lib/supabase'
import { verifyAudioObject } from '@/app/lib/verifyAudioObject'
import { audioUploadBody } from '@/app/lib/audioUpload'
import { fetchChapterAudioForAdmin, saveChapterAudioResult } from './audiobooks'

describe.skipIf(!process.env.AWM_LIVE_AUDIO_FILE)('live private audiobook persistence', () => {
  const chapterId = randomUUID()
  const paths: string[] = []
  let bytes: Buffer
  beforeAll(async () => {
    bytes = readFileSync(process.env.AWM_LIVE_AUDIO_FILE!)
    const { data: book, error } = await serviceClient.from('books').select('id').limit(1).single()
    if (error || !book) throw new Error('A book is required for the temporary chapter.')
    const { error: createError } = await serviceClient.from('chapters').insert({ id: chapterId, book_id: book.id, slug: `audio-verification-${chapterId}`, title: 'Temporary private audio verification', chapter_number: 999999, content: [] })
    if (createError) throw createError
  })
  afterAll(async () => {
    const { error } = await serviceClient.from('chapters').delete().eq('id', chapterId)
    if (error) throw error
    if (paths.length) {
      const { error: cleanupError } = await serviceClient.storage.from('audiobooks').remove(paths)
      if (cleanupError) throw cleanupError
    }
  })

  it.each(['ar', 'en'] as const)('uploads %s MP3 bytes, saves null metadata, reloads, and downloads playable bytes', async (uploadLanguage) => {
    const browser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
    const path = `${chapterId}/${uploadLanguage}/${randomUUID()}.mp3`
    paths.push(path)
    const { data: token, error: tokenError } = await serviceClient.storage.from('audiobooks').createSignedUploadUrl(path)
    if (tokenError || !token) throw tokenError ?? new Error('Missing upload authorization.')
    const file = new File([bytes], 'verification.mp3', { type: uploadLanguage === 'ar' ? 'audio/mp3' : '' }) as unknown as globalThis.File
    const { error: uploadError } = await browser.storage.from('audiobooks').uploadToSignedUrl(path, token.token, audioUploadBody(file, 'mp3'), { contentType: 'audio/mpeg' })
    if (uploadError) throw uploadError
    await verifyAudioObject(path)
    const saved = await saveChapterAudioResult({ chapterId, language: uploadLanguage, sourceType: 'supabase_storage', storagePath: path, externalVideoId: null, isPublished: false })
    expect(saved).toEqual({ ok: true })
    const reloaded = await fetchChapterAudioForAdmin(chapterId, uploadLanguage)
    expect(reloaded).toEqual(expect.objectContaining({ storagePath: path, narrator: null, durationSeconds: null }))
    const { data: signed, error: signError } = await serviceClient.storage.from('audiobooks').createSignedUrl(reloaded!.storagePath!, 60)
    if (signError || !signed) throw signError ?? new Error('Missing playback URL.')
    const response = await fetch(signed.signedUrl)
    expect(response.status).toBe(200)
    const received = Buffer.from(await response.arrayBuffer())
    expect(createHash('sha256').update(received).digest('hex')).toBe(createHash('sha256').update(bytes).digest('hex'))
    if (process.env.AWM_LIVE_AUDIO_DOWNLOAD) writeFileSync(process.env.AWM_LIVE_AUDIO_DOWNLOAD, received)
    const { error: publicError } = await browser.storage.from('audiobooks').download(path)
    expect(publicError).not.toBeNull()
    const range = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-15' } })
    expect(range.status).toBe(206)
    expect(new Uint8Array(await range.arrayBuffer()).byteLength).toBe(16)
    for (const language of ['ar', 'en'] as const) {
      for (const video of ['https://www.youtube.com/watch?v=yFeE2MvsrJM', 'https://youtu.be/yFeE2MvsrJM', 'yFeE2MvsrJM']) {
        expect(await saveChapterAudioResult({ chapterId, language, sourceType: 'youtube', externalVideoId: video, isPublished: false })).toEqual({ ok: true })
        expect(await fetchChapterAudioForAdmin(chapterId, language)).toEqual(expect.objectContaining({ externalVideoId: 'yFeE2MvsrJM', narrator: null, durationSeconds: null }))
      }
      expect(await saveChapterAudioResult({ chapterId, language, sourceType: 'youtube', externalVideoId: 'yFeE2MvsrJM', narrator: 'Test narrator', durationSeconds: 120, isPublished: false })).toEqual({ ok: true })
      expect(await fetchChapterAudioForAdmin(chapterId, language)).toEqual(expect.objectContaining({ narrator: 'Test narrator', durationSeconds: 120 }))
    }
    console.log(`Verified ${bytes.length} MP3 bytes: signed upload, stored-header verification, database save, reload, signed playback download, and private access denial.`)
  }, 120000)
})
