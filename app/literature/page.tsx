import { fetchCachedPoems, fetchWikiArticles } from '@/app/actions/literature'
import LiteraturePage from './LiteraturePage'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Arabic Literature | ArabicWithM',
    description: 'Read classical Arabic poetry and encyclopedia articles with inline vocabulary support.',
  }
}

export default async function Page() {
  const [poems, articles] = await Promise.all([
    fetchCachedPoems(8),
    fetchWikiArticles(),
  ])

  return <LiteraturePage poems={poems} articles={articles} />
}
