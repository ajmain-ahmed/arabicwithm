// app/learn/reading/written/page.tsx
// Server Component — reads filesystem and passes data to the client shell.

import { getAllBooks, getChaptersForBook } from '@/app/lib/books'
import WrittenBooksPage from './WrittenBooksPage'

export const metadata = {
  title: 'Written Arabic | ArabicWithM',
  description: 'Read Arabic books with inline vocabulary, grammar notes, and word-by-word annotations.',
}

export default function Page() {
  const books = getAllBooks()

  // Build a map of book slug → chapter slugs for random navigation
  const chaptersMap: Record<string, string[]> = {}
  for (const book of books) {
    const chapters = getChaptersForBook(book.slug)
    chaptersMap[book.slug] = chapters.map((ch) => ch.slug)
  }

  return <WrittenBooksPage books={books} chaptersMap={chaptersMap} />
}
