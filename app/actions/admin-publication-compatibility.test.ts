// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({guard:vi.fn(),from:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:mocks.guard}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from}}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn(),updateTag:vi.fn()}))
vi.mock('next/navigation',()=>({unstable_rethrow:vi.fn()}))
import { createChapterResult, updateChapterResult, fetchBooksIndexForAdmin } from './admin'
beforeEach(()=>vi.clearAllMocks())
it('keeps existing Books and chapters visible when the optional publication column is absent',async()=>{
 const selections:string[]=[]
 mocks.from.mockImplementation((table:string)=>{
  let columns=''
  const query={select:(value:string)=>{columns=value;selections.push(value);return query},order:()=>query,range:()=>query,
   then:(resolve:(value:unknown)=>void)=>resolve(table==='books'?{data:[{id:'book',title:'Existing Book'}],error:null}:columns.includes('is_published')?{data:null,error:{code:'42703',message:'column chapters.is_published does not exist'}}:{data:[{id:'chapter',book_id:'book',title:'Existing chapter',chapter_number:1}],error:null})}
  return query
 })
 const result=await fetchBooksIndexForAdmin()
 expect(result.books[0].title).toBe('Existing Book')
 expect(result.chapters[0].title).toBe('Existing chapter')
 expect(result.chapters[0].is_published).toBe(true)
 expect(selections.filter(value=>value.includes('production_status'))).toHaveLength(2)
})
it('keeps unrelated backend failures as failures, rather than returning an empty catalogue',async()=>{
 const query={select:()=>query,order:()=>query,range:()=>query,then:(resolve:(value:unknown)=>void)=>resolve({data:null,error:{code:'42501',message:'permission denied'}})}
 mocks.from.mockReturnValue(query)
 await expect(fetchBooksIndexForAdmin()).rejects.toThrow('Unable to load')
})

const chapterInput = {book_id:'book',slug:'chapter',title:'Chapter',chapter_number:1,content:[],is_published:false}
it.each(['42703','PGRST204'])('saves chapter JSON in an in-progress Book without optional publication column (%s)', async code => {
 const writes:Record<string,unknown>[]=[]
 mocks.from.mockImplementation((table:string)=>{
  let payload:Record<string,unknown>|undefined
  const result=()=>table==='books'?{data:{slug:'book',is_completed:false},error:null}:payload&&'is_published' in payload?{data:null,error:{code,message:'column chapters.is_published does not exist'}}:{data:{id:'chapter',book_id:'book',slug:'chapter'},error:null}
  const query={select:()=>query,eq:()=>query,insert:(value:Record<string,unknown>)=>{payload=value;writes.push(value);return query},single:async()=>result(),maybeSingle:async()=>result()}
  return query
 })
 expect(await createChapterResult(chapterInput)).toEqual({ok:true,data:'chapter'})
 expect(writes).toHaveLength(2)
 expect(writes[1]).not.toHaveProperty('is_published')
 expect(writes[1].content).toEqual(chapterInput.content)
})
it('does not silently expose a draft in a released Book on a legacy schema',async()=>{
 const insert=vi.fn()
 mocks.from.mockImplementation((table:string)=>{
  const query={select:()=>query,eq:()=>query,insert:(value:unknown)=>{insert(value);return query},single:async()=>table==='books'?{data:{is_completed:true},error:null}:{data:null,error:{code:'42703',message:'column chapters.is_published does not exist'}}}
  return query
 })
 expect(await createChapterResult(chapterInput)).toMatchObject({ok:false,error:expect.stringContaining('does not support chapter drafts')})
 expect(insert).toHaveBeenCalledOnce()
})
it('returns actionable duplicate errors without retrying an unrelated failure',async()=>{
 const insert=vi.fn()
 const query={select:()=>query,insert:(value:unknown)=>{insert(value);return query},single:async()=>({data:null,error:{code:'23505',message:'private database details'}})}
 mocks.from.mockReturnValue(query)
 expect(await createChapterResult(chapterInput)).toEqual({ok:false,error:'A chapter already uses this slug or chapter number in this Book. Choose another value.'})
 expect(insert).toHaveBeenCalledOnce()
})
it('returns authorization failures as data and never touches storage',async()=>{
 mocks.guard.mockRejectedValueOnce(new Error('Forbidden'))
 expect(await createChapterResult(chapterInput)).toEqual({ok:false,error:'Administrator access is required to save chapters.'})
 expect(mocks.from).not.toHaveBeenCalled()
})
it('updates chapter JSON without the missing publication field in an in-progress Book',async()=>{
 const writes:Record<string,unknown>[]=[]
 mocks.from.mockImplementation((table:string)=>{
  let payload:Record<string,unknown>|undefined
  const result=()=>table==='books'?{data:{is_completed:false,slug:'book'},error:null}:payload&&'is_published' in payload?{data:null,error:{code:'42703',message:'column chapters.is_published does not exist'}}:{data:{book_id:'book',slug:'chapter'},error:null}
  const query={select:()=>query,eq:()=>query,update:(value:Record<string,unknown>)=>{payload=value;writes.push(value);return query},single:async()=>result(),maybeSingle:async()=>result(),then:(resolve:(value:unknown)=>void)=>resolve(result())}
  return query
 })
 expect(await updateChapterResult('chapter',chapterInput)).toEqual({ok:true,data:'chapter'})
 expect(writes).toHaveLength(2)
 expect(writes[1]).not.toHaveProperty('is_published')
})
