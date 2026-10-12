'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { fetchExploreEpisodeByIdPublic, fetchExploreEpisodeMetasForPublic } from '@/app/actions/cartoons'
import {
  fetchExploreBookChapterMetasForPublic,
  fetchExploreBookChapterPages,
  type ExploreBookPage,
} from '@/app/actions/books'
import { calculateLearningLevel } from '@/app/lib/activity'
import { isMissingDatabaseFeature } from '@/app/lib/databaseErrors'
import { rateLimit } from '@/app/lib/rateLimit'
import { serviceClient } from '@/app/lib/supabase'
import {
  extractPuzzleVocabulary,
  type PuzzleSourceReference,
  type PuzzleVocabularySource,
} from '@/app/lib/transcriptPuzzles'
import { calculateWordSearchXp, type WordSearchCompletionStats } from '@/app/lib/wordSearchProgress'

const requestSchema = z.object({
  excludeSourceKey: z.string().trim().max(160).optional(),
  minimumWordCount: z.number().int().min(4).max(10).default(8),
})
const completionSchema = z.object({
  completionId: z.string().uuid(),
  puzzleId: z.string().uuid(),
  sourceType: z.enum(['episode', 'book']),
  sourceId: z.string().uuid(),
  difficulty: z.string().trim().max(20).optional(),
  wordCount: z.number().int().min(1).max(10),
  wordsFound: z.number().int().min(1).max(10),
  mistakes: z.number().int().min(0).max(10_000),
  hintsUsed: z.number().int().min(0).max(100),
  revealsUsed: z.number().int().min(0).max(100),
  durationSeconds: z.number().int().min(1).max(86_400),
}).refine((value) => value.wordsFound === value.wordCount, 'All puzzle words must be completed.')

function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[next]] = [result[next], result[index]]
  }
  return result
}

type SourceCandidate = PuzzleSourceReference & { sourceKey: string }

function bookLines(pages: readonly ExploreBookPage[]) {
  return pages.flatMap((page) => page.blocks.map((block) => ({
    timestamp: null,
    arabic: `${block.words.map((word) => word.arabic).join(' ')}${block.punctuation ?? ''}`.trim(),
    arabicPlain: block.words.map((word) => word.plain).join(' '),
    translation: block.translation,
    words: block.words,
    chapterNumber: page.chapterNumber,
    paragraphNumber: block.paragraphNumber,
  })))
}

async function vocabularyForCandidate(candidate: SourceCandidate): Promise<PuzzleVocabularySource | null> {
  if (candidate.type === 'episode') {
    const episode = await fetchExploreEpisodeByIdPublic(candidate.id)
    if (!episode) return null
    const words = extractPuzzleVocabulary(episode.transcriptLines, 24)
    if (words.length < 4) return null
    return { ...candidate, puzzleId: randomUUID(), words }
  }

  const pages = await fetchExploreBookChapterPages(candidate.id)
  if (pages.length === 0) return null
  const words = extractPuzzleVocabulary(bookLines(pages), 24)
  if (words.length < 4) return null
  return { ...candidate, puzzleId: randomUUID(), words }
}

export async function fetchPuzzleVocabulary(excludeSourceKey?: string, minimumWordCount = 8): Promise<PuzzleVocabularySource | null> {
  const parsed = requestSchema.safeParse({ excludeSourceKey, minimumWordCount })
  if (!parsed.success) return null
  const signedIn = Boolean(await getAuthenticatedUserId())
  const [episodeMetas, bookMetas] = await Promise.all([
    fetchExploreEpisodeMetasForPublic(),
    signedIn ? fetchExploreBookChapterMetasForPublic() : Promise.resolve([]),
  ])
  const candidates: SourceCandidate[] = [
    ...episodeMetas.map((episode) => ({
      type: 'episode' as const,
      id: episode.id,
      sourceKey: `episode:${episode.id}`,
      title: episode.showTitle,
      subtitle: episode.title,
      href: `/cartoons/${encodeURIComponent(episode.showSlug)}/${encodeURIComponent(episode.slug)}`,
      level: episode.level,
    })),
    ...bookMetas.map((chapter) => ({
      type: 'book' as const,
      id: chapter.chapterId,
      bookId: chapter.bookId,
      chapterNumber: chapter.chapterNumber,
      sourceKey: `book:${chapter.chapterId}`,
      title: chapter.bookTitle,
      subtitle: `Chapter ${chapter.chapterNumber}: ${chapter.chapterTitle}`,
      href: `/books/${encodeURIComponent(chapter.bookSlug)}/${encodeURIComponent(chapter.chapterSlug)}`,
      level: chapter.level,
    })),
  ]
  const ordered = shuffle(candidates.filter((candidate) => candidate.sourceKey !== parsed.data.excludeSourceKey))
  let fallback: PuzzleVocabularySource | null = null

  for (let offset = 0; offset < ordered.length; offset += 6) {
    const sources = await Promise.all(ordered.slice(offset, offset + 6).map(vocabularyForCandidate))
    for (const source of sources) {
      if (!source) continue
      if (!fallback || source.words.length > fallback.words.length) fallback = source
      if (source.words.length >= parsed.data.minimumWordCount) return source
    }
  }
  return fallback
}

export interface WordSearchCompletionResult {
  awarded: number
  totalXp: number
  duplicate: boolean
  previousLevel: number
  level: number
}

export async function completeWordSearch(rawInput: unknown): Promise<
  { ok: true; data: WordSearchCompletionResult }
  | { ok: false; error: string }
> {
  const parsed = completionSchema.safeParse(rawInput)
  if (!parsed.success) return { ok: false, error: 'This Word Search completion is invalid.' }
  const userId = await getAuthenticatedUserId()
  if (!userId) return { ok: false, error: 'Sign in to save Word Search XP.' }
  const limited = rateLimit(`word-search-complete:${userId}`, 12, 10 * 60 * 1000)
  if (!limited.ok) return { ok: false, error: 'Too many completion attempts. Please try again shortly.' }

  const stats: WordSearchCompletionStats = parsed.data
  const xp = calculateWordSearchXp(stats)
  const { data, error } = await serviceClient.rpc('complete_word_search', {
    p_user_id: userId,
    p_completion_id: parsed.data.completionId,
    p_puzzle_id: parsed.data.puzzleId,
    p_source_type: parsed.data.sourceType,
    p_source_id: parsed.data.sourceId,
    p_difficulty: parsed.data.difficulty ?? '',
    p_word_count: parsed.data.wordCount,
    p_words_found: parsed.data.wordsFound,
    p_mistakes: parsed.data.mistakes,
    p_hints_used: parsed.data.hintsUsed,
    p_reveals_used: parsed.data.revealsUsed,
    p_duration_seconds: parsed.data.durationSeconds,
    p_xp: xp,
  })
  if (error) {
    console.error('[word-search] completion RPC failed:', error)
    return {
      ok: false,
      error: isMissingDatabaseFeature(error)
        ? 'Word Search progress storage is not configured yet.'
        : 'Unable to save Word Search progress. Please try again.',
    }
  }

  const result = data as { awarded: number; totalXp: number; duplicate: boolean }
  const profile = await serviceClient
    .from('learning_profiles')
    .select('legacy_active_seconds, tracked_active_seconds')
    .eq('user_id', userId)
    .maybeSingle()
  const secondsAfter = profile.data
    ? Number(profile.data.legacy_active_seconds) + Number(profile.data.tracked_active_seconds)
    : parsed.data.durationSeconds
  const awarded = Number(result.awarded ?? 0)
  const totalXp = Number(result.totalXp ?? awarded)
  const previousLevel = calculateLearningLevel(
    Math.max(0, secondsAfter - (result.duplicate ? 0 : parsed.data.durationSeconds)),
    Math.max(0, totalXp - awarded),
  ).level
  const level = calculateLearningLevel(secondsAfter, totalXp).level

  return { ok: true, data: { awarded, totalXp, duplicate: Boolean(result.duplicate), previousLevel, level } }
}
