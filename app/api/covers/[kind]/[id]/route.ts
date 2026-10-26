import { withDataDeadline } from '@/app/lib/boundedFetch'
import { createHash } from 'node:crypto'
import { serviceClient } from '@/app/lib/supabase'
import { rateLimit } from '@/app/lib/rateLimit'
import { getYouTubeThumbnailUrl } from '@/app/lib/cartoons'

// Covers are cached by this route's response headers (see coverResponse below):
// Supabase's storage gateway serves every object with `cache-control: no-cache`
// regardless of upload-time cacheControl metadata, so per-object metadata is
// unreliable and the proxy must set caching itself. Caching lives at the
// response layer (browser + CDN); the Data Cache must never sit in the request
// path. Clients revalidate so an overwritten object cannot remain stale.

// Only the columns this route reads — never select('*'): on episodes that
// would drag the full transcript JSONB through Postgres on every image request.
const COVER_COLUMNS: Record<'shows' | 'episodes' | 'books', string> = {
  shows: 'id, slug, cover',
  episodes: 'id, slug, cover, youtube_id',
  books: 'id, slug, cover',
}

interface CoverRow {
  id: string
  slug: string
  cover?: string | null
  youtube_id?: string | null
}

async function fetchCoverRow(table: 'shows' | 'episodes' | 'books', id: string): Promise<CoverRow | null> {
  const { data, error } = await serviceClient.from(table).select(COVER_COLUMNS[table]).eq('id', id).maybeSingle()
  if (error) throw error
  return (data ?? null) as CoverRow | null
}

type CoverBytes = { bytes: ArrayBuffer; etag: string }

/* Serving bytes (rather than redirecting to a Supabase URL) is what lets us
   control Cache-Control; repeat views are then served from browser caches.
   A short in-process TTL keeps repeat proxy hits (grid scans, the explore
   feed, next/image re-optimizations) off the storage gateway: bytes are
   immutable per path and an overwritten cover propagates within the TTL,
   sooner than the browser cache's own max-age would allow. */
async function fetchCoverBytesUncached(bucket: string, path: string): Promise<CoverBytes | null> {
  const { data, error } = await serviceClient.storage.from(bucket).download(path)
  if (error || !data) return null
  const bytes = await data.arrayBuffer()
  return { bytes, etag: createHash('md5').update(new Uint8Array(bytes)).digest('hex') }
}

const COVER_BYTES_TTL_MS = 60_000
const COVER_BYTES_CACHE_LIMIT = 500
const coverBytesCache = new Map<string, { value: CoverBytes; expiresAt: number }>()

async function fetchCoverBytes(bucket: string, path: string): Promise<CoverBytes | null> {
  // Test runs mock storage per case; a process-wide TTL would leak hits
  // between tests in the same file.
  if (process.env.NODE_ENV === 'test') return fetchCoverBytesUncached(bucket, path)
  const key = `${bucket}:${path}`
  const hit = coverBytesCache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value
  if (hit) coverBytesCache.delete(key)
  const value = await fetchCoverBytesUncached(bucket, path)
  if (value) {
    if (coverBytesCache.size >= COVER_BYTES_CACHE_LIMIT) {
      const oldest = coverBytesCache.keys().next().value
      if (oldest !== undefined) coverBytesCache.delete(oldest)
    }
    coverBytesCache.set(key, { value, expiresAt: Date.now() + COVER_BYTES_TTL_MS })
  }
  return value
}

const COVER_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600'

function coverResponse(cover: CoverBytes, ifNoneMatch: string | null): Response {
  const etag = `"${cover.etag}"`
  // Cheap revalidation: the browser already has these bytes cached.
  if (ifNoneMatch?.split(',').some((tag) => tag.trim() === etag)) {
    return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': COVER_CACHE_CONTROL } })
  }
  return new Response(cover.bytes, {
    headers: { 'Content-Type': 'image/webp', 'Content-Length': String(cover.bytes.byteLength), ETag: etag, 'Cache-Control': COVER_CACHE_CONTROL },
  })
}

// Resolve only covers attached to published catalogue records, never arbitrary
// caller-supplied Storage paths. Public covers are served as cacheable bytes;
// legacy private-bucket covers still get a per-request signed link, whose
// rotating token makes them uncacheable.
// Short TTL so repeat scans of missing ids don't re-hit the DB/storage, while
// newly added covers still appear within minutes. YouTube redirect targets are
// stable, so those can cache for a day.
const NOT_FOUND_CACHE_CONTROL = 'public, max-age=300'
const REDIRECT_CACHE_CONTROL = 'public, max-age=86400'

function notFound(): Response {
  return new Response(null, { status: 404, headers: { 'Cache-Control': NOT_FOUND_CACHE_CONTROL } })
}

function redirect(url: string): Response {
  return new Response(null, { status: 307, headers: { Location: url, 'Cache-Control': REDIRECT_CACHE_CONTROL } })
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  if (!['shows', 'episodes', 'books'].includes(kind) || !/^[\w-]+$/.test(id)) return notFound()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
  /* next/image fetches upstream without forwarding the client IP: limiting an
     empty key would rate-limit every visitor's optimizer requests together.
     Only identified clients — the bulk-download guard's target — are throttled. */
  if (ip) {
    const limit = rateLimit(`covers:${ip}`, 120, 60_000)
    if (!limit.ok) {
      return new Response(null, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })
    }
  }
  return withDataDeadline(6000, async () => {
  try {
    const table = kind as 'shows' | 'episodes' | 'books'
    const data = await fetchCoverRow(table, id)
    if (!data) return notFound()
    const row = data
    let path = typeof row.cover === 'string' ? row.cover.trim() : ''
    let bucket = 'covers'
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path)
      const base = new URL(process.env.SUPABASE_URL!)
      if (url.origin !== base.origin) {
        // Never resolve external origins; fall back to the canonical cover.
        path = ''
      } else {
        const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/)
        if (!match) return notFound()
        bucket = decodeURIComponent(match[1]); path = decodeURIComponent(match[2])
      }
    } else {
      path = path.replace(/^\/+/, '').replace(/^covers\//, '')
    }
    const canonical = `${kind === 'shows' ? 'cartoons' : kind}/${row.slug}.webp`
    const candidates = path ? [{ bucket, path }] : []
    if (bucket !== 'covers' || path !== canonical) candidates.push({ bucket: 'covers', path: canonical })
    for (const candidate of candidates) {
      if (candidate.bucket === 'covers') {
        const cover = await fetchCoverBytes(candidate.bucket, candidate.path)
        if (cover) return coverResponse(cover, request.headers.get('if-none-match'))
      } else {
        const { data: signed, error: signError } = await serviceClient.storage.from(candidate.bucket).createSignedUrl(candidate.path, 3600)
        if (!signError && signed?.signedUrl) return new Response(null, { status: 307, headers: { Location: signed.signedUrl, 'Cache-Control': 'no-store' } })
      }
    }
    if (kind === 'shows') {
      // No dedicated show cover: borrow the newest episode cover, else redirect to its YouTube thumbnail.
      const { data: episodes } = await serviceClient
        .from('episodes')
        .select('slug, youtube_id')
        .eq('show_id', String(row.id))
        .order('created_at', { ascending: false })
        .limit(8)
      const rows = episodes ?? []
      for (let i=0;i<rows.length;i+=2) {
        const covers = await Promise.all(rows.slice(i,i+2).map(episode => fetchCoverBytes('covers', `episodes/${episode.slug}.webp`)))
        const cover = covers.find(Boolean)
        if (cover) return coverResponse(cover, request.headers.get('if-none-match'))
      }
      for (const episode of episodes ?? []) {
        const fallback = getYouTubeThumbnailUrl(String(episode.youtube_id ?? ''))
        if (fallback) return redirect(fallback)
      }
    }
    const fallback = kind === 'episodes' ? getYouTubeThumbnailUrl(String(row.youtube_id ?? '')) : undefined
    if (fallback) return redirect(fallback)
    return notFound()
  } catch (error) {
    console.error('[catalogue cover]', { kind, id, error })
    return new Response(null, { status: 503 })
  }
  })
}
