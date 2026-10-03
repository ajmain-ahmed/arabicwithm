// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({access:vi.fn(),reviewer:vi.fn(),rpc:vi.fn(),from:vi.fn(),updateTag:vi.fn(),revalidatePath:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedAccess:mocks.access,guardReviewer:mocks.reviewer}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{rpc:mocks.rpc,from:mocks.from}}))
vi.mock('next/cache',()=>({updateTag:mocks.updateTag,revalidatePath:mocks.revalidatePath}))
import { changeManagedRole, editSuggestion, listManagedUsers, listSuggestions, loadAdminBookCorrections, loadReviewerComments, loadReviewSource, managedUserDetails, reviewCatalogue, reviewSuggestion, submitSuggestion } from './reviews'
const actor='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222'
const input={arabic:'',english:'New translation',comment:'',reason:'Correction'}
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({data:{ok:true},error:null})})
describe('server authorization boundaries',()=>{
 it.each([null,{userId:actor,admin:false,role:'user'},{userId:actor,admin:false,role:'editor'}])('denies privileged directory/details/role/review operations for %j',async access=>{
  mocks.access.mockResolvedValue(access)
  await expect(listManagedUsers('all','',0)).rejects.toThrow('Forbidden')
  await expect(managedUserDetails(target)).rejects.toThrow('Forbidden')
  await expect(changeManagedRole(target,'admin','Promotion',target)).rejects.toThrow('Forbidden')
  await expect(reviewSuggestion(target,'accept','')).rejects.toThrow('Forbidden')
  await expect(loadAdminBookCorrections(actor,target)).rejects.toThrow('Forbidden')
  expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled()
 })
 it('denies reviewer reads/writes for normal users before touching the database',async()=>{
  mocks.reviewer.mockRejectedValue(new Error('Forbidden'))
  await expect(reviewCatalogue('book')).rejects.toThrow('Forbidden')
  await expect(loadReviewSource('show',target)).rejects.toThrow('Forbidden')
  await expect(loadReviewerComments('book',target)).rejects.toThrow('Forbidden')
  await expect(submitSuggestion('book',target,0,[],input)).rejects.toThrow('Forbidden')
  await expect(editSuggestion(target,false,input)).rejects.toThrow('Forbidden')
  expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled()
 })
 it('prevents Editors from requesting the Admin review queue',async()=>{
  mocks.reviewer.mockResolvedValue({userId:actor,admin:false,role:'editor'})
  await expect(listSuggestions(true,{status:'pending'},0)).rejects.toThrow('Forbidden')
  expect(mocks.from).not.toHaveBeenCalled()
 })
 it('binds suggestion ownership to verified actor identity',async()=>{
  mocks.reviewer.mockResolvedValue({userId:actor,admin:false,role:'editor'})
  await submitSuggestion('book',target,0,[],input)
  expect(mocks.rpc).toHaveBeenCalledWith('submit_content_suggestion',expect.objectContaining({p_actor:actor,p_target:target}))
 })
 it('loads inline history only for the verified reviewer and selected content',async()=>{
  mocks.reviewer.mockResolvedValue({userId:actor,admin:false,role:'editor'})
  const rows=[{id:target,line_index:2,comment:'Saved feedback',status:'pending',created_at:'2026-10-03T00:00:00Z',admin_response:null}]
  const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),neq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockResolvedValue({data:rows,error:null})}
  mocks.from.mockReturnValue(query)
  expect(await loadReviewerComments('book',target)).toEqual(rows)
  expect(mocks.from).toHaveBeenCalledWith('content_suggestions')
  expect(query.eq).toHaveBeenCalledWith('author_id',actor);expect(query.eq).toHaveBeenCalledWith('content_type','book');expect(query.eq).toHaveBeenCalledWith('target_id',target)
  expect(query.neq).toHaveBeenCalledWith('status','withdrawn')
  query.limit.mockResolvedValueOnce({data:null,error:{message:'Unavailable'}})
  await expect(loadReviewerComments('book',target)).rejects.toThrow('Unable to load your previous comments')
 })
 it('requires explicit target confirmation for protected role changes',async()=>{
  mocks.access.mockResolvedValue({userId:actor,admin:true,role:'admin'})
  await expect(changeManagedRole(target,'admin','Promotion','wrong')).rejects.toThrow('Confirm')
  expect(mocks.rpc).not.toHaveBeenCalled()
  await changeManagedRole(target,'editor','Trusted reviewer',target)
  expect(mocks.rpc).toHaveBeenCalledWith('change_account_role',expect.objectContaining({p_actor:actor,p_target:target,p_role:'editor'}))
 })
 it('collects all chapter comments across API batches in reading order, without losing same-line comments',async()=>{
  mocks.access.mockResolvedValue({userId:actor,admin:true,role:'admin'})
  const records=Array.from({length:1001},(_,index)=>({id:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,author_id:actor,parent_id:actor,target_id:target,line_index:1000-index,original_arabic:'Original',comment:`Comment ${index}`,created_at:'2026-10-03T00:00:00Z',status:'pending',admin_response:null}))
  records[1000].line_index=records[999].line_index
  const pages=[records.slice(0,500),records.slice(500,1000),records.slice(1000),[]]
  const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),neq:vi.fn().mockReturnThis(),lte:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockReturnThis(),gt:vi.fn().mockReturnThis(),then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:pages.shift(),error:null}).then(resolve)}
  mocks.from.mockReturnValue(query)
  const rows=await loadAdminBookCorrections(actor,target)
  expect(rows).toHaveLength(1001);expect(rows[0].line_index).toBe(1);expect(rows[1].line_index).toBe(1);expect(rows[1000].line_index).toBe(1000)
  expect(query.gt).toHaveBeenCalledWith('id',records[499].id);expect(query.gt).toHaveBeenCalledWith('id',records[999].id)
  expect(query.eq).toHaveBeenCalledWith('content_type','book');expect(query.eq).toHaveBeenCalledWith('parent_id',actor);expect(query.eq).toHaveBeenCalledWith('target_id',target)
  expect(query.eq).not.toHaveBeenCalledWith('author_id',expect.anything());expect(query.neq).toHaveBeenCalledWith('status','withdrawn')
 })
 it('checks selected IDs against the chapter and rejects missing/withdrawn records',async()=>{
  mocks.access.mockResolvedValue({userId:actor,admin:true,role:'admin'})
  const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),neq:vi.fn().mockReturnThis(),lte:vi.fn().mockReturnThis(),in:vi.fn().mockResolvedValue({data:[],error:null})}
  mocks.from.mockReturnValue(query)
  await expect(loadAdminBookCorrections(actor,target,[target])).rejects.toThrow('removed or withdrawn')
  expect(query.in).toHaveBeenCalledWith('id',[target])
  query.in.mockResolvedValueOnce({data:null,error:{message:'Database unavailable'}})
  await expect(loadAdminBookCorrections(actor,target,[target])).rejects.toThrow('Unable to load corrections')
 })
 it('reports malformed source blocks without letting the reviewer crash while rendering tokens',async()=>{
  mocks.reviewer.mockResolvedValue({userId:actor,admin:false,role:'editor'})
  mocks.rpc.mockResolvedValueOnce({data:{document:[{tokens:null,translation:'Hello'}]},error:null})
  await expect(loadReviewSource('book',target)).rejects.toThrow('unsupported blocks')
  mocks.rpc.mockResolvedValueOnce({data:{document:[],parent:actor,location:'Empty chapter'},error:null})
  expect((await loadReviewSource('book',target)).document).toEqual([])
 })
 it('does not invalidate content after conflicts; successful acceptance refreshes readers',async()=>{
  mocks.access.mockResolvedValue({userId:actor,admin:true,role:'admin'})
  mocks.rpc.mockResolvedValueOnce({data:{ok:false,conflict:true},error:null})
  expect(await reviewSuggestion(target,'accept','')).toEqual({ok:false,conflict:true})
  expect(mocks.updateTag).not.toHaveBeenCalled()
  await reviewSuggestion(target,'accept','')
  expect(mocks.updateTag).toHaveBeenCalledWith('books-public');expect(mocks.updateTag).toHaveBeenCalledWith('cartoons-public')
 })
})
