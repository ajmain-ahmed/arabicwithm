'use server'

import { z } from 'zod'
import { fetchExploreEpisodeByIdPublic, fetchExploreEpisodeMetasForPublic } from '@/app/actions/cartoons'
import { extractPuzzleVocabulary, type PuzzleVocabularySource } from '@/app/lib/transcriptPuzzles'

const requestSchema = z.object({ excludeEpisodeId: z.string().trim().max(100).optional() })

function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[next]] = [result[next], result[index]]
  }
  return result
}

export async function fetchPuzzleVocabulary(excludeEpisodeId?: string): Promise<PuzzleVocabularySource | null> {
  const parsed = requestSchema.safeParse({ excludeEpisodeId })
  if (!parsed.success) return null
  const metas = await fetchExploreEpisodeMetasForPublic()
  const ordered = shuffle(metas.filter((episode) => episode.id !== parsed.data.excludeEpisodeId))
  let fallback: PuzzleVocabularySource | null = null

  for (let offset = 0; offset < ordered.length; offset += 8) {
    const episodes = await Promise.all(ordered.slice(offset, offset + 8).map((meta) => fetchExploreEpisodeByIdPublic(meta.id)))
    for (const episode of episodes) {
      if (!episode) continue
      const words = extractPuzzleVocabulary(episode.transcriptLines, 24)
      if (words.length < 4) continue
      const source: PuzzleVocabularySource = {
        episodeId: episode.id,
        episodeTitle: episode.title,
        episodeSlug: episode.slug,
        showTitle: episode.showTitle,
        showSlug: episode.showSlug,
        words,
      }
      if (!fallback || source.words.length > fallback.words.length) fallback = source
      if (words.length >= 8) return source
    }
  }
  return fallback
}
