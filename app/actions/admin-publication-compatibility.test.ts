// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({guard:vi.fn(),from:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:mocks.guard}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from}}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn(),updateTag:vi.fn()}))
vi.mock('next/navigation',()=>({unstable_rethrow:vi.fn()}))
import { fetchBooksIndexForAdmin } from './admin'
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
