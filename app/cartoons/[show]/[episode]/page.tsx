// app/cartoons/[show]/[episode]/page.tsx
import { notFound } from 'next/navigation'
import {
  fetchEpisodeForPublic,
  fetchShowBySlugPublic,
  fetchShowsForPublic,
  fetchEpisodesForShowPublic,
} from '@/app/actions/cartoons'
import type { EpisodeMeta } from '@/app/lib/cartoons'
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

  const showData = await fetchShowBySlugPublic(show)
  const showTitle = showData?.title ?? show
  /* Cached fetch (shared with the show page) — no extra DB cost in steady state. */
  const related: EpisodeMeta[] = (await fetchEpisodesForShowPublic(show))
    .filter((item) => item.slug !== ep.slug)
    .slice(0, 12)

  return <EpisodePage episode={ep} showTitle={showTitle} initialStart={initialStart} related={related} />
}
