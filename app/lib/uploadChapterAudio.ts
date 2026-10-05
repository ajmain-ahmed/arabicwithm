'use client'

import { supabase } from '@/app/lib/supabase/client'
import { AUDIO_MIME, audioUploadBody, validateAudioFile, type AudioLanguage } from '@/app/lib/audioUpload'

export interface AudioUploadOptions { signal?: AbortSignal; onProgress?: (percent: number) => void; onAuthorized?: () => void }
export async function uploadChapterAudio(chapterId: string, language: AudioLanguage, file: File, options: AudioUploadOptions = {}): Promise<string> {
  const extension = await validateAudioFile(file, file.name)
  const response = await fetch('/api/admin/audio-upload', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterId, language, extension, size: file.size }),
    signal: options.signal,
  })
  let result: { path?: string; token?: string; signedUrl?: string; error?: string }
  try { result = await response.json() }
  catch { throw new Error(`Audio authorization failed (HTTP ${response.status}). Check your connection and sign in again.`) }
  if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : `Audio authorization failed (HTTP ${response.status}).`)
  if (typeof result?.path !== 'string' || !result.path || typeof result.token !== 'string' || !result.token) throw new Error('Audio authorization did not include a storage path and token.')
  options.onAuthorized?.()
  if (options.onProgress) {
    if (!result.signedUrl) throw new Error('Audio authorization did not include an upload URL.')
    await uploadWithProgress(result.signedUrl, result.path, audioUploadBody(file, extension), options)
    return result.path
  }
  const { data, error } = await supabase.storage.from('audiobooks').uploadToSignedUrl(result.path, result.token, audioUploadBody(file, extension), {
    contentType: AUDIO_MIME[extension],
  })
  if (error) throw new Error(`Audio storage upload failed: ${error.message}`)
  if (data?.path !== result.path) throw new Error('Storage did not confirm the uploaded audio path. Please retry.')
  return result.path
}

/** Same signed PUT/multipart contract as Storage's SDK, with actual byte progress. */
function uploadWithProgress(url: string, path: string, body: Blob, options: AudioUploadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    const finish = (error?: Error) => {
      options.signal?.removeEventListener('abort', abort)
      if (error) reject(error); else resolve()
    }
    xhr.open('PUT', url)
    xhr.timeout = 10 * 60 * 1000
    xhr.setRequestHeader('x-upsert', 'false')
    if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) options.onProgress?.(Math.min(99, Math.floor(event.loaded / event.total * 100)))
    }
    xhr.onerror = () => finish(new Error('Audio upload connection failed. Retry the upload.'))
    xhr.ontimeout = () => finish(new Error('Audio upload timed out. Retry the upload.'))
    xhr.onabort = () => finish(new Error('Audio upload cancelled. The previous source is unchanged.'))
    xhr.onload = () => {
      let data: { Key?: string; message?: string; error?: string } = {}
      try { data = JSON.parse(xhr.responseText) } catch { /* Fail below without exposing response/URL tokens. */ }
      if (xhr.status < 200 || xhr.status >= 300) return finish(new Error(`Audio storage upload failed (HTTP ${xhr.status}): ${data.message ?? data.error ?? 'Please retry.'}`))
      if (data.Key !== `audiobooks/${path}`) return finish(new Error('Storage did not confirm the uploaded audio path. Please retry.'))
      options.onProgress?.(100)
      finish()
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) { finish(new Error('Audio upload cancelled.')); return }
    const form = new FormData()
    form.append('cacheControl', '3600')
    form.append('', body)
    options.onProgress?.(0)
    xhr.send(form)
  })
}
