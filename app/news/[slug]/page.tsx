import { notFound } from 'next/navigation'
import { parseArticle, type ParsedArticle } from '@/app/lib/news'
import ArticlePage from './ArticlePage'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const { getAllParsedArticlesByLevel } = await import('@/app/lib/news')
  const byLevel = await getAllParsedArticlesByLevel()
  const slugs: { slug: string }[] = []
  for (const articles of Object.values(byLevel)) {
    for (const a of articles) {
      slugs.push({ slug: a.slug })
    }
  }
  return slugs
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await parseArticle(slug)
  if (!article) return { title: 'Not Found' }
  return {
    title: `${article.title} | ArabicWithM News`,
    description: article.titleEnglish || `Read this Arabic news article at ${article.level} level.`,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await parseArticle(slug)
  if (!article) notFound()
  return <ArticlePage article={article} />
}
