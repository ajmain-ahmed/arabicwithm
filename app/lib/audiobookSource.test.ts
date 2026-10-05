import { describe, expect, it, vi } from 'vitest'
import { getAudiobookPlaybackUrl, normalizeAudiobookSource, sourceFromAudioRecord } from './audiobookSource'

const project = 'https://example.supabase.co/'
describe('audiobook source resolution', () => {
  it.each(['arabic', 'english'])('accepts manually uploaded %s book folders', language => {
    expect(normalizeAudiobookSource(`audiobooks/${language}/book/file.mp3`, project)).toEqual({ storageBucket: 'audiobooks', storagePath: `${language}/book/file.mp3`, externalUrl: null })
  })
  it.each(['public', 'sign', 'authenticated'])('normalizes own %s URL without persisting its token', mode => {
    expect(normalizeAudiobookSource(`${project}storage/v1/object/${mode}/audiobooks/english/book/audio%20file?token=temporary`, project)).toEqual({ storageBucket: 'audiobooks', storagePath: 'english/book/audio file', externalUrl: null })
  })
  it('keeps external HTTPS URLs and preserves legacy chapter paths', () => {
    expect(normalizeAudiobookSource('https://audio.example.com/stream?id=1', project).externalUrl).toBe('https://audio.example.com/stream?id=1')
    expect(sourceFromAudioRecord({ storage_path: 'chapter/audio.mp3' }, project).storagePath).toBe('chapter/audio.mp3')
  })
  it.each(['', '../secret', 'ar//file', 'javascript:alert(1)', 'http://example.com/audio.mp3', 'https://user:password@example.com/audio', 'https://example.com/image.png', 'https://other.supabase.co/storage/v1/object/sign/audiobooks/file?token=temporary'])('rejects invalid source %s', source => {
    expect(() => normalizeAudiobookSource(source, project)).toThrow()
  })
  it('uses public URLs for public buckets and fresh signatures for private buckets', async () => {
    const signed = vi.fn().mockResolvedValue({ data: { signedUrl: 'fresh' }, error: null })
    const storage = { getBucket: vi.fn().mockResolvedValue({ data: { public: true }, error: null }), from: vi.fn(() => ({ getPublicUrl: () => ({ data: { publicUrl: 'public' } }), createSignedUrl: signed })) }
    const source = normalizeAudiobookSource('audiobooks/ar/book/file', project)
    expect(await getAudiobookPlaybackUrl(source, storage)).toEqual({ url: 'public', expiresIn: 0 })
    expect(signed).not.toHaveBeenCalled()
    storage.getBucket.mockResolvedValue({ data: { public: false }, error: null })
    expect(await getAudiobookPlaybackUrl(source, storage)).toEqual({ url: 'fresh', expiresIn: 900 })
    expect(signed).toHaveBeenCalledWith('ar/book/file', 900)
    expect(await getAudiobookPlaybackUrl(normalizeAudiobookSource('https://audio.example.com/file', project), storage)).toEqual({ url: 'https://audio.example.com/file', expiresIn: 0 })
  })
})
