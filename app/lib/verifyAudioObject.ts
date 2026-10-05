import { serviceClient } from '@/app/lib/supabase'
import { audioExtension } from '@/app/lib/audioUpload'

/** Validate the stored bytes, rather than trusting browser MIME/size claims. */
export async function verifyAudioObject(path: string, bucketName = 'audiobooks'): Promise<void> {
  const bucket = serviceClient.storage.from(bucketName)
  const { data: info, error } = await bucket.info(path)
  if (error) throw new Error(`Unable to verify uploaded audio: ${error.message}`)
  if (!info?.size) throw new Error('Stored audio is empty or inaccessible.')
  const { data: signed, error: signingError } = await bucket.createSignedUrl(path, 60)
  if (signingError || !signed?.signedUrl) throw new Error('Unable to validate the uploaded audio bytes.')
  const response = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-15' }, cache: 'no-store', signal: AbortSignal.timeout(15000) })
  if (!response.ok || !response.body) throw new Error(`Unable to read uploaded audio (HTTP ${response.status}).`)
  const reader = response.body.getReader()
  const header = new Uint8Array(16)
  let length = 0
  try {
    while (length < 16) {
      const { value, done } = await reader.read()
      if (done) break
      const bytes = value.subarray(0, 16 - length)
      header.set(bytes, length); length += bytes.length
    }
  } finally { await reader.cancel() }
  if (!audioExtension(path, header.subarray(0, length))) throw new Error('Stored file is not valid MP3, M4A, AAC, WAV, or OGG audio.')
}
