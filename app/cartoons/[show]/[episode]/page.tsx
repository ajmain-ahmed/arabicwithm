// app/cartoons/[show]/[episode]/page.tsx
import { notFound } from 'next/navigation'
import {
  fetchEpisodeForPublic,
  fetchShowBySlugPublic,
  fetchShowsForEpisodeEdit,
} from '@/app/actions/cartoons'
import { isAdminUser } from '@/app/actions/vocab'
import EpisodePage from './EpisodePage'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

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
    description: `Watch ${ep.title} with Arabic subtitles and CEFR-graded worksheets.`,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ show: string; episode: string }>
}) {
  const { show, episode } = await params

  const ep = await fetchEpisodeForPublic(show, episode)
  if (!ep) notFound()

  const showData = await fetchShowBySlugPublic(show)
  const showTitle = showData?.title ?? show

  const isAdmin = await isAdminUser()
  const allShows = isAdmin ? await fetchShowsForEpisodeEdit() : []

  return <EpisodePage episode={ep} showTitle={showTitle} isAdmin={isAdmin} allShows={allShows} />
}
