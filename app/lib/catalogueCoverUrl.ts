export function catalogueCoverUrl({ kind, id, slug, cover, version }: {
  kind: 'books' | 'episodes' | 'shows'
  id: string
  slug: string
  cover?: unknown
  version?: unknown
}): string {
  const suffix = version == null ? '' : `?v=${encodeURIComponent(String(version))}`
  const fallback = `/api/covers/${kind}/${id}${suffix}`
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  if (!base) return fallback

  if (kind === 'books' && typeof cover === 'string' && cover.trim()) {
    try {
      const source = cover.trim()
      const path = /^https?:\/\//i.test(source)
        ? (() => { const url = new URL(source); return url.origin === new URL(base).origin && url.pathname.startsWith('/storage/v1/object/public/covers/') ? decodeURIComponent(url.pathname.slice('/storage/v1/object/public/covers/'.length)) : '' })()
        : source.replace(/^\/+/, '').replace(/^covers\//, '')
      if (/^books\/[^/\\%\u0000-\u001f]+\.webp$/.test(path)) return `${base}/storage/v1/object/public/covers/${path.split('/').map(encodeURIComponent).join('/')}${suffix}`
    } catch { /* Existing private/external sources keep the proxy below. */ }
  }

  const storageKind = kind === 'shows' ? 'cartoons' : kind
  const path = `/storage/v1/object/public/covers/${storageKind}/${slug}.webp`
  if (typeof cover === 'string' && cover.trim() && /^https?:\/\//i.test(cover.trim())) {
    try {
      const url = new URL(cover.trim())
      if (url.origin !== new URL(base).origin || url.pathname !== path) return fallback
    } catch {
      return fallback
    }
  }

  return `${base}${path}${suffix}`
}
