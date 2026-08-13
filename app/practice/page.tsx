import type { Metadata } from 'next'
import { fetchPracticeLibrary } from '@/app/actions/practice'
import PracticePage from './PracticePage'

export const metadata: Metadata = {
  title: 'Practice | Arabic With M',
  description: 'Review the Arabic words and phrases you have saved while reading and watching.',
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  const library = await fetchPracticeLibrary()
  return <PracticePage authenticated={library.authenticated} initialWords={library.words} />
}
