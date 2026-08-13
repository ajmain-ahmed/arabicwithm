import type { Metadata } from 'next'
import VocabularyPage from './VocabularyPage'

export const metadata: Metadata = {
  title: 'Arabic Vocabulary | ArabicWithM',
  description: 'Search the Hans Wehr Arabic dictionary in Arabic or English.',
}

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  return <VocabularyPage initialQuery={q ?? ''} />
}
