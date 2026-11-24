'use client'
import dynamic from 'next/dynamic'
import { Alert } from '@mui/material'
import { Component, type ReactNode } from 'react'
import { GrammarProvider } from '@/app/grammar/GrammarUI'
import type { MemoryLibrary } from '@/app/actions/memory'
import type { PuzzleVocabularySource, WordSearchPuzzle } from '@/app/lib/transcriptPuzzles'
import type { WebsiteQuestion } from '@/app/grammar/websiteQuestions'
const WordSearch = dynamic(() => import('@/app/word-search/WordSearchGame'))
const Memory = dynamic(() => import('@/app/memory/MemoryPage'))
const Activity = dynamic(() => import('@/app/grammar/WebsiteActivity'))
class ActivityBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Alert severity="warning">This activity could not load. Refresh to retry; the other activities are available.</Alert> : this.props.children }
}
export function PuzzleActivity({ source, puzzle }: { source: PuzzleVocabularySource; puzzle: WordSearchPuzzle }) {
  return <ActivityBoundary><WordSearch embedded initialSource={source} initialPuzzle={puzzle} /></ActivityBoundary>
}
export function GrammarActivity({ question }: { question: WebsiteQuestion }) {
  return <ActivityBoundary><GrammarProvider><Activity activity={question.activity} suppliedQuestions={[question]} /></GrammarProvider></ActivityBoundary>
}
export function MemoryActivity({ library }: { library: MemoryLibrary }) {
  return <ActivityBoundary><Memory embedded library={library} /></ActivityBoundary>
}
