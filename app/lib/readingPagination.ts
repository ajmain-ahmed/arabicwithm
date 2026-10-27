import type { PublicBookBlock } from '@/app/actions/books'

/* Soft pagination for the line-by-line reader: whole paragraphs per page so
   typography never splits mid-thought, with a hard split only when a single
   paragraph exceeds the page budget (rare). */

export const READER_BLOCKS_PER_PAGE = 8

export function paginateParagraphs(
  paragraphs: PublicBookBlock[][],
  perPage = READER_BLOCKS_PER_PAGE,
): PublicBookBlock[][][] {
  /* Each entry in `paragraphs` is already a whole paragraph; entries longer
     than double the budget (rare) are chunked so one paragraph can never
     swallow the chapter's pagination. */
  const normalized: { paragraph: PublicBookBlock[]; endsParagraph: boolean }[] = []
  for (const paragraph of paragraphs) {
    if (paragraph.length <= perPage * 2) {
      normalized.push({ paragraph, endsParagraph: true })
      continue
    }
    for (let start = 0; start < paragraph.length; start += perPage) {
      normalized.push({ paragraph: paragraph.slice(start, start + perPage), endsParagraph: true })
    }
  }
  const pages: PublicBookBlock[][][] = []
  let current: PublicBookBlock[][] = []
  let count = 0
  for (const { paragraph, endsParagraph } of normalized) {
    current.push(paragraph)
    count += paragraph.length
    if (count >= perPage && endsParagraph) {
      pages.push(current)
      current = []
      count = 0
    }
  }
  if (current.length > 0) pages.push(current)
  return pages.length > 0 ? pages : [[]]
}

export function pageCount(paragraphs: PublicBookBlock[][]): number {
  return paginateParagraphs(paragraphs).length
}
