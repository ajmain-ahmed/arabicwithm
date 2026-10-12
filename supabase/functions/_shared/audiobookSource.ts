export const AUDIOBOOK_BUCKET = 'audiobooks'
export interface AudiobookSource {
  storageBucket: string | null
  storagePath: string | null
  externalUrl: string | null
}

function objectSource(bucket: string, path: string): AudiobookSource {
  if (!/^[\w-]+$/.test(bucket) || !path || path.includes('\\') || /[\u0000-\u001f?#]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Enter a valid storage bucket/path.')
  return { storageBucket: bucket, storagePath: path, externalUrl: null }
}

/** Signed URLs from our project become stable bucket/path references. */
export function normalizeAudiobookSource(input: string, projectUrl: string, defaultBucket = AUDIOBOOK_BUCKET): AudiobookSource {
  const value = input.trim()
  if (!value) throw new Error('Enter an audio path or HTTPS URL.')
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    let url: URL
    try { url = new URL(value) } catch { throw new Error('Enter a valid audio URL.') }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Audio URLs must use HTTPS without embedded credentials.')
    if (url.hostname === 'supabase.com' && url.pathname.startsWith('/dashboard')) throw new Error('This is a Supabase dashboard page. Paste the audio object path or its media URL instead.')
    if (url.origin === new URL(projectUrl).origin) {
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/)
      if (!match) throw new Error('Enter a Supabase Storage object URL.')
      try { return objectSource(decodeURIComponent(match[1]), decodeURIComponent(match[2])) }
      catch (cause) {
        if (cause instanceof URIError) throw new Error('The storage URL contains invalid encoding. Copy the object path or URL again.')
        throw cause
      }
    }
    if (/^\/storage\/v1\/object\/sign\//.test(url.pathname)) throw new Error('Signed links from another Supabase project expire. Use a stable public audio URL.')
    if (/\.(?:html?|png|jpe?g|webp|gif|pdf|svg|txt|json)$/i.test(url.pathname)) throw new Error('This URL points to a non-audio file.')
    return { storageBucket: null, storagePath: null, externalUrl: url.href }
  }
  const path = value.replace(/^\/+/, '')
  return path.startsWith(`${defaultBucket}/`) ? objectSource(defaultBucket, path.slice(defaultBucket.length + 1)) : objectSource(defaultBucket, path)
}

export interface AudioStorage {
  getBucket(bucket: string): PromiseLike<{ data: { public: boolean } | null; error: unknown }>
  from(bucket: string): {
    getPublicUrl(path: string): { data: { publicUrl: string } }
    createSignedUrl(path: string, seconds: number): PromiseLike<{ data: { signedUrl: string } | null; error: unknown }>
  }
}

export async function getAudiobookPlaybackUrl(source: AudiobookSource, storage: AudioStorage): Promise<{ url: string; expiresIn: number }> {
  if (source.externalUrl) return { url: source.externalUrl, expiresIn: 0 }
  if (!source.storagePath) throw new Error('This audiobook has no audio source.')
  const bucket = source.storageBucket ?? AUDIOBOOK_BUCKET
  const { data: info, error } = await storage.getBucket(bucket)
  if (error || !info) throw new Error('Unable to access the audiobook bucket.')
  if (info.public) return { url: storage.from(bucket).getPublicUrl(source.storagePath).data.publicUrl, expiresIn: 0 }
  const expiresIn = 2 * 60 * 60
  const { data, error: signingError } = await storage.from(bucket).createSignedUrl(source.storagePath, expiresIn)
  if (signingError || !data) throw new Error('Unable to start audiobook playback.')
  return { url: data.signedUrl, expiresIn }
}

export function sourceFromAudioRecord(row: { storage_bucket?: string | null; storage_path?: string | null; external_url?: string | null }, projectUrl: string): AudiobookSource {
  if (row.external_url) return normalizeAudiobookSource(row.external_url, projectUrl)
  if (row.storage_path) return normalizeAudiobookSource(row.storage_path, projectUrl, row.storage_bucket ?? AUDIOBOOK_BUCKET)
  throw new Error('This audiobook has no audio source.')
}
