// app/cartoons/[show]/[episode]/page.tsx
import { notFound } from 'next/navigation'
import { getEpisode, getShowBySlug } from '@/app/lib/cartoons';
import EpisodePage from './EpisodePage'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ show: string; episode: string }>
}) {
  const { show, episode } = await params
  const ep = await getEpisode(show, episode)
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

  const ep = await getEpisode(show, episode)
  if (!ep) notFound()

  const showData = getShowBySlug(show)
  const showTitle = showData?.title ?? show

  return <EpisodePage episode={ep} showTitle={showTitle} />
}
