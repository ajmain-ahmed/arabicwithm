import { parseReadingList } from '@/app/lib/readingList'
import { parseBookSentenceBookmark, bookSentenceBookmarkHref } from '@/app/lib/bookSentenceBookmark'

export function continueReading<B extends {slug:string;title:string}>(books:B[], chapters:Record<string,{slug:string;title:string}[]>,metadata:Record<string,unknown>) {
  const progress=parseReadingList(metadata.book_progress)
  const bookmark=parseBookSentenceBookmark(metadata.book_sentence_bookmark)
  const candidates=Object.entries(progress).flatMap(([slug,entry])=>{
    const book=books.find(book=>book.slug===slug),chapter=chapters[slug]?.find(chapter=>chapter.slug===entry.chapterSlug)
    if(!book||!chapter||entry.hiddenFromList)return []
    const time=typeof entry.updatedAt==='string'?Date.parse(entry.updatedAt):0
    return [{book,chapter,time:Number.isFinite(time)?time:0,href:`/books/${encodeURIComponent(slug)}/${encodeURIComponent(chapter.slug)}`}]
  })
  if(bookmark&&!progress[bookmark.bookSlug]?.hiddenFromList){
    const book=books.find(book=>book.slug===bookmark.bookSlug),chapter=chapters[bookmark.bookSlug]?.find(chapter=>chapter.slug===bookmark.chapterSlug)
    if(book&&chapter)candidates.push({book,chapter,time:Date.parse(bookmark.savedAt),href:bookSentenceBookmarkHref(bookmark)})
  }
  return candidates.sort((a,b)=>b.time-a.time||Number(b.href.includes('#sentence-'))-Number(a.href.includes('#sentence-')))[0]??null
}
