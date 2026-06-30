import { notFound } from 'next/navigation'
import { fetchShowBySlugPublic, fetchEpisodesForShowPublic } from '@/app/actions/cartoons'
import { isAdminUser } from '@/app/actions/vocab'
import ShowPage from './ShowPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params
  const showData = await fetchShowBySlugPublic(show)
  if (!showData) return { title: 'Not Found' }
  return {
    title: `${showData.title} | Arabic Cartoons`,
    description: `Watch ${showData.title} subtitled in Arabic with CEFR-graded worksheets and quizzes.`,
  }
}

export default async function Page({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params
  const showData = await fetchShowBySlugPublic(show)
  if (!showData) notFound()

  const episodes = await fetchEpisodesForShowPublic(show)
  const isAdmin = await isAdminUser()
  return <ShowPage show={showData} episodes={episodes} isAdmin={isAdmin} />
}
