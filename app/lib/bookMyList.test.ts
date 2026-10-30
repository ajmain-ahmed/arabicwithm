import { beforeEach, expect, it, vi } from 'vitest'
const auth = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn() }))
vi.mock('@/app/lib/supabase/client', () => ({ supabase: { auth } }))
let metadata: Record<string, unknown>
beforeEach(() => {
 vi.resetModules();vi.clearAllMocks();metadata = { my_list_books: ['curated'], other: true }
 auth.getUser.mockImplementation(async () => ({ data: { user: { id: 'u', user_metadata: metadata } } }))
 auth.updateUser.mockImplementation(async ({data}) => { metadata = {...metadata, ...data};return {} })
})
it('merges concurrent starts, avoids duplicates and preserves curated entries', async () => {
 const {setBookInMyList} = await import('./bookMyList')
 await Promise.all([setBookInMyList('u','a',true),setBookInMyList('u','b',true),setBookInMyList('u','a',true)])
 expect(metadata.my_list_books).toEqual(['curated','a','b']);expect(auth.updateUser).toHaveBeenCalledTimes(2)
 await setBookInMyList('u','a',false);expect(metadata.my_list_books).toEqual(['curated','b'])
})
it('refuses a changed account and recovers after a failed write', async () => {
 const {setBookInMyList} = await import('./bookMyList')
 await expect(setBookInMyList('other','a',true)).rejects.toThrow('Sign in again')
 auth.updateUser.mockResolvedValueOnce({error:new Error('offline')})
 await expect(setBookInMyList('u','a',true)).rejects.toThrow('offline')
 await setBookInMyList('u','a',true);expect(metadata.my_list_books).toEqual(['curated','a'])
})
