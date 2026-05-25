'use server'

import { unstable_cache } from 'next/cache'
import { buildVocabMapForText } from '@/app/lib/news'

const QAFIYAH_BASE = 'https://api.qafiyah.com'
const WIKI_API = 'https://ar.wikipedia.org/w/api.php'

export interface Poem {
  id: string
  type: 'poem'
  title: string
  author: string
  content: string
  source: string
}

export interface WikiArticle {
  id: string
  type: 'article'
  title: string
  content: string
  image?: string
  source: string
  url: string
}

export type LiteratureItem = Poem | WikiArticle

/* ── Qafiyah API (Arabic poetry) ── */

async function fetchRandomPoem(seed: string): Promise<Poem | null> {
  try {
    // Add cache-busting param so Next.js doesn't deduplicate parallel requests
    const res = await fetch(`${QAFIYAH_BASE}/poems/random?cb=${seed}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text.trim()) return null

    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return null

    const author = lines[lines.length - 1]
    const content = lines.slice(0, -1).join('\n')
    const hash = await simpleHash(text)

    return {
      id: `poem-${hash}`,
      type: 'poem',
      title: author ? `بيت شعر — ${author}` : 'بيت شعر',
      author,
      content,
      source: 'قافية',
    }
  } catch (e) {
    console.error('[fetchRandomPoem] error:', e)
    return null
  }
}

export async function fetchPoems(count: number = 8): Promise<Poem[]> {
  const poems: Poem[] = []
  const seen = new Set<string>()

  // Fetch in parallel batches to improve uniqueness chances
  for (let batch = 0; batch < 5 && poems.length < count; batch++) {
    const batchSize = Math.min(count - poems.length, 4)
    const batchResults = await Promise.all(
      Array.from({ length: batchSize }, (_, i) => fetchRandomPoem(`${batch}-${i}-${Date.now()}`))
    )
    for (const poem of batchResults) {
      if (poem && !seen.has(poem.id)) {
        seen.add(poem.id)
        poems.push(poem)
      }
    }
  }

  return poems
}

/* ── Cached poem fetch ── */
export const fetchCachedPoems = unstable_cache(
  async (count: number = 8) => fetchPoems(count),
  ['literature-poems'],
  { revalidate: 300, tags: ['literature-poems'] }
)

/* ── Arabic Wikipedia articles ── */

const WIKI_CURATED_TOPICS = [
  'القاهرة',
  'بغداد',
  'دمشق',
  'الأندلس',
  'ابن_سينا',
  'الخوارزمي',
  'الجبر',
  'الكعبة',
  'النيل',
  'الصحراء_الكبرى',
  'تيمورلنك',
  'الأهرام',
  'المسجد_الأقصى',
  'القهوة',
  'الشاي',
]

async function fetchWikiSummary(title: string): Promise<WikiArticle | null> {
  try {
    const encoded = encodeURIComponent(title)
    const res = await fetch(
      `${WIKI_API}?action=query&prop=extracts|pageimages&titles=${encoded}&explaintext&exsentences=12&pithumbsize=400&format=json`,
      {
        next: { revalidate: 86400 },
        headers: { 'User-Agent': 'ArabicWithM/1.0 (contact@arabicwithm.com)' },
      }
    )
    if (!res.ok) {
      console.error(`[fetchWikiSummary] HTTP ${res.status} for ${title}`)
      return null
    }
    const data = await res.json()
    const pages = data.query?.pages
    if (!pages) {
      console.error(`[fetchWikiSummary] no pages for ${title}`)
      return null
    }

    const page = Object.values(pages)[0] as Record<string, unknown>
    if (!page || page.missing !== undefined) {
      console.error(`[fetchWikiSummary] page missing for ${title}`)
      return null
    }

    const extract = (page.extract as string) ?? ''
    if (!extract.trim()) {
      console.error(`[fetchWikiSummary] empty extract for ${title}`)
      return null
    }

    const thumbnail = (page.thumbnail as { source?: string })?.source

    return {
      id: `wiki-${title}`,
      type: 'article',
      title: (page.title as string) ?? title,
      content: extract.trim(),
      image: thumbnail,
      source: 'ويكيبيديا',
      url: `https://ar.wikipedia.org/wiki/${encoded}`,
    }
  } catch (e) {
    console.error('[fetchWikiSummary] error:', e)
    return null
  }
}

export async function fetchWikiArticles(): Promise<WikiArticle[]> {
  const shuffled = [...WIKI_CURATED_TOPICS].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 6)
  const results = await Promise.all(selected.map(t => fetchWikiSummary(t)))
  return results.filter((a): a is WikiArticle => a !== null)
}

/* ── Detail page helpers ── */

export async function fetchLiteratureBySlug(slug: string): Promise<{
  item: LiteratureItem | null
  vocabMap: Record<string, import('@/app/lib/news').VocabEntry>
}> {
  // Next.js sometimes passes URL-encoded slugs; decode once
  const decoded = decodeURIComponent(slug)

  if (decoded.startsWith('poem-')) {
    const poems = await fetchPoems(12)
    const poem = poems.find(p => p.id === decoded) ?? poems[0] ?? null
    if (!poem) return { item: null, vocabMap: {} }
    const vocabMap = await buildVocabMapForText(poem.content)
    return { item: poem, vocabMap }
  }

  if (decoded.startsWith('wiki-')) {
    const title = decoded.replace('wiki-', '')
    const article = await fetchWikiSummary(title)
    if (!article) return { item: null, vocabMap: {} }
    const vocabMap = await buildVocabMapForText(article.content)
    return { item: article, vocabMap }
  }

  return { item: null, vocabMap: {} }
}

/* ── Helpers ── */

async function simpleHash(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
}
