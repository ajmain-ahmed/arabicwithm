import type { PublicBookBlock } from '@/app/actions/books'

export const READER_BLOCKS_PER_PAGE = 12
export const DESKTOP_READER_BLOCKS_PER_PAGE = 14

/** Whole paragraph units, with sentence-pair fallback for unmarked legacy text. */
export function paginateParagraphs(paragraphs:PublicBookBlock[][],perPage=READER_BLOCKS_PER_PAGE):PublicBookBlock[][][]{
 const budget=Math.max(1,Math.trunc(perPage)||READER_BLOCKS_PER_PAGE)
 const units:PublicBookBlock[][]=[]
 for(const paragraph of paragraphs){
  if(!paragraph.length)continue
  const marked=paragraph.some(block=>block.paragraph_start||block.paragraph_end||typeof block.paragraph==='number')
  if(!marked&&paragraph.length>budget*2){
   // Without paragraph boundaries, each block is still an indivisible
   // Arabic/translation pair. Never mount an entire legacy chapter at once.
   for(let i=0;i<paragraph.length;i+=budget)units.push(paragraph.slice(i,i+budget))
  }else units.push(paragraph)
 }
 const pages:PublicBookBlock[][][]=[]
 let current:PublicBookBlock[][]=[],count=0
 for(const unit of units){
  current.push(unit);count+=unit.length
  if(count>=budget){pages.push(current);current=[];count=0}
 }
 if(current.length)pages.push(current)
 return pages.length?pages:[[]]
}
export function pageCount(paragraphs:PublicBookBlock[][]):number{return paginateParagraphs(paragraphs).length}

/** Stable source offsets continue to work when responsive page sizes change. */
export function readerPageForBlock(starts:number[],block:number):number{
 let page=0
 for(let i=1;i<starts.length&&starts[i]<=block;i++)page=i
 return page+1
}
