import type { Metadata } from 'next'
import { connection } from 'next/server'
import { fetchPuzzleVocabulary } from '@/app/actions/puzzles'
import { generateWordSearch } from '@/app/lib/transcriptPuzzles'
import WordSearchGame from './WordSearchGame'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import SignInRequired from '@/app/components/SignInRequired'

export const metadata: Metadata = {
  title: 'Arabic Word Search | ArabicWithM',
  description: 'Find useful Arabic vocabulary selected from real transcripts and graded books.',
}

export default async function WordSearchPage() {
  await connection()
  if (!await getAuthenticatedUserId()) return <SignInRequired title="Sign in to play Word Search and earn XP" />
  const source = await fetchPuzzleVocabulary()
  const puzzle = source ? generateWordSearch(source.words, { count: 8 }) : null
  return <WordSearchGame initialSource={source} initialPuzzle={puzzle} />
}
