import { notFound } from 'next/navigation'
import { fetchLiteratureBySlug } from '@/app/actions/literature'
import LiteratureDetailPage from './LiteratureDetailPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { item } = await fetchLiteratureBySlug(decodeURIComponent(slug))
  if (!item) return { title: 'Not Found' }
  return {
    title: `${item.title} | ArabicWithM Literature`,
    description: item.type === 'poem'
      ? `Read this classical Arabic poem by ${item.author}.`
      : `Read this Arabic article about ${item.title}.`,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { item, vocabMap } = await fetchLiteratureBySlug(decodeURIComponent(slug))
  if (!item) notFound()

  return <LiteratureDetailPage item={item} vocabMap={vocabMap} />
}
