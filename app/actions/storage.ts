// app/actions/storage.ts — Supabase Storage uploads for admin covers

"use server"

import { guardAdmin } from "@/app/actions/auth"
import { serviceClient } from "@/app/lib/supabase"

const ALLOWED_BUCKETS = new Set(["covers"])
// Single path segment under a fixed prefix; slugs are admin free-text, so the
// security property is "no traversal", not a specific slug charset.
const COVER_PATH_PATTERN = /^(cartoons|episodes|books)\/[^/\\]+\.webp$/
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_AUDIO_BYTES = 100 * 1024 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isWebPHeader(header: Uint8Array): boolean {
  return (
    header[0] === 0x52 && // R
    header[1] === 0x49 && // I
    header[2] === 0x46 && // F
    header[3] === 0x46 && // F
    header[8] === 0x57 && // W
    header[9] === 0x45 && // E
    header[10] === 0x42 && // B
    header[11] === 0x50 // P
  )
}

function audioExtension(file: Blob, name: string, header: Uint8Array): 'mp3' | 'm4a' | null {
  const mp3 = file.type === 'audio/mpeg' && (
    (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) ||
    (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
  )
  if (mp3 && name.toLowerCase().endsWith('.mp3')) return 'mp3'
  const m4a = ['audio/mp4', 'audio/x-m4a'].includes(file.type)
    && header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70
  if (m4a && name.toLowerCase().endsWith('.m4a')) return 'm4a'
  return null
}

export async function uploadCoverImage(formData: FormData): Promise<string> {
  await guardAdmin()

  const bucket = formData.get("bucket")
  const path = formData.get("path")
  const file = formData.get("file")

  if (typeof bucket !== "string" || typeof path !== "string" || !(file instanceof Blob)) {
    throw new Error("Invalid upload payload: bucket, path, and file are required")
  }

  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw new Error("Unsupported upload bucket")
  }
  if (!COVER_PATH_PATTERN.test(path)) {
    throw new Error("Cover path must look like {cartoons|episodes|books}/{slug}.webp")
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    throw new Error("Cover image must be 5 MB or smaller")
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!isWebPHeader(header)) {
    throw new Error("Cover image must be a WebP file")
  }

  const { data, error } = await serviceClient.storage
    .from(bucket)
    .upload(path, file, {
      contentType: "image/webp",
      // Note: Supabase's storage gateway currently serves objects with
      // `cache-control: no-cache` regardless of this value — the covers API
      // route sets its own caching headers. Record it anyway so the objects
      // are correct if platform behavior ever changes.
      cacheControl: "86400",
      upsert: true,
    })

  if (error) {
    console.error("[uploadCoverImage] error:", error.message)
    throw new Error("Cover upload failed. Please try again.")
  }

  const { data: urlData } = serviceClient.storage.from(bucket).getPublicUrl(data?.path ?? path)

  return urlData.publicUrl
}

export async function uploadAudiobookAudio(formData: FormData): Promise<string> {
  await guardAdmin()
  const chapterId = formData.get('chapterId')
  const file = formData.get('file')
  if (typeof chapterId !== 'string' || !UUID_PATTERN.test(chapterId) || !(file instanceof File)) throw new Error('A valid chapter and audio file are required.')
  if (file.size === 0 || file.size > MAX_AUDIO_BYTES) throw new Error('Audio must be 100 MB or smaller.')
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const extension = audioExtension(file, file.name, header)
  if (!extension) throw new Error('Audio must be a valid MP3 or M4A file.')
  const path = `${chapterId}/audio.${extension}`
  const { error } = await serviceClient.storage.from('audiobooks').upload(path, file, { contentType: file.type, upsert: true })
  if (error) {
    console.error('[uploadAudiobookAudio] error:', error.message)
    throw new Error('Audio upload failed. Confirm the private audiobooks bucket is configured.')
  }
  const otherPath = `${chapterId}/audio.${extension === 'mp3' ? 'm4a' : 'mp3'}`
  await serviceClient.storage.from('audiobooks').remove([otherPath])
  return path
}

export async function removeAudiobookAudio(path: string): Promise<void> {
  await guardAdmin()
  if (!/^[0-9a-f-]{36}\/audio\.(mp3|m4a)$/i.test(path)) throw new Error('Invalid audiobook path.')
  const { error } = await serviceClient.storage.from('audiobooks').remove([path])
  if (error) throw new Error('Unable to remove audiobook file.')
}
