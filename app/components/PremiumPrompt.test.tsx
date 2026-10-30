import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({status:vi.fn(),purchase:vi.fn(),manage:vi.fn(),push:vi.fn(),close:vi.fn(),drawerClose:vi.fn(),user:{id:'member'} as {id:string}|null}))
vi.mock('@/app/actions/premium',()=>({fetchPremiumStatus:mocks.status,startPremiumCheckout:mocks.purchase,managePremium:mocks.manage}))
vi.mock('@/app/AuthContext',()=>({useAuth:()=>({user:mocks.user})}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push})}))
import PremiumPrompt from './PremiumPrompt'
import {PREMIUM} from '@/app/lib/entitlements'
let root:Root,host:HTMLDivElement
const active={premium:true,signedIn:true,manageable:true,admin:false}
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();mocks.user={id:'member'};mocks.status.mockResolvedValue(active)
 host=document.createElement('div');document.body.append(host);root=createRoot(host)
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers()})
async function render(open=true,summary=true){await act(async()=>root.render(<PremiumPrompt open={open} membershipSummary={summary} onClose={mocks.close} onProfileNavigate={mocks.drawerClose}/>))}
function button(text:string){return [...document.querySelectorAll('button')].find(el=>el.textContent===text)!}
it('confirms real membership, derives only current web benefits and routes to the canonical profile',async()=>{
 await render()
 expect(document.body.textContent).toContain('Your AWM Plus membership is active.')
 const benefits=[...document.querySelectorAll('[role="dialog"] li')].map(el=>el.textContent)
 expect(benefits).toEqual(['Offline books','Audiobooks','Unlimited For You viewing','Unlimited Memory Practice'])
 expect(document.body.textContent).not.toMatch(/Upgrade|Subscribe|Choose Plan|flashcards|Explore|Grammar|Word Search/)
 await act(async()=>button('Go to Profile').click())
 expect(mocks.close).toHaveBeenCalledOnce();expect(mocks.drawerClose).toHaveBeenCalledOnce();expect(mocks.push).toHaveBeenCalledWith('/profile/member')
 expect(mocks.purchase).not.toHaveBeenCalled();expect(mocks.manage).not.toHaveBeenCalled()
})
it('verifies again on each reopening and never reuses another identity’s status',async()=>{
 await render();await render(false);await render();expect(mocks.status).toHaveBeenCalledTimes(2)
 mocks.user={id:'ordinary'};mocks.status.mockResolvedValue({premium:false,signedIn:true,manageable:false,admin:false});await render()
 expect(document.body.textContent).toContain('Upgrade to AWM+');expect(button('Go to Profile')).toBeUndefined()
})
it('shows errors instead of a spinner and can retry successfully',async()=>{
 mocks.status.mockRejectedValueOnce(new Error('network'));await render()
 expect(document.querySelector('[role="alert"]')?.textContent).toContain('Unable to check')
 expect(document.querySelector('[role="progressbar"]')).toBeNull()
 await act(async()=>button('Retry').click());expect(document.body.textContent).toContain('Your AWM Plus membership is active.')
})
it('times out a stalled request and ignores its late result after a successful retry',async()=>{
 vi.useFakeTimers();let finish!:(value:typeof active)=>void
 mocks.status.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));await render()
 expect(document.querySelector('[role="progressbar"]')).not.toBeNull()
 await act(async()=>vi.advanceTimersByTimeAsync(10000))
 expect(document.querySelector('[role="progressbar"]')).toBeNull();expect(button('Retry')).toBeTruthy()
 await act(async()=>button('Retry').click());await act(async()=>finish({...active,premium:false}))
 expect(document.body.textContent).toContain('Your AWM Plus membership is active.')
})
it('uses the upgrade path for a verified non-member, and effective access for an Admin',async()=>{
 mocks.status.mockResolvedValue({premium:false,signedIn:true,manageable:false,admin:false});await render()
 expect(document.body.textContent).toContain('Upgrade to AWM+');expect(button('Go to Profile')).toBeUndefined()
 await render(false);mocks.status.mockResolvedValue({...active,admin:true,manageable:false});await render()
 expect(document.body.textContent).toContain('Your AWM Plus access is active.')
 expect(document.body.textContent).toContain('included with your account access')
})
it('retains the separate existing billing-management prompt',async()=>{
 await render(true,false);expect(button('Manage AWM+')).toBeTruthy()
 expect(button('Go to Profile')).toBeUndefined()
})
it('uses the canonical GBP amount for the headline, recurring-price copy and upgrade button',async()=>{
 mocks.status.mockResolvedValue({premium:false,signedIn:true,manageable:false,admin:false});await render()
 const dialog=document.querySelector('[role="dialog"]')!
 expect(PREMIUM.monthlyPence).toBe(499);expect(PREMIUM.price).toBe('\u00a34.99')
 expect(dialog.textContent?.split(PREMIUM.price)).toHaveLength(4)
 expect(dialog.textContent).not.toContain('3.99')
 expect(button(`Upgrade to AWM+ \u2014 ${PREMIUM.label}`)).toBeTruthy()
})
