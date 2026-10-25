import { act } from 'react'
import { createRoot,type Root } from 'react-dom/client'
import { beforeEach,afterEach,expect,it,vi } from 'vitest'
const mocks=vi.hoisted(()=>({session:vi.fn(),set:vi.fn(),access:vi.fn(),refresh:vi.fn(),callback:null as null|((event:string,session:unknown)=>void),unsubscribe:vi.fn()}))
vi.mock('next/navigation',()=>{const router={refresh:mocks.refresh};return {useRouter:()=>router}})
vi.mock('@/app/lib/supabase/client',()=>({supabase:{auth:{getSession:mocks.session,setSession:mocks.set,onAuthStateChange:(callback:typeof mocks.callback)=>{mocks.callback=callback;return{data:{subscription:{unsubscribe:mocks.unsubscribe}}}}}}}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedAccess:mocks.access}))
import { AuthProvider,useAuth } from './AuthContext'
import { useAccountAccess } from './lib/useAccountAccess'
let host:HTMLDivElement,root:Root
const adminSession={user:{id:'admin',user_metadata:{}},access_token:'token'}
const SESSION_COOKIE='sb-testref-auth-token=encoded'
function Probe(){const auth=useAuth(),access=useAccountAccess('nav');return <div>{JSON.stringify({user:auth.user?.id,loading:auth.loading,...access})}</div>}
/* The provider only initialises supabase-js when a stored session cookie (or
   URL-hash tokens) exists, so every test below seeds the cookie first. */
function seedSessionCookie(){document.cookie=`${SESSION_COOKIE}; path=/`}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://testref.supabase.co');host=document.createElement('div');root=createRoot(host);mocks.callback=null;mocks.session.mockResolvedValue({data:{session:null}});mocks.access.mockResolvedValue({userId:'admin',admin:true,role:'admin'})})
afterEach(async()=>{document.cookie='sb-testref-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';await act(async()=>root.unmount());vi.unstubAllEnvs();vi.clearAllMocks()})
it('restores auth, keeps Admin through profile updates, and does not refresh routes on repeated same-account events',async()=>{
 seedSessionCookie()
 await act(async()=>root.render(<AuthProvider><Probe/></AuthProvider>))
 await act(async()=>{}) // flush the dynamic client import
 await act(async()=>mocks.callback!('SIGNED_IN',adminSession))
 expect(host.textContent).toContain('"isAdmin":true');expect(mocks.refresh).toHaveBeenCalledTimes(1)
 await act(async()=>mocks.callback!('SIGNED_IN',adminSession))
 await act(async()=>mocks.callback!('USER_UPDATED',{...adminSession,user:{...adminSession.user,user_metadata:{name:'New name'}}}))
 expect(host.textContent).toContain('"isAdmin":true');expect(mocks.access).toHaveBeenCalledTimes(1);expect(mocks.refresh).toHaveBeenCalledTimes(1)
 await act(async()=>mocks.callback!('SIGNED_OUT',null));expect(host.textContent).toContain('"isAdmin":false');expect(mocks.refresh).toHaveBeenCalledTimes(2)
})
it('does not restore an old session after a newer sign-out event or after unmount',async()=>{
 seedSessionCookie()
 let finish!:(value:unknown)=>void;mocks.session.mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
 await act(async()=>root.render(<AuthProvider><Probe/></AuthProvider>))
 await act(async()=>{}) // flush the dynamic client import
 await act(async()=>mocks.callback!('SIGNED_OUT',null))
 await act(async()=>finish({data:{session:adminSession}}))
 expect(host.textContent).not.toContain('"user":"admin"');expect(mocks.access).not.toHaveBeenCalled()
})
it('does not refresh over navigation when the first event restores an existing session', async () => {
  seedSessionCookie()
  mocks.session.mockImplementation(() => new Promise(() => {}))
  await act(async () => root.render(<AuthProvider><Probe/></AuthProvider>))
  await act(async () => {}) // flush the dynamic client import
  await act(async () => mocks.callback!('SIGNED_IN', adminSession))
  expect(host.textContent).toContain('"user":"admin"')
  expect(mocks.refresh).not.toHaveBeenCalled()
  await act(async () => mocks.callback!('SIGNED_OUT', null))
  expect(mocks.refresh).toHaveBeenCalledOnce()
})
it('skips the client entirely for anonymous visitors without a stored session', async () => {
  await act(async () => root.render(<AuthProvider><Probe/></AuthProvider>))
  await act(async () => {}) // let the gate resolve
  expect(host.textContent).toContain('"loading":false')
  expect(host.textContent).not.toContain('"user":"admin"')
  expect(mocks.session).not.toHaveBeenCalled()
  expect(mocks.callback).toBeNull()
})
