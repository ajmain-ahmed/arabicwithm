import { describe, expect, it } from 'vitest'
import { groupChapterBlocks } from './bookParagraphs'

describe('groupChapterBlocks', () => {
  it('uses the editorial paragraph boundaries for Layla chapters', () => {
    const blocks = Array.from({ length: 9 }, (_, index) => index + 1)

    expect(groupChapterBlocks('lay-1', blocks)).toEqual([
      [1, 2],
      [3, 4, 5],
      [6, 7],
      [8, 9],
    ])
  })

  it('uses the editorial paragraph boundaries for Stranger chapters', () => {
    const blocks = Array.from({ length: 40 }, (_, index) => index + 1)
    const paragraphs = groupChapterBlocks('stranger-2', blocks)

    expect(paragraphs.map((paragraph) => paragraph[0])).toEqual([1, 4, 9, 15, 18, 24, 26, 29, 36, 39])
    expect(paragraphs.flat()).toEqual(blocks)
  })

  it('preserves one continuous passage for chapters without configured boundaries', () => {
    expect(groupChapterBlocks('another-story', ['one', 'two'])).toEqual([['one', 'two']])
  })

  it('handles an empty chapter', () => {
    expect(groupChapterBlocks('lay-1', [])).toEqual([])
  })
})
