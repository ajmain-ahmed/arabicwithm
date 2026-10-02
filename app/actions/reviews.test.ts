// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({access:vi.fn(),reviewer:vi.fn(),rpc:vi.fn(),from:vi.fn(),updateTag:vi.fn(),revalidatePath:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedAccess:mocks.access,guardReviewer:mocks.reviewer}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{rpc:mocks.rpc,from:mocks.from}}))
vi.mock('next/cache',()=>({updateTag:mocks.updateTag,revalidatePath:mocks.revalidatePath}))
import { changeManagedRole, editSuggestion, listManagedUsers, listSuggestions, loadReviewSource, managedUserDetails, reviewCatalogue, reviewSuggestion, submitSuggestion } from './reviews'
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
  expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled()
 })
 it('denies reviewer reads/writes for normal users before touching the database',async()=>{
  mocks.reviewer.mockRejectedValue(new Error('Forbidden'))
  await expect(reviewCatalogue('book')).rejects.toThrow('Forbidden')
  await expect(loadReviewSource('show',target)).rejects.toThrow('Forbidden')
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
 it('requires explicit target confirmation for protected role changes',async()=>{
  mocks.access.mockResolvedValue({userId:actor,admin:true,role:'admin'})
  await expect(changeManagedRole(target,'admin','Promotion','wrong')).rejects.toThrow('Confirm')
  expect(mocks.rpc).not.toHaveBeenCalled()
  await changeManagedRole(target,'editor','Trusted reviewer',target)
  expect(mocks.rpc).toHaveBeenCalledWith('change_account_role',expect.objectContaining({p_actor:actor,p_target:target,p_role:'editor'}))
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
