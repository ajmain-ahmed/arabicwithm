import 'server-only'
import { unstable_cache } from 'next/cache'
import { serviceClient } from '@/app/lib/supabase'
import { platformDate } from '@/app/lib/entitlements'
import { phraseWordGlosses, type DailyPhrase } from '@/app/lib/dailyPhrase'

const load = unstable_cache(
  async (day: string): Promise<DailyPhrase | null> => {
    const { data, error } = await serviceClient.rpc(
      'website_phrase_of_day' as never,
      { p_day: day } as never,
    )
    if (error) throw new Error('Daily phrase unavailable')
    const row = data as {
      id: string
      phrase_ar_di: string
      english: string
      word_glosses?: unknown
    } | null
    return row
      ? {
          id: String(row.id),
          arabic: row.phrase_ar_di,
          english: row.english,
          words: phraseWordGlosses(row.phrase_ar_di, row.word_glosses),
        }
      : null
  },
  ['home-daily-phrase-v1'],
  { revalidate: 300, tags: ['phrases'] },
)

export async function loadDailyPhrase(now = new Date()): Promise<DailyPhrase | null> {
  try {
    return await load(platformDate(now))
  } catch {
    return null
  }
}
