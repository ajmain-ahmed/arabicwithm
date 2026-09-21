import { createHash } from 'node:crypto'
import { unstable_cache } from 'next/cache'
import { serviceClient } from '@/app/lib/supabase'
import { getYouTubeThumbnailUrl } from '@/app/lib/cartoons'

/* Dev refreshes cover rows/bytes every 60s; production relies on updateTag only. */
const publicRevalidate = process.env.NODE_ENV === 'development' ? 60 : false

// Covers are cached by this route's response headers (see CoverBytes below):
// Supabase's storage gateway currently serves every object with
// `cache-control: no-cache` regardless of upload-time cacheControl metadata,
// so per-object metadata is unreliable and the proxy must set caching itself.

/* DB lookup per cover is cached in memory and busted by the same tags the
   admin CMS already invalidates on show/episode/book edits. */
const fetchCoverRow = unstable_cache(
  async (table: string, id: string) => {
    const { data, error } = await serviceClient.from(table).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  },
  ['cover-row', 'v1'],
  { revalidate: publicRevalidate, tags: ['cartoons-public', 'books-public'] }
)

type CoverBytes = { bytes: ArrayBuffer; etag: string }

/* Cover bytes per Storage path, cached with the same tags so an admin
   re-upload busts them. Serving bytes (rather than redirecting to a Supabase
   URL) is what lets us control Cache-Control; repeat views are then served
   entirely from browser caches. */
const fetchCoverBytes = unstable_cache(
  async (bucket: string, path: string): Promise<CoverBytes | null> => {
    const { data, error } = await serviceClient.storage.from(bucket).download(path)
    if (error || !data) return null
    const bytes = await data.arrayBuffer()
    return { bytes, etag: createHash('md5').update(new Uint8Array(bytes)).digest('hex') }
  },
  ['cover-bytes', 'v1'],
  { revalidate: publicRevalidate, tags: ['cartoons-public', 'books-public'] }
)

const COVER_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800'

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
export async function GET(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  if (!['shows', 'episodes', 'books'].includes(kind) || !/^[\w-]+$/.test(id)) return new Response(null, { status: 404 })
  try {
    const table = kind as 'shows' | 'episodes' | 'books'
    const data = await fetchCoverRow(table, id)
    if (!data) return new Response(null, { status: 404 })
    const row = data as Record<string, unknown>
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
        if (!match) return new Response(null, { status: 404 })
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
    const fallback = kind === 'episodes' ? getYouTubeThumbnailUrl(String(row.youtube_id ?? '')) : undefined
    if (fallback) return Response.redirect(fallback, 307)
    return new Response(null, { status: 404 })
  } catch (error) {
    console.error('[catalogue cover]', { kind, id, error })
    return new Response(null, { status: 503 })
  }
}
