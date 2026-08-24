// app/lib/storage.ts — Supabase Storage URL helpers for covers

export function getSupabasePublicUrl(bucket: string, path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for storage URL construction')
  }
  const cleanPath = path.replace(/^\//, '')
  return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
}

export function getShowCoverUrl(slug: string): string {
  return getSupabasePublicUrl('covers', `cartoons/${slug}.webp`)
}

export function getEpisodeCoverUrl(episodeSlug: string): string {
  return getSupabasePublicUrl('covers', `episodes/${episodeSlug}.webp`)
}

export function getBookCoverUrl(slug: string): string {
  return getSupabasePublicUrl('covers', `books/${slug}.webp`)
}
