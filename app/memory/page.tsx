import type { Metadata } from 'next'
import { fetchMemoryLibrary } from '@/app/actions/memory'
import MemoryPage from './MemoryPage'
import { unstable_rethrow } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Memory Flashcards | ArabicWithM',
  description: 'Practise Arabic and English phrases from real cartoon transcripts.',
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ show?: string | string[]; episode?: string | string[]; new?: string | string[]; deck?: string | string[] }>
}) {
  const query = await searchParams
  const showId = typeof query.show === 'string' ? query.show : undefined
  const episodeId = typeof query.episode === 'string' ? query.episode : undefined
  const newOnly = query.new === '1'
  const sessionKey = typeof query.deck === 'string' ? query.deck : 'initial'

  let library
  let loadError: string | undefined
  try {
    library = await fetchMemoryLibrary({ showId, episodeId, newOnly })
  } catch (error) {
    unstable_rethrow(error)
    console.error('[memory page render]', error)
    library = { cards: [], shows: [], scope: 'global' as const, scopeTitle: 'Memory', missingScope: false, recommendedCardCount: 5 as const, availableCardCount: 0, newOnly }
    loadError = 'Memory could not be loaded. Please try again shortly.'
  }
  return <MemoryPage key={sessionKey} library={library} loadError={loadError} />
}
