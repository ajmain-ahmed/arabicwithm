import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }))
import LibraryBookCard from './LibraryBookCard'
import type { LibraryBook } from './BooksLibrary'

const book: LibraryBook = {
  id: 'book', slug: 'book', title: 'Test Book', tags: [], chapterCount: 2,
  premiumExempt: false, cover: '/covers/book.webp',
}

it('shows the available audiobook languages on the cover', () => {
  const html = renderToStaticMarkup(<LibraryBookCard book={book} audioLanguages={['ar', 'en']} />)
  expect(html).toContain('Audiobook available in Arabic and English')
  expect(html).not.toContain('AR · EN')
})

it('omits the badge for reading-only books', () => {
  const html = renderToStaticMarkup(<LibraryBookCard book={book} />)
  expect(html).not.toContain('Audiobook available')
})

it('marks unreleased books as in production without hiding their audiobook badge', () => {
  const html = renderToStaticMarkup(<LibraryBookCard book={{ ...book, isCompleted: false }} audioLanguages={['ar']} />)
  expect(html).toContain('In production — coming soon')
  expect(html).toContain('Audiobook available in Arabic')
})

it('does not mark released books as in production', () => {
  const html = renderToStaticMarkup(<LibraryBookCard book={book} />)
  expect(html).not.toContain('In production')
})

it('uses the existing responsive cover variants', () => {
  const cover = 'https://project.supabase.co/storage/v1/object/public/covers/books/book.webp?v=current'
  const html = renderToStaticMarkup(<LibraryBookCard book={{ ...book, cover }} />)
  expect(html).toContain('variants/books/book-640.webp?v=current 640w')
  expect(html).toContain('variants/books/book-1080.webp?v=current 1080w')
})
