import { unstable_cache } from 'next/cache'
import { serviceClient, hasServiceClientConfig } from '@/app/lib/supabase'
import type { ShowMeta, EpisodeMeta } from '@/app/lib/cartoons'
import { normalizeThumbnailCrop } from '@/app/lib/thumbnailCrop'

const episodes = unstable_cache(async () => {
  if (!hasServiceClientConfig()) return []
  const { data, error } = await serviceClient.from('episodes')
    .select('id,show_id,slug,title,level,tags,description,youtube_id,instagram_id,tiktok_id,facebook_id,cover_crop,created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}, ['home-episode-metadata-v1'], { revalidate: 60, tags: ['cartoons-public'] })

export async function fetchHomeEpisodes(shows: ShowMeta[]): Promise<{ show: ShowMeta; episode: EpisodeMeta }[]> {
  const byId = new Map(shows.map(s => [s.id, s]))
  return (await episodes()).flatMap(row => {
    const show = byId.get(row.show_id)
    if (!show) return []
    return [{ show, episode: {
      id: row.id, slug: row.slug, title: row.title, level: row.level ?? '', tags: row.tags ?? [],
      description: row.description ?? undefined, youtubeId: row.youtube_id ?? undefined,
      instagramId: row.instagram_id ?? undefined, tiktokId: row.tiktok_id ?? undefined,
      facebookId: row.facebook_id ?? undefined, cover: `/api/covers/episodes/${row.id}`,
      coverCrop: normalizeThumbnailCrop(row.cover_crop), createdAt: row.created_at ?? undefined,
    } }]
  })
}
