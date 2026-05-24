import { getAllArticles, getNewsMeta } from '@/app/lib/news'
import NewsPage from './NewsPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Arabic News | ArabicWithM',
    description: 'Read Arabic news articles with inline vocabulary support. Learn Arabic through real-world content.',
  }
}

export default async function Page() {
  const articles = getAllArticles()
  const meta = getNewsMeta()

  const sources = Array.from(new Set(articles.map((a) => a.source)))
  const topics = meta.topics.length > 0 ? meta.topics : Array.from(new Set(articles.flatMap((a) => a.topics)))

  return <NewsPage articles={articles} topics={topics} sources={sources} />
}
