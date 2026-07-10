import { getAllParsedArticlesByLevel } from '@/app/lib/news'
import { fetchRssArticles } from '@/app/lib/rss'
import NewsPage from './NewsPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Arabic News | ArabicWithM',
    description: 'Read Arabic news articles with graded reading from A0 to C2. Live feeds from CNN Arabic and France24 Arabic.',
  }
}

export default async function Page() {
  const [articlesByLevel, rssArticles] = await Promise.all([
    getAllParsedArticlesByLevel(),
    fetchRssArticles(),
  ])

  return <NewsPage articlesByLevel={articlesByLevel} rssArticles={rssArticles} />
}
