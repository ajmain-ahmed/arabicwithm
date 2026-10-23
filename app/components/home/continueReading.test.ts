import {expect,it} from 'vitest'
import {continueReading} from './continueReading'
const books=[{slug:'a',title:'First'},{slug:'b',title:'Second'}],chapters={a:[{slug:'one',title:'Chapter 1'}],b:[{slug:'seven',title:'Chapter 7'}]}
it('resumes the most recently opened valid book and exact chapter',()=>{
 expect(continueReading(books,chapters,{book_progress:{a:{chapterSlug:'one',updatedAt:'2026-10-01'},b:{chapterSlug:'seven',updatedAt:'2026-10-23'}}})?.href).toBe('/books/b/seven')
})
it('skips removed chapters, hidden entries and missing books without inventing history',()=>{
 expect(continueReading(books,chapters,{book_progress:{a:{chapterSlug:'missing'},b:{chapterSlug:'seven',hiddenFromList:true},gone:{chapterSlug:'one'}}})).toBeNull()
 expect(continueReading(books,chapters,{})).toBeNull()
})
it('uses the saved sentence only when it is at least as recent as chapter progress',()=>{
 const bookmark={bookSlug:'a',bookTitle:'First',chapterSlug:'one',chapterTitle:'Chapter 1',blockIndex:4,arabic:'كتاب',translation:'book',savedAt:'2026-10-23'}
 expect(continueReading(books,chapters,{book_sentence_bookmark:bookmark})?.href).toBe('/books/a/one#sentence-4')
 expect(continueReading(books,chapters,{book_sentence_bookmark:bookmark,book_progress:{b:{chapterSlug:'seven',updatedAt:'2026-10-24'}}})?.href).toBe('/books/b/seven')
})
