// Private Storage round-trip check. Only temporary test objects are written;
// no book, chapter, or audio metadata is changed. Always clean up in finally.
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, options)
const browser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options)
const paths = []
try {
  const chapter = randomUUID()
  for (const language of ['ar', 'en']) {
    const extension = language === 'ar' ? 'mp3' : 'm4a'
    const path = `${chapter}/${language}/${randomUUID()}.${extension}`
    paths.push(path)
    const bytes = new Uint8Array(6 * 1024 * 1024)
    bytes.set(language === 'ar' ? [0x49, 0x44, 0x33, 4] : [0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20])
    const { data: signed, error: signError } = await admin.storage.from('audiobooks').createSignedUploadUrl(path)
    if (signError) throw signError
    const { data: uploaded, error } = await browser.storage.from('audiobooks').uploadToSignedUrl(path, signed.token, bytes, { contentType: language === 'ar' ? 'audio/mpeg' : 'audio/mp4' })
    if (error) throw error
    if (uploaded.path !== path) throw new Error('Upload path mismatch')
    const { data: info, error: infoError } = await admin.storage.from('audiobooks').info(path)
    if (infoError || info.size !== bytes.length) throw new Error('Stored size mismatch')
    const { data: playback, error: playbackError } = await admin.storage.from('audiobooks').createSignedUrl(path, 60)
    if (playbackError) throw playbackError
    const response = await fetch(playback.signedUrl, { headers: { Range: 'bytes=0-15' } })
    const header = new Uint8Array(await response.arrayBuffer())
    if (!response.ok || header.length !== 16 || header[0] !== bytes[0]) throw new Error('Private range read failed')
    const { error: publicReadError } = await browser.storage.from('audiobooks').download(path)
    if (!publicReadError) throw new Error('Unexpected anonymous access to private audio')
    console.log(`${language}: 6 MB signed upload, size verification, private range read, and anonymous access denial passed.`)
  }
} finally {
  const { error } = await admin.storage.from('audiobooks').remove(paths)
  if (error) throw new Error(`Test file cleanup failed: ${error.message}`)
  console.log('Temporary audio objects removed.')
}
