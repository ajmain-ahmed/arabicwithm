export type AudioLanguage = 'ar' | 'en'
export type AudioExtension = 'mp3' | 'm4a' | 'aac' | 'wav' | 'ogg'
export const AUDIO_MIME: Record<AudioExtension, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg' }
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024
export const AUDIO_PATH_PATTERN = /^[0-9a-f-]{36}\/(?:audio\.(?:mp3|m4a|aac|wav|ogg)|(?:ar|en)\/[0-9a-f-]{36}\.(?:mp3|m4a|aac|wav|ogg))$/i

// Storage's multipart uploader reads Blob.type, ignoring contentType options.
// slice changes only that metadata and retains the validated original bytes.
export function audioUploadBody(file: Blob, extension: AudioExtension): Blob {
  return file.slice(0, file.size, AUDIO_MIME[extension])
}

export function audioExtension(name: string, header: Uint8Array): AudioExtension | null {
  void name
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 && header[8] === 0x57 && header[9] === 0x41 && header[10] === 0x56 && header[11] === 0x45) return 'wav'
  if (header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) return 'ogg'
  if (header[0] === 0xff && (header[1] & 0xf6) === 0xf0) return 'aac'
  if (
    (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) ||
    (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
  ) return 'mp3'
  if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) return 'm4a'
  return null
}

export async function validateAudioFile(file: Blob, name: string): Promise<AudioExtension> {
  if (!file.size || file.size > MAX_AUDIO_BYTES) throw new Error('Audio must be non-empty and 50 MB or smaller.')
  const extension = audioExtension(name, new Uint8Array(await file.slice(0, 16).arrayBuffer()))
  if (!extension) throw new Error('Choose a valid MP3, M4A, AAC, WAV, or OGG audio file.')
  return extension
}
