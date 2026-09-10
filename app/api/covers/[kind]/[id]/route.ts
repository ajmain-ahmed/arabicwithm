import { serviceClient } from '@/app/lib/supabase'
import { getYouTubeThumbnailUrl } from '@/app/lib/cartoons'

// Resolve only covers attached to published catalogue records, never arbitrary
// caller-supplied Storage paths. Signed links are refreshed on every request.
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  if (!['shows', 'episodes', 'books'].includes(kind) || !/^[\w-]+$/.test(id)) return new Response(null, { status: 404 })
  try {
    const table = kind as 'shows' | 'episodes' | 'books'
    const { data, error } = await serviceClient.from(table).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return new Response(null, { status: 404 })
    const row = data as Record<string, unknown>
    let path = typeof row.cover === 'string' ? row.cover.trim() : ''
    let bucket = 'covers'
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path)
      const base = new URL(process.env.SUPABASE_URL!)
      if (url.origin !== base.origin) return Response.redirect(url, 307)
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/)
      if (!match) return new Response(null, { status: 404 })
      bucket = decodeURIComponent(match[1]); path = decodeURIComponent(match[2])
    } else {
      path = path.replace(/^\/+/, '').replace(/^covers\//, '')
    }
    const canonical = `${kind === 'shows' ? 'cartoons' : kind}/${row.slug}.webp`
    const candidates = path ? [{ bucket, path }] : []
    if (bucket !== 'covers' || path !== canonical) candidates.push({ bucket: 'covers', path: canonical })
    for (const candidate of candidates) {
      const { data: signed, error: signError } = await serviceClient.storage.from(candidate.bucket).createSignedUrl(candidate.path, 3600)
      if (!signError && signed?.signedUrl) return new Response(null, { status: 307, headers: { Location: signed.signedUrl, 'Cache-Control': 'no-store' } })
    }
    const fallback = kind === 'episodes' ? getYouTubeThumbnailUrl(String(row.youtube_id ?? '')) : undefined
    if (fallback) return Response.redirect(fallback, 307)
    return new Response(null, { status: 404 })
  } catch (error) {
    console.error('[catalogue cover]', { kind, id, error })
    return new Response(null, { status: 503 })
  }
}
