import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { guardAdmin } from '@/app/actions/auth'
import { serviceClient } from '@/app/lib/supabase'
import { MAX_AUDIO_BYTES } from '@/app/lib/audioUpload'

const inputSchema = z.object({
  chapterId: z.string().uuid(),
  language: z.enum(['ar', 'en']),
  extension: z.enum(['mp3', 'm4a', 'aac', 'wav', 'ogg']),
  size: z.number().int().positive().max(MAX_AUDIO_BYTES),
})

export async function POST(request: Request) {
  // Cookie authentication is accompanied by same-origin protection.
  const internal = new URL(request.url)
  const protocol = request.headers.get('x-forwarded-proto') ?? internal.protocol.replace(':', '')
  const host = request.headers.get('host') ?? internal.host
  let expectedOrigin: string
  try { expectedOrigin = new URL(`${protocol}://${host}`).origin }
  catch { return Response.json({ error: 'Unable to verify the upload origin.' }, { status: 403 }) }
  if (!['http', 'https'].includes(protocol) || request.headers.get('origin') !== expectedOrigin) return Response.json({ error: 'Audio uploads must originate from this website.' }, { status: 403 })
  try {
    await guardAdmin()
    const parsed = inputSchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Choose a valid chapter, language, and non-empty audio file up to 50 MB.' }, { status: 400 })
    const { chapterId, language, extension } = parsed.data
    const { data: chapter, error: chapterError } = await serviceClient.from('chapters').select('id').eq('id', chapterId).maybeSingle()
    if (chapterError) throw new Error(`Unable to verify chapter: ${chapterError.message}`)
    if (!chapter) return Response.json({ error: 'Chapter not found.' }, { status: 404 })
    const path = `${chapterId}/${language}/${randomUUID()}.${extension}`
    const { data, error } = await serviceClient.storage.from('audiobooks').createSignedUploadUrl(path)
    if (error) throw new Error(`Unable to authorize private audio upload: ${error.message}`)
    if (!data?.token || data.path !== path) throw new Error('Storage did not return a valid upload authorization.')
    return Response.json({ path, token: data.token, signedUrl: data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to authorize audio upload.'
    return Response.json({ error: message === 'Forbidden' ? 'Sign in with an administrator account to upload audio.' : message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}
