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
import StructuredData from '@/app/components/StructuredData'
import { absoluteUrl, breadcrumbJsonLd } from '@/app/lib/seo'

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
  const path = `/cartoons/${encodeURIComponent(show)}/${encodeURIComponent(ep.slug)}`
  const description = ep.description ?? `Watch ${ep.title} with an interactive Arabic transcript and English translation.`
  return {
    title: `${ep.title} | Arabic Cartoons`,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'video.episode', title: ep.title, description, url: path, images: ep.cover ? [{ url: ep.cover, alt: `${ep.title} thumbnail` }] : undefined },
    twitter: { card: 'summary_large_image', title: ep.title, description, images: ep.cover ? [ep.cover] : undefined },
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

  const path = `/cartoons/${encodeURIComponent(show)}/${encodeURIComponent(ep.slug)}`
  return <>
    <StructuredData data={[
      breadcrumbJsonLd([
        { name: 'Home', path: '/' }, { name: 'Arabic Cartoons', path: '/cartoons' },
        { name: showTitle, path: `/cartoons/${encodeURIComponent(show)}` }, { name: ep.title, path },
      ]),
      {
        '@context': 'https://schema.org', '@type': 'VideoObject', name: ep.title,
        description: ep.description ?? `Watch ${ep.title} with an interactive Arabic transcript and English translation.`,
        ...(ep.cover ? { thumbnailUrl: [ep.cover] } : {}),
        ...(ep.createdAt ? { uploadDate: ep.createdAt } : {}),
        ...(ep.youtubeId ? { embedUrl: `https://www.youtube.com/embed/${ep.youtubeId}` } : {}),
        inLanguage: 'ar', isAccessibleForFree: true, url: absoluteUrl(path),
        publisher: { '@id': 'https://www.arabicwithm.com/#organization' },
      },
    ]} />
    <EpisodePage episode={ep} showTitle={showTitle} initialStart={initialStart} related={related} />
  </>
}
