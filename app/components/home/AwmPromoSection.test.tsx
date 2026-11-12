import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import type {PremiumStatus} from '@/app/actions/premium'
const mocks=vi.hoisted(()=>({status:vi.fn(),manage:vi.fn(),upgrade:vi.fn()}))
import { resetPremiumStatusCache } from '@/app/lib/premiumStatusCache'
vi.mock('@/app/actions/premium',()=>({fetchPremiumStatus:mocks.status,managePremium:mocks.manage,startPremiumCheckout:mocks.upgrade}))
import AwmPromoSection from './AwmPromoSection'
const free:PremiumStatus={premium:false,signedIn:true,manageable:false,admin:false,cancelAtPeriodEnd:false,periodEnd:null,paymentIssue:false,startedAt:null}
const member:PremiumStatus={...free,premium:true,manageable:true,periodEnd:'2999-01-01T00:00:00Z'}
let host:HTMLDivElement,root:Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();resetPremiumStatusCache();mocks.status.mockResolvedValue(free);host=document.createElement('div');document.body.append(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
async function render(placement:'home'|'profile'='home',userId:string|undefined='user'){await act(async()=>root.render(<AwmPromoSection userId={userId} placement={placement}/>))}
it('shows the guest promo and delegates its CTA to existing authentication',async()=>{
 await act(async()=>root.render(<AwmPromoSection placement="home"/>))
 expect(host.textContent).toContain('Upgrade to AWM+');expect(mocks.status).not.toHaveBeenCalled()
 const auth=vi.fn();window.addEventListener('open-auth-dialog',auth)
 try{await act(async()=>{[...host.querySelectorAll('button')].find(b=>b.textContent==='Get AWM+')!.click()});expect(auth).toHaveBeenCalledOnce();expect(mocks.upgrade).not.toHaveBeenCalled()}finally{window.removeEventListener('open-auth-dialog',auth)}
})
it('keeps a free account upgrade at Home and omits a member card on Profile',async()=>{await render();expect(host.textContent).toContain('Upgrade to AWM+');await render('profile');expect(host.textContent).toBe('')})
it('shows active entitlement at Home and never renders a second member card on Profile',async()=>{
 mocks.status.mockResolvedValue(member);await render()
 expect(host.textContent).toContain('Your AWM+ subscription is active.');expect(host.textContent).not.toContain('Upgrade to AWM+');expect(host.querySelector('[data-awm-plus-placement]')?.getAttribute('data-awm-plus-placement')).toBe('home')
})
it('delegates membership management to the existing portal action with a loading spinner',async()=>{
 mocks.status.mockResolvedValue(member);mocks.manage.mockImplementation(()=>new Promise(()=>{}));await render()
 await act(async()=>{[...host.querySelectorAll('button')].find(b=>b.textContent==='Manage membership')!.click()})
 expect(mocks.manage).toHaveBeenCalledOnce();expect(mocks.upgrade).not.toHaveBeenCalled();expect(host.querySelector('button .MuiCircularProgress-root')).not.toBeNull()
})
it('keeps the existing free account checkout action with a loading spinner',async()=>{
 mocks.upgrade.mockImplementation(()=>new Promise(()=>{}));await render()
 await act(async()=>{[...host.querySelectorAll('button')].find(b=>b.textContent==='Get AWM+')!.click()})
 expect(mocks.upgrade).toHaveBeenCalledOnce();expect(mocks.manage).not.toHaveBeenCalled();expect(host.querySelector('button .MuiCircularProgress-root')).not.toBeNull()
})
it('keeps cancel-at-period-end access active until the canonical entitlement ends',async()=>{
 mocks.status.mockResolvedValue({...member,cancelAtPeriodEnd:true});await render();expect(host.textContent).toContain('Cancellation scheduled')
 mocks.status.mockResolvedValue({...member,premium:false,periodEnd:'2000-01-01T00:00:00Z'});await act(async()=>window.dispatchEvent(new Event('account-access-changed')))
 expect(host.textContent).toContain('Upgrade to AWM+')
})
it('honours verified administrative entitlement without inventing a billing account',async()=>{mocks.status.mockResolvedValue({...free,admin:true});await render();expect(host.textContent).toContain('Your AWM+ subscription is active.');expect(host.textContent).not.toContain('Manage membership')})
it('never presents another identity cached status as verified membership',async()=>{
 mocks.status.mockResolvedValue(member);await render('home','first');expect(host.textContent).toContain('subscription is active')
 mocks.status.mockImplementation(()=>new Promise(()=>{}));await render('home','second');expect(host.textContent).toBe('')
})

it('suppresses a legacy Profile invocation for an active member',async()=>{mocks.status.mockResolvedValue(member);await render('profile');expect(host.querySelector('[data-awm-plus-placement]')).toBeNull()})
