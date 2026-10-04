'use client'

import { supabase } from '@/app/lib/supabase/client'
import { validateAudioFile, type AudioLanguage } from '@/app/lib/audioUpload'

export async function uploadChapterAudio(chapterId: string, language: AudioLanguage, file: File): Promise<string> {
  const extension = await validateAudioFile(file, file.name)
  const response = await fetch('/api/admin/audio-upload', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterId, language, extension, size: file.size }),
  })
  let result: { path?: string; token?: string; error?: string }
  try { result = await response.json() }
  catch { throw new Error(`Audio authorization failed (HTTP ${response.status}). Check your connection and sign in again.`) }
  if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : `Audio authorization failed (HTTP ${response.status}).`)
  if (typeof result?.path !== 'string' || !result.path || typeof result.token !== 'string' || !result.token) throw new Error('Audio authorization did not include a storage path and token.')
  const { data, error } = await supabase.storage.from('audiobooks').uploadToSignedUrl(result.path, result.token, file, {
    contentType: extension === 'mp3' ? 'audio/mpeg' : 'audio/mp4',
  })
  if (error) throw new Error(`Audio storage upload failed: ${error.message}`)
  if (data?.path !== result.path) throw new Error('Storage did not confirm the uploaded audio path. Please retry.')
  return result.path
}
