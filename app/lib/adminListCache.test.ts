import { afterEach, expect, it, vi } from 'vitest'
import { AdminListCache } from './adminListCache'

afterEach(() => vi.restoreAllMocks())
it('shares in-flight reads, reuses recent data, and expires it', async () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const cache = new AdminListCache(60_000)
  const read = vi.fn().mockResolvedValue(['one'])
  await Promise.all([cache.load('books', read), cache.load('books', read)])
  await cache.load('books', read)
  expect(read).toHaveBeenCalledOnce()
  now.mockReturnValue(61_001)
  await cache.load('books', read)
  expect(read).toHaveBeenCalledTimes(2)
})
it('cannot restore an old response after a mutation invalidates the snapshot', async () => {
  const cache = new AdminListCache()
  let finish!: (value: string[]) => void
  const old = cache.load('books', () => new Promise<string[]>(resolve => { finish = resolve }))
  cache.invalidate('books')
  await cache.load('books', async () => ['new'])
  finish(['old'])
  await old
  expect(cache.peek('books')).toEqual(['new'])
})
it('allows retry after a failed request and invalidates every transcript page', async () => {
  const cache = new AdminListCache()
  await expect(cache.load('books', async () => { throw new Error('offline') })).rejects.toThrow('offline')
  expect(await cache.load('books', async () => ['retry'])).toEqual(['retry'])
  await cache.load('transcripts:0', async () => [0])
  await cache.load('transcripts:1', async () => [1])
  cache.invalidate('transcripts:')
  expect(cache.peek('transcripts:0')).toBeUndefined()
  expect(cache.peek('transcripts:1')).toBeUndefined()
  expect(cache.peek('books')).toEqual(['retry'])
})
