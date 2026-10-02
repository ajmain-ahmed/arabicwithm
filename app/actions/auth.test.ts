// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({getUser:vi.fn(),rpc:vi.fn()}))
vi.mock('@supabase/ssr',()=>({createServerClient:()=>({auth:{getUser:mocks.getUser}})}))
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[],set:vi.fn()})}))
vi.mock('next/navigation',()=>({unstable_rethrow:vi.fn()}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{rpc:mocks.rpc}}))
import { getAuthenticatedAccess, guardAdmin, guardReviewer } from './auth'
const id='11111111-1111-4111-8111-111111111111'
beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id,app_metadata:{role:'admin'},user_metadata:{role:'admin'}}},error:null});mocks.rpc.mockResolvedValue({data:'user',error:null})})
describe('current database role authorization',()=>{
 it('does not trust old Admin metadata or client-editable roles after demotion',async()=>{
  expect(await getAuthenticatedAccess()).toEqual({userId:id,admin:false,role:'user'})
  await expect(guardAdmin()).rejects.toThrow('Forbidden');await expect(guardReviewer()).rejects.toThrow('Forbidden')
 })
 it('allows Editors only into the reviewer guard',async()=>{
  mocks.rpc.mockResolvedValue({data:'editor',error:null})
  expect((await guardReviewer()).role).toBe('editor');await expect(guardAdmin()).rejects.toThrow('Forbidden')
 })
 it('checks the database role every time rather than relying on stale JWT claims',async()=>{
  mocks.rpc.mockResolvedValueOnce({data:'admin',error:null}).mockResolvedValueOnce({data:'user',error:null})
  await expect(guardAdmin()).resolves.toBeUndefined();await expect(guardAdmin()).rejects.toThrow('Forbidden')
 })
 it('fails closed when role verification fails',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:'Missing feature'}})
  await expect(getAuthenticatedAccess()).rejects.toThrow('Unable to verify account access')
 })
 it('requires verified Auth identity before querying roles',async()=>{
  mocks.getUser.mockResolvedValue({data:{user:null},error:{message:'Auth session missing!'}})
  expect(await getAuthenticatedAccess()).toBeNull();expect(mocks.rpc).not.toHaveBeenCalled()
 })
})
