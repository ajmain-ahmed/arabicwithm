import { notFound } from 'next/navigation'
import { fetchShowBySlugPublic, fetchEpisodesForShowPublic, fetchShowsForPublic } from '@/app/actions/cartoons'
import ShowPage from './ShowPage'

export const revalidate = 300

export async function generateStaticParams() {
  const shows = await fetchShowsForPublic()
  return shows.map((show) => ({ show: show.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params
  const showData = await fetchShowBySlugPublic(show)
  if (!showData) return { title: 'Not Found' }
  return {
    title: `${showData.title} | Arabic Cartoons`,
    description: showData.description ?? `Watch ${showData.title} with interactive Arabic transcripts.`,
  }
}

export default async function Page({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params
  const showData = await fetchShowBySlugPublic(show)
  if (!showData) notFound()

  const episodes = await fetchEpisodesForShowPublic(show)
  return <ShowPage show={showData} episodes={episodes} />
}
