export const FEATURED_VARIANT_WIDTHS = [828, 1600] as const
export const COVER_VARIANT_WIDTHS = [640, 1080] as const

export function featuredVariantUrl(source: string, width: number): string | null {
  if (!FEATURED_VARIANT_WIDTHS.includes(width as (typeof FEATURED_VARIANT_WIDTHS)[number])) return null
  try {
    const url = new URL(source)
    if (!/\/storage\/v1\/object\/public\/covers\/featured\/[^/]+\.[^/]+$/.test(url.pathname)) return null
    url.pathname = url.pathname.replace('/covers/featured/', '/covers/variants/featured/').replace(/\.[^/.]+$/, `-${width}.avif`)
    return url.toString()
  } catch {
    return null
  }
}

export function featuredImageSrcSet(source: string): string | undefined {
  const sources = FEATURED_VARIANT_WIDTHS.map(width => `${featuredVariantUrl(source, width)} ${width}w`)
  return sources.some(value => value.startsWith('null')) ? undefined : sources.join(', ')
}

export function featuredVariantPaths(path: string): string[] {
  const match = /^featured\/([^/]+)\.[^/]+$/.exec(path)
  if (!match) return []
  return FEATURED_VARIANT_WIDTHS.map(width => `variants/featured/${match[1]}-${width}.avif`)
}

export function coverVariantPath(path: string, width: number): string | null {
  if (!COVER_VARIANT_WIDTHS.includes(width as (typeof COVER_VARIANT_WIDTHS)[number])) return null
  const match = /^(books|episodes|cartoons)\/([^/]+)\.webp$/.exec(path)
  return match ? `variants/${match[1]}/${match[2]}-${width}.webp` : null
}

export function coverVariantPaths(path: string): string[] {
  return COVER_VARIANT_WIDTHS.flatMap(width => {
    const variant = coverVariantPath(path, width)
    return variant ? [variant] : []
  })
}

export function coverImageSrcSet(source: string): string | undefined {
  if (!source.startsWith('/api/covers/')) return undefined
  const separator = source.includes('?') ? '&' : '?'
  return COVER_VARIANT_WIDTHS.map(width => `${source}${separator}w=${width} ${width}w`).join(', ')
}
