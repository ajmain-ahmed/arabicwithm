// app/cartoons/[show]/[episode]/page.tsx
import { notFound } from 'next/navigation'
import {
  fetchEpisodeForPublic,
  fetchShowsForPublic,
  fetchEpisodesForShowPublic,
  fetchAllEpisodesForPublic,
} from '@/app/actions/cartoons'
import EpisodePage from './EpisodePage'

export const revalidate = false

export async function generateStaticParams() {
  const shows = await fetchShowsForPublic()
  const params: { show: string; episode: string }[] = []
  for (const show of shows) {
    const episodes = await fetchEpisodesForShowPublic(show.slug)
    for (const ep of episodes) {
      params.push({ show: show.slug, episode: ep.slug })
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ show: string; episode: string }>
}) {
  const { show, episode } = await params
  const ep = await fetchEpisodeForPublic(show, episode)
  if (!ep) return { title: 'Not Found' }
  return {
    title: `${ep.title} | ArabicWithM`,
    description: ep.description ?? `Watch ${ep.title} with an interactive Arabic transcript.`,
  }
}

export default async function Page({
  params, searchParams,
}: {
  params: Promise<{ show: string; episode: string }>
  searchParams: Promise<{t?:string}>
}) {
  const { show, episode } = await params
  const raw = Number((await searchParams).t ?? 0)
  const initialStart = Number.isFinite(raw) && raw >= 0 && raw <= 86400 ? raw : 0

  const ep = await fetchEpisodeForPublic(show, episode)
  if (!ep) notFound()

  /* Related "up next": scored across the whole catalogue (cached fetches, so
     no extra DB cost) — same show weighs most, then same level, then shared
     tags. */
  const [allEpisodes, shows] = await Promise.all([
    fetchAllEpisodesForPublic(),
    fetchShowsForPublic(),
  ])
  const showSlugById = new Map(shows.map((item) => [item.id, item.slug]))
  const currentTags = new Set(ep.tags.map((tag) => tag.toLowerCase()))
  const related = allEpisodes
    .filter((item) => item.slug !== ep.slug)
    .map((item) => {
      let score = 0
      if (item.showId === ep.show_id) score += 4
      if (item.level === ep.level) score += 2
      for (const tag of item.tags) if (currentTags.has(tag.toLowerCase())) score += 1.5
      return { item, score }
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map(({ item }) => ({ ...item, showSlug: showSlugById.get(item.showId) ?? show }))

  return <EpisodePage episode={ep} initialStart={initialStart} related={related} />
}
