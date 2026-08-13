/**
 * One-based sentence numbers that begin a new paragraph in each book chapter.
 * Keeping this separate from the chapter tokens lets us improve the reading
 * layout without changing any story, translation, or dictionary data.
 */
const PARAGRAPH_STARTS_BY_CHAPTER: Readonly<Record<string, readonly number[]>> = {
  'lay-1': [1, 3, 6, 8],
  'lay-2': [1, 4, 8],
  'lay-3': [1, 3, 5, 7, 11],
  'lay-4': [1, 3, 5, 7, 10, 12],
  'lay-5': [1, 4, 6, 8, 10],
  'lay-6': [1, 3, 6, 9],
  'lay-7': [1, 5, 8, 10, 14, 20],
  'lay-8': [1, 5, 7, 11],
  'lay-9': [1, 4, 7, 10, 12, 15],
  'lay-10': [1, 5, 7, 9, 12],
  'lay-11': [1, 5, 7, 9],
  'stranger-1': [1, 5, 8, 11, 14, 17, 21, 25, 29, 32, 36, 39, 43, 46, 48],
  'stranger-2': [1, 4, 9, 15, 18, 24, 26, 29, 36, 39],
  'stranger-3': [1, 6, 9, 14, 20, 25, 31, 37, 43],
  'stranger-4': [1, 4, 10, 13, 19, 23, 29, 33, 39, 41, 45, 48, 51, 55],
  'stranger-5': [1, 4, 10, 13, 19, 25, 28, 33, 38, 43, 47, 50],
  'stranger-6': [1, 5, 8, 11, 15, 19, 25, 29, 32, 35, 39, 42, 45, 48, 51, 56],
  'stranger-7': [1, 6, 10, 14, 17, 21, 25, 27, 31, 34, 40, 43, 45, 47, 50],
  'stranger-8': [1, 8, 12, 15, 20, 23, 30, 33],
}

export function groupChapterBlocks<T>(chapterSlug: string, blocks: readonly T[]): T[][] {
  if (blocks.length === 0) return []

  const configuredStarts = PARAGRAPH_STARTS_BY_CHAPTER[chapterSlug]
  if (!configuredStarts) return [Array.from(blocks)]

  const starts = new Set(configuredStarts.map((sentenceNumber) => sentenceNumber - 1))
  const paragraphs: T[][] = []

  blocks.forEach((block, index) => {
    if (index === 0 || starts.has(index)) paragraphs.push([])
    paragraphs[paragraphs.length - 1].push(block)
  })

  return paragraphs
}
