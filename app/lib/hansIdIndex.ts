import 'server-only'
import { unstable_cache } from 'next/cache'
import { serviceClient } from '@/app/lib/supabase'
import { withDataDeadline } from '@/app/lib/boundedFetch'

// IDs are small and stable. Fetch no dictionary text for the cached index.
const loadIds = unstable_cache(() => withDataDeadline(8000, async () => {
  const ids: number[] = []
  let after: number | null = null
  for (;;) {
    let query = serviceClient.from('hanswehr_dictionary').select('id').order('id').limit(1000)
    if (after !== null) query = query.gt('id', after)
    const { data, error } = await query
    if (error) throw new Error('Unable to load the Hans ID index.')
    const page = (data ?? []).map(row => Number(row.id))
    if (!page.length) return ids
    const last = page[page.length - 1]
    if (!Number.isInteger(last) || (after !== null && last <= after)) throw new Error('Unable to read the next Hans ID page.')
    ids.push(...page)
    after = last
  }
}), ['admin-hans-id-index-v1'], { revalidate: 3600, tags: ['hans-wehr-ids'] })

export async function matchingHansIds(term: string): Promise<number[]> {
  return (await loadIds()).filter(id => String(id).includes(term))
}
