// app/learn/reading/written/[slug]/page.tsx
// Server Component — loads book data and passes to client reader.

import { notFound } from 'next/navigation'
import { getBook, getAllBookSlugs } from '@/app/lib/books'
import BookReaderPage from './BookReaderPage'

export async function generateStaticParams() {
  return getAllBookSlugs()
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> } ) {
  const { slug } = await params
  const book = getBook(slug)
  return {
    title: book ? `${book.meta.title} | ArabicWithM` : 'Book | ArabicWithM',
    description: book?.meta.description ?? 'Read Arabic with inline vocabulary and annotations.',
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const book = getBook(slug)
  if (!book) return notFound()
  return <BookReaderPage book={book} />
}
