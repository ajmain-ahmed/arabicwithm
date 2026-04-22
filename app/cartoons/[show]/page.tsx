import { notFound } from 'next/navigation'
import { getShowBySlug, getEpisodesForShow } from '../../lib/cartoons'
import ShowPage from './ShowPage'

export async function generateMetadata({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params
  const showData = getShowBySlug(show)
  if (!showData) return { title: 'Not Found' }
  return {
    title: `${showData.title} | Arabic Cartoons`,
    description: `Watch ${showData.title} subtitled in Arabic with CEFR-graded worksheets and quizzes.`,
  }
}

export default async function Page({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params
  const showData = getShowBySlug(show)
  if (!showData) notFound()

  const episodes = getEpisodesForShow(show)
  return <ShowPage show={showData} episodes={episodes} />
}