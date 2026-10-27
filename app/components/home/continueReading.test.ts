import {expect,it} from 'vitest'
import {continueReading} from './continueReading'
const books=[{slug:'a',title:'First'},{slug:'b',title:'Second'}],chapters={a:[{slug:'one',title:'Chapter 1'}],b:[{slug:'seven',title:'Chapter 7'}]}
it('resumes the most recently opened valid book and exact chapter',()=>{
 expect(continueReading(books,chapters,{book_progress:{a:{chapterSlug:'one',updatedAt:'2026-10-01'},b:{chapterSlug:'seven',updatedAt:'2026-10-23'}}})?.href).toBe('/books/b/seven')
})
it('deep-links the page for tracked positions past page one',()=>{
 expect(continueReading(books,chapters,{book_progress:{b:{chapterSlug:'seven',page:3,totalPages:9,updatedAt:'2026-10-23'}}})?.href).toBe('/books/b/seven?page=3')
 expect(continueReading(books,chapters,{book_progress:{b:{chapterSlug:'seven',page:1,updatedAt:'2026-10-23'}}})?.href).toBe('/books/b/seven')
})
it('skips removed chapters, hidden entries and missing books without inventing history',()=>{
 expect(continueReading(books,chapters,{book_progress:{a:{chapterSlug:'missing'},b:{chapterSlug:'seven',hiddenFromList:true},gone:{chapterSlug:'one'}}})).toBeNull()
 expect(continueReading(books,chapters,{})).toBeNull()
})
