import { randomUUID } from 'node:crypto'

/** Existing flat covers/books namespace, with an immutable name per attempt. */
export function bookCoverUploadPath(requestedPath: string): string {
  const identifier = requestedPath.slice('books/'.length, -'.webp'.length).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || 'book'
  return `books/${identifier}--${randomUUID()}.webp`
}
