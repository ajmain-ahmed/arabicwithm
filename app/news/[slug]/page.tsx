import { notFound } from 'next/navigation'
import { getAllArticlesWithVocab, SOURCE_REGION_MAP, buildVocabMapForText } from '@/app/lib/news'
import { fetchRssArticles } from '@/app/lib/rss'
import ArticlePage from './ArticlePage'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const local = await getAllArticlesWithVocab()
  return local.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const allArticles = await getAllArticlesWithVocab()
  const article = allArticles.find((a) => a.slug === slug)
  if (!article) return { title: 'Not Found' }
  return {
    title: `${article.title} | ArabicWithM News`,
    description: article.content.slice(0, 160) || `Read this Arabic news article from ${article.source}.`,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

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
    vocabMap: {} as Record<string, import('@/app/lib/news').VocabEntry>,
  }))

  const allArticles = [...localUnified, ...rssUnified]
  const article = allArticles.find((a) => a.id === slug)
  if (!article) notFound()

  // Build vocab map for RSS articles so inline translation works
  if (article.isExternal && !article.vocabMap) {
    const text = (article.body || '') + ' ' + (article.summary || '')
    article.vocabMap = await buildVocabMapForText(text)
  }

  return <ArticlePage article={article} />
}
