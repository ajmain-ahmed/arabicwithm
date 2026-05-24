// app/lib/rss.ts
// RSS feed fetcher and parser for Arabic news sources

import { XMLParser } from 'fast-xml-parser'

export interface RssArticle {
  id: string
  title: string
  summary: string
  body: string
  image: string
  date: string
  source: string
  sourceLabel: string
  url: string
  isExternal: true
  topics: string[]
}

const RSS_SOURCES = [
  {
    key: 'cnn-arabic',
    label: 'CNN Arabic',
    url: 'https://arabic.cnn.com/rss',
    region: 'UAE',
  },
  {
    key: 'france24-arabic',
    label: 'France24 Arabic',
    url: 'https://www.france24.com/ar/rss',
    region: 'France',
  },
  {
    key: 'al-sharq',
    label: 'Al-Sharq',
    url: 'https://al-sharq.com/rss/latestNews',
    region: 'Qatar',
  },
  {
    key: 'bbc-arabic',
    label: 'BBC Arabic',
    url: 'https://feeds.bbci.co.uk/arabic/rss.xml',
    region: 'UK',
  },
  {
    key: 'skynews-arabia',
    label: 'Sky News Arabia',
    url: 'https://www.skynewsarabia.com/rss.xml',
    region: 'UAE',
  },
]

export const RSS_REGIONS = Array.from(new Set(RSS_SOURCES.map((s) => s.region)))

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ── English topic inference from Arabic RSS items ── */

const CATEGORY_MAP: Record<string, string> = {
  'الشرق الأوسط': 'Middle East',
  'السعودية': 'Saudi Arabia',
  'الأمن السعودي': 'Security',
  'الحج': 'Religion',
  'الشرطة السعودية': 'Security',
  'مكة': 'Religion',
  'أمريكا': 'Americas',
  'إيران': 'Iran',
  'أسلحة نووية': 'Nuclear',
  'الاتفاق النووي الإيراني': 'Iran',
  'البرنامج النووي': 'Nuclear',
  'البرنامج النووي الإيراني': 'Iran',
  'العالم': 'World',
  'اقتصاد': 'Economy',
  'رياضة': 'Sports',
  'صحة': 'Health',
  'تكنولوجيا': 'Technology',
  'ثقافة': 'Culture',
  'علوم': 'Science',
  'فن': 'Arts',
  'سياسة': 'Politics',
  'تعليم': 'Education',
  'بيئة': 'Environment',
  'طاقة': 'Energy',
}

const TITLE_TOPIC_KEYWORDS: Record<string, string[]> = {
  'Politics': ['سياسة', 'حكومة', 'وزير', 'رئيس', 'برلمان', 'مجلس', 'انتخابات', 'قمة', 'دبلوماسي', 'سوريا', 'لبنان', 'فلسطين', 'إسرائيل', 'غزة', 'حرب', 'اتفاق', 'مفاوضات', 'صفقة', 'نووي', 'سلاح', 'جيش', 'عسكري', 'احتلال', 'تهديد', 'عقوبات', 'دولة', 'دولي', 'أزمة', 'نزاع', 'سلام'],
  'Sports': ['رياضة', 'كرة القدم', 'كأس', 'بطولة', 'منتخب', 'فوز', 'هزيمة', 'لاعب', 'نادي', 'دوري', 'أولمبياد', 'تنس', 'سباحة', 'جري', 'ماراثون', 'رياضي', 'مباراة', 'هدف', 'تأهل', 'خسارة'],
  'Technology': ['تكنولوجيا', 'ذكاء اصطناعي', 'إنترنت', 'هاتف', 'تطبيق', 'ذكي', 'رقمي', 'تقني', 'اختراق', 'سيبراني', 'كمبيوتر', 'برمجة', 'تقنية', 'ذكاء', 'روبوت', 'فضاء', 'صاروخ'],
  'Economy': ['اقتصاد', 'أسعار', 'نفط', 'بورصة', 'تجارة', 'استثمار', 'مالية', 'بنك', 'عملة', 'تضخم', 'دولار', 'ريال', 'درهم', 'جنيه', 'سوق', 'تجاري', 'شركة', 'أرباح', 'خسارة مالية'],
  'Health': ['صحة', 'طب', 'كورونا', 'فيروس', 'مستشفى', 'دواء', 'لقاح', 'وباء', 'مرض', 'علاج', 'طبيب', 'صحي', 'وبائي', 'وباء'],
  'Culture': ['ثقافة', 'فن', 'سينما', 'موسيقى', 'كتاب', 'أدب', 'تراث', 'فنان', 'مهرجان', 'فني', 'إبداع', 'تاريخ'],
  'Science': ['علم', 'فضاء', 'فلك', 'مناخ', 'بيئة', 'طاقة', 'نووي سلمي', 'بحث', 'اكتشاف', 'دراسة', 'علمي'],
}

function inferTopics(title: string, rawCategories: string[]): string[] {
  const topics = new Set<string>()

  // 1. Map explicit Arabic categories
  for (const cat of rawCategories) {
    const mapped = CATEGORY_MAP[cat.trim()]
    if (mapped) topics.add(mapped)
  }

  // 2. Infer from title keywords
  for (const [topic, keywords] of Object.entries(TITLE_TOPIC_KEYWORDS)) {
    for (const kw of keywords) {
      if (title.includes(kw)) {
        topics.add(topic)
        break
      }
    }
  }

  // 3. Fallback: if still empty, try broad matches
  if (topics.size === 0) {
    topics.add('World')
  }

  return Array.from(topics).slice(0, 3)
}

type RssItemAttr = Record<string, unknown>

function getAttr(obj: unknown, key: string): unknown {
  if (obj && typeof obj === 'object') {
    return (obj as RssItemAttr)[key]
  }
  return undefined
}

function upscaleImage(url: string, source: string): string {
  if (!url) return ''
  // BBC images: replace /ws/240/ with /ws/800/ for higher quality
  if (source === 'bbc-arabic') {
    return url.replace(/\/ws\/\d+\//, '/ws/800/')
  }
  return url
}

function extractImage(item: Record<string, unknown>, sourceKey: string): string {
  // Try media:thumbnail
  const thumb = item['media:thumbnail']
  if (thumb) {
    if (Array.isArray(thumb)) {
      const sorted = thumb
        .filter((t) => getAttr(t, '@_url'))
        .sort((a, b) => {
          const wa = parseInt(String(getAttr(a, '@_width') || '0'), 10)
          const wb = parseInt(String(getAttr(b, '@_width') || '0'), 10)
          return wb - wa
        })
      if (sorted.length > 0) {
        return upscaleImage(String(getAttr(sorted[0], '@_url') || ''), sourceKey)
      }
    } else if (getAttr(thumb, '@_url')) {
      return upscaleImage(String(getAttr(thumb, '@_url') || ''), sourceKey)
    }
  }

  // Try enclosure
  const enclosure = item.enclosure
  if (enclosure) {
    if (Array.isArray(enclosure)) {
      const img = enclosure.find((e) => String(getAttr(e, '@_type') || '').startsWith('image/'))
      if (img) return upscaleImage(String(getAttr(img, '@_url') || ''), sourceKey)
    } else if (String(getAttr(enclosure, '@_type') || '').startsWith('image/')) {
      return upscaleImage(String(getAttr(enclosure, '@_url') || ''), sourceKey)
    }
  }

  // Try media:content
  const content = item['media:content']
  if (content) {
    if (Array.isArray(content)) {
      const img = content.find((c) => String(getAttr(c, '@_type') || '').startsWith('image/'))
      if (img) return upscaleImage(String(getAttr(img, '@_url') || ''), sourceKey)
    } else if (String(getAttr(content, '@_type') || '').startsWith('image/') || getAttr(content, '@_url')) {
      return upscaleImage(String(getAttr(content, '@_url') || ''), sourceKey)
    }
  }

  // Try media:img (Akhbarona specific)
  const mediaImg = item['media:img']
  if (mediaImg && getAttr(mediaImg, 'url')) {
    return upscaleImage(String(getAttr(mediaImg, 'url') || ''), sourceKey)
  }

  return ''
}

async function fetchSingleFeed(source: typeof RSS_SOURCES[0]): Promise<RssArticle[]> {
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ArabicWithM/1.0)' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[RSS] Failed to fetch ${source.label}: ${res.status}`)
      return []
    }

    const xml = await res.text()

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: false,
    })

    const parsed = parser.parse(xml) as Record<string, unknown>
    const rss = parsed.rss as Record<string, unknown> | undefined
    const channel = rss?.channel as Record<string, unknown> | undefined
    const items = channel?.item

    if (!items) return []

    const itemArray = Array.isArray(items) ? items : [items]

    return itemArray.slice(0, 12).map((item: Record<string, unknown>, index: number): RssArticle => {
      const title = stripHtml(String(item.title || ''))
      const summary = stripHtml(String(item.description || ''))
      const body = stripHtml(String((item['content:encoded'] as string) || summary))
      const image = extractImage(item, source.key)
      const link = String(item.link || '')
      const date = String(item.pubDate || new Date().toISOString())
      const category = item.category
      const rawCategories = Array.isArray(category)
        ? category.map((c: unknown) => (typeof c === 'string' ? c : String((c as Record<string, unknown>)['#text'] || ''))).filter(Boolean)
        : category
          ? [typeof category === 'string' ? category : String((category as Record<string, unknown>)['#text'] || '')].filter(Boolean)
          : []

      const topics = inferTopics(title, rawCategories)

      return {
        id: `${source.key}-${index}`,
        title,
        summary,
        body,
        image,
        date,
        source: source.key,
        sourceLabel: source.label,
        url: link,
        isExternal: true,
        topics,
      }
    })
  } catch (e) {
    console.error(`[RSS] Error fetching ${source.label}:`, e)
    return []
  }
}

export async function fetchRssArticles(): Promise<RssArticle[]> {
  const results = await Promise.all(RSS_SOURCES.map(fetchSingleFeed))
  const all = results.flat()
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
