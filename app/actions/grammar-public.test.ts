// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn(), operations: [] as unknown[][], responses: [] as unknown[] }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: mocks.from } }))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: vi.fn() }))
vi.mock('@/app/lib/contentEnrichment/service', () => ({ enrichmentRpc: vi.fn() }))
import { fetchPublicGrammarNotes } from './canonicalGrammar'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.operations=[];mocks.responses=[]
  mocks.from.mockImplementation((table: string) => {
    mocks.operations.push(['from',table]);const query: Record<string,unknown>={}
    for(const method of ['select','eq','is','not','in','order','range'])query[method]=(...args:unknown[])=>{mocks.operations.push([method,...args]);return query}
    query.then=(resolve:(value:unknown)=>void)=>Promise.resolve(mocks.responses.shift()).then(resolve)
    return query
  })
})
it('uses only active approved Episode associations and approved unmerged notes',async()=>{
  const id='11111111-1111-4111-8111-111111111111'
  mocks.responses.push({data:[{grammar_note_id:id}],error:null},{data:[{id,title_en:'The predicate',title_ar:'خبر',status:'approved',rule_cefr:'A1'}],error:null})
  expect((await fetchPublicGrammarNotes({episodeId:id})).notes).toHaveLength(1)
  for(const operation of [['eq','source_kind','episode'],['eq','source_id',id],['eq','active',true],['eq','review_status','approved'],['eq','status','approved'],['is','merged_into',null]])expect(mocks.operations).toContainEqual(operation)
})
it('keeps successful empty results distinct from a failed query',async()=>{
  mocks.responses.push({data:[],error:null});expect(await fetchPublicGrammarNotes({level:'C2'})).toEqual({notes:[],hasMore:false})
  const error=vi.spyOn(console,'error').mockImplementation(()=>{})
  mocks.responses.push({data:null,error:{code:'57014',message:'timeout'}})
  await expect(fetchPublicGrammarNotes({level:'C2'})).rejects.toThrow('Unable to load this content')
  expect(error).toHaveBeenCalled();error.mockRestore()
})
it('validates filters before a service-role query',async()=>{
  await expect(fetchPublicGrammarNotes({episodeId:'not-an-id'})).rejects.toThrow();expect(mocks.from).not.toHaveBeenCalled()
})
