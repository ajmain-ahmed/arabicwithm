import { notFound } from 'next/navigation'
import { fetchShowBySlugPublic, fetchEpisodesForShowPublic, fetchShowsForPublic } from '@/app/actions/cartoons'
import ShowPage from './ShowPage'
import StructuredData from '@/app/components/StructuredData'
import { absoluteUrl, breadcrumbJsonLd } from '@/app/lib/seo'

export const revalidate = false

export async function generateStaticParams() {
  const shows = await fetchShowsForPublic()
  return shows.map((show) => ({ show: show.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params
  const showData = await fetchShowBySlugPublic(show)
  if (!showData) return { title: 'Not Found' }
  const path = `/cartoons/${encodeURIComponent(showData.slug)}`
  const description = showData.description ?? `Watch ${showData.title} with interactive Arabic transcripts and English translations.`
  return {
    title: `${showData.title} | Arabic Cartoons`,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'video.tv_show', title: showData.title, description, url: path, images: [{ url: showData.cover, alt: `${showData.title} cover` }] },
    twitter: { card: 'summary_large_image', title: showData.title, description, images: [showData.cover] },
  }
}

export default async function Page({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params
  const showData = await fetchShowBySlugPublic(show)
  if (!showData) notFound()

  const episodes = await fetchEpisodesForShowPublic(show)
  return <>
    <StructuredData data={[
      breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Arabic Cartoons', path: '/cartoons' }, { name: showData.title, path: `/cartoons/${encodeURIComponent(showData.slug)}` }]),
      {
        '@context': 'https://schema.org', '@type': 'TVSeries', name: showData.title,
        ...(showData.description ? { description: showData.description } : {}),
        image: showData.cover, inLanguage: 'ar', numberOfEpisodes: episodes.length,
        url: absoluteUrl(`/cartoons/${encodeURIComponent(showData.slug)}`),
      },
    ]} />
    <ShowPage show={showData} episodes={episodes} />
  </>
}
