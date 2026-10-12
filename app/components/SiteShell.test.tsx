import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({path:'/reviewer'}))
vi.mock('next/navigation',()=>({usePathname:()=>mocks.path}))
vi.mock('./navbar/index',()=>({default:()=>null}))
vi.mock('./footer',()=>({default:()=>null}))
vi.mock('./MobileBottomNav',()=>({default:()=>null}))
vi.mock('./LazyFloatingVideoPlayer',()=>({default:()=>null}))
vi.mock('./LearningActivityTracker',()=>({default:()=>null}))
import SiteShell from './SiteShell'
let host:HTMLDivElement,root:Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');root=createRoot(host);vi.spyOn(console,'error').mockImplementation(()=>{});mocks.path='/reviewer'})
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks()})
function Broken(){throw new Error('Deliberate rendering failure');return null}
it('recovers from a prior page error after client navigation instead of keeping the old error screen',async()=>{
 await act(async()=>root.render(<SiteShell><Broken/></SiteShell>));expect(host.textContent).toContain('Something went wrong');expect(console.error).toHaveBeenCalled()
 mocks.path='/profile';await act(async()=>root.render(<SiteShell><p>New profile content</p></SiteShell>))
 expect(host.textContent).toContain('New profile content');expect(host.textContent).not.toContain('Something went wrong')
})
