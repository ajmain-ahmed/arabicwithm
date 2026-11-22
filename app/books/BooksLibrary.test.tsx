import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/app/books/useBookCatalogueRefresh', () => ({ default: () => {} }))

import BooksLibrary, { type LibraryBook } from './BooksLibrary'

const books: LibraryBook[] = [
  { id: 'one', slug: 'one', title: 'Test Book', tags: ['Story'], category: 'Fiction', chapterCount: 2, premiumExempt: false, cover: '/covers/one.webp' },
  { id: 'two', slug: 'two', title: 'Another Book', tags: ['Story'], category: 'Fiction', chapterCount: 3, premiumExempt: false, cover: '/covers/two.webp' },
]

it('renders one catalogue instead of repeating books across mobile genre grids', () => {
  const html = renderToStaticMarkup(<BooksLibrary books={books} audioLanguagesByBook={{}} />)
  expect(html.match(/Test Book cover/g)).toHaveLength(1)
  expect(html.match(/Another Book cover/g)).toHaveLength(1)
  expect(html).not.toContain('data-mobile-read-sections')
  expect(html).not.toContain('data-all-books-row')
})
