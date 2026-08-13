import type { Metadata } from 'next'
import { fetchPracticeLibrary } from '@/app/actions/practice'
import { selectPracticeWords } from '@/app/lib/practice'
import PracticeSession from './PracticeSession'

export const metadata: Metadata = {
  title: 'Practice Session | Arabic With M',
}

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ count?: string }> }) {
  const [{ count }, library] = await Promise.all([searchParams, fetchPracticeLibrary()])
  const requested = Number.parseInt(count ?? '10', 10)
  const amount = Number.isFinite(requested) ? Math.max(1, Math.min(25, requested)) : 10
  const selectedWords = selectPracticeWords(library.words, amount)

  return <PracticeSession authenticated={library.authenticated} words={selectedWords} />
}
