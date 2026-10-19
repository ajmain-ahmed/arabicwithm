// app/cartoons/[show]/[episode]/page.tsx
import { notFound } from 'next/navigation'
import {
  fetchEpisodeForPublic,
  fetchShowBySlugPublic,
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

  /* All fetches in parallel — the episode gates the 404, the rest are
     independent catalogue reads (cached). */
  const [ep, showData, allEpisodes, shows] = await Promise.all([
    fetchEpisodeForPublic(show, episode),
    fetchShowBySlugPublic(show),
    fetchAllEpisodesForPublic(),
    fetchShowsForPublic(),
  ])
  if (!ep) notFound()

  const showTitle = showData?.title ?? show
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

  return <EpisodePage episode={ep} showTitle={showTitle} initialStart={initialStart} related={related} />
}
