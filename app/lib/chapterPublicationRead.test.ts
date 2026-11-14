import { expect, it, vi } from 'vitest'
import { chapterPublished, readChapterPublication } from './chapterPublicationRead'
it('retries only the exact missing publication column and retains real failures', async () => {
  const query = vi
    .fn()
    .mockResolvedValueOnce({
      data: null,
      error: { code: '42703', message: 'column chapters.is_published does not exist' },
    })
    .mockResolvedValueOnce({ data: [{ id: 'legacy' }], error: null })
  expect(await readChapterPublication(query)).toMatchObject({ data: [{ id: 'legacy' }] })
  expect(query.mock.calls.map((call) => call[0])).toEqual([true, false])
  for (const error of [
    { code: '42501', message: 'permission denied' },
    { code: '42703', message: 'column other does not exist' },
    { code: '503', message: 'unavailable' },
  ]) {
    query.mockReset().mockResolvedValue({ data: null, error })
    expect((await readChapterPublication(query)).error).toEqual(error)
    expect(query).toHaveBeenCalledOnce()
  }
})
it('keeps deployed chapter drafts hidden and supports the legacy Book-only release gate', () => {
  expect(chapterPublished({ is_published: false })).toBe(false)
  expect(chapterPublished({ is_published: null })).toBe(false)
  expect(chapterPublished({ is_published: true })).toBe(true)
  expect(chapterPublished({ id: 'legacy' })).toBe(true)
})
