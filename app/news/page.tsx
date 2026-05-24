import { getAllArticlesWithVocab, SOURCE_REGION_MAP } from '@/app/lib/news'
import { fetchRssArticles } from '@/app/lib/rss'
import NewsPage from './NewsPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Arabic News | ArabicWithM',
    description: 'Read Arabic news articles with inline vocabulary support. Live feeds from BBC Arabic, France24, CNN Arabic, Sky News Arabia, and more.',
  }
}

export default async function Page() {
  const [localArticles, rssArticles] = await Promise.all([
    getAllArticlesWithVocab(),
    fetchRssArticles(),
  ])

  const localUnified = localArticles.map((a) => ({
    id: a.slug,
    title: a.title,
    summary: '',
    body: a.content,
    image: a.image,
    date: a.date,
    source: a.source,
    sourceLabel: a.source,
    url: `/news/${a.slug}`,
    isExternal: false as const,
    topics: a.topics,
    cefr: a.cefr,
    region: SOURCE_REGION_MAP[a.source] || 'Other',
    vocabMap: a.vocabMap,
  }))

  const rssUnified = rssArticles.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    body: a.body,
    image: a.image,
    date: a.date,
    source: a.source,
    sourceLabel: a.sourceLabel,
    url: a.url,
    isExternal: true as const,
    topics: a.topics,
    region: SOURCE_REGION_MAP[a.source] || 'Other',
  }))

  const PRIORITY_SOURCES = ['cnn-arabic', 'skynews-arabia', 'france24-arabic', 'bbc-arabic']
  const allArticles = [...localUnified, ...rssUnified].sort((a, b) => {
    const aHasImage = Boolean(a.image)
    const bHasImage = Boolean(b.image)
    if (aHasImage && !bHasImage) return -1
    if (!aHasImage && bHasImage) return 1

    const aPriority = PRIORITY_SOURCES.includes(a.source) ? 1 : 0
    const bPriority = PRIORITY_SOURCES.includes(b.source) ? 1 : 0
    if (aPriority !== bPriority) return bPriority - aPriority

    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const sources = Array.from(new Set(allArticles.map((a) => a.sourceLabel)))
  const topics = Array.from(new Set(allArticles.flatMap((a) => a.topics)))
  const regions = Array.from(new Set(allArticles.map((a) => a.region).filter(Boolean) as string[]))

  return <NewsPage articles={allArticles} topics={topics} sources={sources} regions={regions} />
}
