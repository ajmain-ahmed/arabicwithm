"use server"

import { getArticle } from '@/app/lib/news'
import { ArticleFull } from '@/app/lib/news'

export async function fetchArticle(slug: string): Promise<ArticleFull | null> {
  if (!slug || typeof slug !== 'string' || slug.length > 100) {
    return null
  }
  return getArticle(slug)
}
