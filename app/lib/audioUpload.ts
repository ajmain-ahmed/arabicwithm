export type AudioLanguage = 'ar' | 'en'
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024
export const AUDIO_PATH_PATTERN = /^[0-9a-f-]{36}\/(?:audio\.(?:mp3|m4a)|(?:ar|en)\/[0-9a-f-]{36}\.(?:mp3|m4a))$/i

// Storage's multipart uploader reads Blob.type, ignoring contentType options.
// slice changes only that metadata and retains the validated original bytes.
export function audioUploadBody(file: Blob, extension: 'mp3' | 'm4a'): Blob {
  return file.slice(0, file.size, extension === 'mp3' ? 'audio/mpeg' : 'audio/mp4')
}

export function audioExtension(name: string, header: Uint8Array): 'mp3' | 'm4a' | null {
  if (name.toLowerCase().endsWith('.mp3') && (
    (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) ||
    (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
  )) return 'mp3'
  if (name.toLowerCase().endsWith('.m4a') && header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) return 'm4a'
  return null
}

export async function validateAudioFile(file: Blob, name: string): Promise<'mp3' | 'm4a'> {
  if (!file.size || file.size > MAX_AUDIO_BYTES) throw new Error('Audio must be non-empty and 50 MB or smaller.')
  const extension = audioExtension(name, new Uint8Array(await file.slice(0, 16).arrayBuffer()))
  if (!extension) throw new Error('Audio must be a valid MP3 or M4A file.')
  return extension
}
