import { describe, expect, it } from 'vitest'
import { paginateParagraphs, READER_BLOCKS_PER_PAGE } from './readingPagination'
import type { PublicBookBlock } from '@/app/actions/books'

function block(overrides: Partial<PublicBookBlock> = {}): PublicBookBlock {
  return { tokens: [{ arabic: 'كتاب', english: 'book', entryType: 'word' }], translation: 'book', ...overrides }
}

describe('paginateParagraphs', () => {
  it('returns a single empty page for empty content', () => {
    expect(paginateParagraphs([])).toEqual([[]])
  })

  it('keeps whole paragraphs together when they fit the budget', () => {
    const paragraphs = [
      [block({ paragraph_end: true }), block({ paragraph_end: true })],
      [block({ paragraph_end: true })],
    ]
    const pages = paginateParagraphs(paragraphs, READER_BLOCKS_PER_PAGE)
    expect(pages.flat().flat()).toHaveLength(3)
    expect(pages[0]).toEqual(paragraphs)
  })

  it('starts a new page once the block budget is met at a paragraph end', () => {
    const paragraphs = Array.from({ length: 6 }, () => [block({ paragraph_end: true })])
    const pages = paginateParagraphs(paragraphs, 4)
    expect(pages).toHaveLength(2)
    expect(pages[0].flat()).toHaveLength(4)
    expect(pages[1].flat()).toHaveLength(2)
  })

  it('hard-splits a paragraph that exceeds the whole budget', () => {
    const bigParagraph = [Array.from({ length: READER_BLOCKS_PER_PAGE * 2 + 1 }, () => block({ paragraph_end: false }))]
    const pages = paginateParagraphs(bigParagraph, READER_BLOCKS_PER_PAGE)
    expect(pages.length).toBeGreaterThan(1)
    expect(pages.flat().flat()).toHaveLength(READER_BLOCKS_PER_PAGE * 2 + 1)
  })
})

it('keeps an explicitly marked long paragraph intact rather than slicing its meaning',()=>{
 const paragraph=Array.from({length:30},(_,i)=>block({paragraph:1,paragraph_start:i===0,paragraph_end:i===29}))
 expect(paginateParagraphs([paragraph],12)).toEqual([[paragraph]])
})
it('is lossless and uses moderately larger responsive targets',()=>{
 const paragraphs=Array.from({length:120},(_,i)=>[block({translation:String(i),paragraph:i+1})])
 const old=paginateParagraphs(paragraphs,8),mobile=paginateParagraphs(paragraphs,12),desktop=paginateParagraphs(paragraphs,14)
 expect([old.length,mobile.length,desktop.length]).toEqual([15,10,9])
 for(const pages of [mobile,desktop])expect(pages.flat(2)).toEqual(paragraphs.flat())
 expect(mobile[1][0][0]).toBe(paragraphs[12][0])
 expect(mobile[0].at(-1)?.at(-1)).toBe(paragraphs[11][0])
})
