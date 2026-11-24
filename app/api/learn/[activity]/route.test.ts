// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({puzzle:vi.fn(),memory:vi.fn(),grammar:vi.fn()}))
vi.mock('@/app/actions/learn',()=>({fetchLearnPuzzle:mocks.puzzle,fetchLearnMemory:mocks.memory}))
vi.mock('@/app/actions/grammar',()=>({fetchLearnNahw:mocks.grammar}))
import {GET} from './route'
const read=(activity:string,query='')=>GET(new Request(`https://site.example/api/learn/${activity}${query}`),{params:Promise.resolve({activity})})
beforeEach(()=>{vi.clearAllMocks();mocks.puzzle.mockResolvedValue({words:[]});mocks.memory.mockResolvedValue({cards:[]})})
it('returns independent, non-cacheable read results',async()=>{
 const puzzle=await read('puzzle','?minimum=5&exclude=episode%3Aid')
 expect(puzzle.headers.get('Cache-Control')).toBe('private, no-store')
 expect(mocks.puzzle).toHaveBeenCalledWith('episode:id',5)
 expect(await puzzle.json()).toMatchObject({ok:true})
 await read('memory');expect(mocks.memory).toHaveBeenCalledWith(undefined)
})
it('retains the verified-session Grammar guard and never exposes backend details',async()=>{
 mocks.grammar.mockRejectedValue(new Error('Sign in to practise Grammar'))
 expect((await read('grammar','?mode=word_type&seed=seed')).status).toBe(401)
 mocks.memory.mockRejectedValue(new Error('private backend information'))
 const response=await read('memory');expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('private backend')
})
it('rejects invalid and unknown activity requests',async()=>{
 expect((await read('unknown')).status).toBe(404)
 mocks.puzzle.mockRejectedValue(new Error('Invalid puzzle size'))
 expect((await read('puzzle')).status).toBe(400)
})
