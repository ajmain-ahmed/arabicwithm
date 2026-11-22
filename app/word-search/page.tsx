import type { Metadata } from 'next'
import { connection } from 'next/server'
import { fetchPuzzleVocabulary } from '@/app/actions/puzzles'
import { generateWordSearch } from '@/app/lib/transcriptPuzzles'
import WordSearchGame from './WordSearchGame'

export const metadata: Metadata = {
  title: 'Arabic Word Search',
  description: 'Find useful Arabic vocabulary selected from real transcripts and graded books.',
  alternates: { canonical: '/word-search' },
}

export default async function WordSearchPage() {
  await connection()
  const source = await fetchPuzzleVocabulary()
  const puzzle = source ? generateWordSearch(source.words, { difficulty: 'regular' }) : null
  return <WordSearchGame initialSource={source} initialPuzzle={puzzle} />
}
