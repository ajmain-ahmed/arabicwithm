import { parseReadingList } from '@/app/lib/readingList'

export function continueReading<B extends {slug:string;title:string}>(books:B[], chapters:Record<string,{slug:string;title:string}[]>,metadata:Record<string,unknown>) {
  const progress=parseReadingList(metadata.book_progress)
  const candidates=Object.entries(progress).flatMap(([slug,entry])=>{
    const book=books.find(book=>book.slug===slug),chapter=chapters[slug]?.find(chapter=>chapter.slug===entry.chapterSlug)
    if(!book||!chapter||entry.hiddenFromList)return []
    const time=typeof entry.updatedAt==='string'?Date.parse(entry.updatedAt):0
    const page=typeof (entry as {page?:unknown}).page==='number'?(entry as {page:number}).page:1
    const query=page>=2?`?page=${page}`:''
    return [{book,chapter,time:Number.isFinite(time)?time:0,href:`/books/${encodeURIComponent(slug)}/${encodeURIComponent(chapter.slug)}${query}`}]
  })
  return candidates.sort((a,b)=>b.time-a.time)[0]??null
}
