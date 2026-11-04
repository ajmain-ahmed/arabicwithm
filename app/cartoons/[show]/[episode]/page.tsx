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

type EpisodeRouteProps = {
  params: Promise<{ show: string; episode: string }>
  searchParams: Promise<{ t?: string; debug?: string }>
}

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

export async function generateMetadata({ params }: { params: Promise<{ show: string; episode: string }> }) {
  const { show, episode } = await params
  const ep = await fetchEpisodeForPublic(show, episode)
  if (!ep) return { title: 'Not Found' }
  return {
    title: `${ep.title} | ArabicWithM`,
    description: ep.description ?? `Watch ${ep.title} with an interactive Arabic transcript.`,
  }
}

/* TEMPORARY diagnostic: episode pages 500 only on the Cloudflare worker
   runtime (fine on Vercel) and production builds redact the message. Render
   the error as page content so it can be read from the response, find the
   cause, then revert this wrapper. */
export default async function Page(props: EpisodeRouteProps) {
  try {
    return await renderEpisodePage(props)
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as { digest?: string }).digest === 'NEXT_NOT_FOUND') throw error
    const detail = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error)
    return (
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 24, fontSize: 13, color: '#2c1a0e' }}>
        {detail}
      </pre>
    )
  }
}

async function renderEpisodePage({
  params, searchParams,
}: EpisodeRouteProps) {
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
  const showTitleById = new Map(shows.map((item) => [item.id, item.title]))
  const currentTags = new Set(ep.tags.map((tag) => tag.toLowerCase()))
  /* fetchEpisodeForPublic does not select show_id; showData is the same show. */
  const currentShowId = showData?.id ?? null
  const related = allEpisodes
    .filter((item) => item.slug !== ep.slug)
    .map((item) => {
      let score = 0
      if (currentShowId && item.showId === currentShowId) score += 4
      if (item.level === ep.level) score += 2
      for (const tag of item.tags) if (currentTags.has(tag.toLowerCase())) score += 1.5
      return { item, score }
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map(({ item }) => ({ ...item, showSlug: showSlugById.get(item.showId) ?? show, showTitle: showTitleById.get(item.showId) ?? showTitle }))

  if ((await searchParams).debug === '1') {
    return <div style={{ padding: 24 }}>EPISODE {ep.title} — blocks {ep.scriptBlocks.length}, words {ep.scriptBlocks.reduce((n, b) => n + b.words.length, 0)}, related {related.length}</div>
  }

  return <EpisodePage episode={ep} showTitle={showTitle} initialStart={initialStart} related={related} />
}
