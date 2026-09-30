import type { Metadata } from 'next'
import { connection } from 'next/server'
import { fetchPuzzleVocabulary } from '@/app/actions/puzzles'
import { generateCrossword } from '@/app/lib/transcriptPuzzles'
import CrosswordGame from './CrosswordGame'

export const metadata: Metadata = {
  title: 'Arabic Crossword | ArabicWithM',
  description: 'Solve English vocabulary clues by entering Arabic answers from real transcripts.',
}

export default async function CrosswordPage() {
  await connection()
  const source = await fetchPuzzleVocabulary()
  const puzzle = source ? generateCrossword(source.words, { count: 8 }) : null
  return <CrosswordGame initialSource={source} initialPuzzle={puzzle} />
}
