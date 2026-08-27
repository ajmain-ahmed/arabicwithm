import type { Metadata } from 'next'
import { fetchMemoryLibrary } from '@/app/actions/memory'
import MemoryPage from './MemoryPage'

export const metadata: Metadata = {
  title: 'Memory Flashcards | ArabicWithM',
  description: 'Practise Arabic and English phrases from real cartoon transcripts.',
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ show?: string | string[]; episode?: string | string[] }>
}) {
  const query = await searchParams
  const showId = typeof query.show === 'string' ? query.show : undefined
  const episodeId = typeof query.episode === 'string' ? query.episode : undefined

  let library
  let loadError: string | undefined
  try {
    library = await fetchMemoryLibrary({ showId, episodeId })
  } catch (error) {
    library = { cards: [], shows: [], scope: 'global' as const, scopeTitle: 'Memory', missingScope: false }
    loadError = error instanceof Error ? error.message : 'Memory could not be loaded.'
  }
  return <MemoryPage library={library} loadError={loadError} />
}
