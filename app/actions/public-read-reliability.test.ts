// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn(), identity: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))
vi.mock('@/app/lib/supabase', () => ({ hasServiceClientConfig: () => true, serviceClient: { from: mocks.from } }))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: mocks.identity, guardAdmin: vi.fn() }))
import { fetchShowBySlugPublic, fetchEpisodeForPublic, fetchEpisodesForShowPublic } from './cartoons'
import { fetchBookBySlugPublic, fetchChapterForPublic } from './books'
let queue: unknown[]
beforeEach(() => {
  queue = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.identity.mockResolvedValue('learner')
  mocks.from.mockImplementation(() => {
    const query: Record<string, unknown> = {}
    for (const key of ['select','eq','not','order','limit','range']) query[key] = () => query
    query.maybeSingle = query.single = () => Promise.resolve(queue.shift())
    query.then = (resolve: (v: unknown) => void) => Promise.resolve(queue.shift()).then(resolve)
    return query
  })
})
it.each([
  ['book', () => fetchBookBySlugPublic('book')],
  ['show', () => fetchShowBySlugPublic('show')],
  ['episode parent', () => fetchEpisodeForPublic('show','episode')],
  ['show episodes', () => fetchEpisodesForShowPublic('show')],
] as const)('does not cache a backend outage as missing %s content', async (_, load) => {
  queue.push({ data: null, error: { code: '57014', message: 'private diagnostic' } })
  await expect(load()).rejects.toThrow('Unable to load this content')
  queue.push({ data: null, error: null })
  expect(await load()).toEqual(_ === 'show episodes' ? [] : null)
})
it('preserves chapter failure after the release and publication gates pass', async () => {
  queue.push({data:{is_completed:true},error:null}, {data:{id:'chapter',is_published:true},error:null}, {data:null,error:{code:'503',message:'offline'}})
  await expect(fetchChapterForPublic('book','chapter')).rejects.toThrow('Unable to load this content')
})
