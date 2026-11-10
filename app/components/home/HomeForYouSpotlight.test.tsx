import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({error:null as number|null,select:vi.fn(),mute:vi.fn(),playWithSound:vi.fn(),getSoundMuted:()=>false,syncSoundIntent:vi.fn()}))
vi.mock('@/app/AuthContext',()=>({useAuth:()=>({user:{id:'member'},loading:false})}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}))
vi.mock('@/app/actions/forYou',()=>({fetchHomeForYouSpotlight:mocks.select}))
vi.mock('@/app/lib/useYouTubePlayer',()=>({default:()=>({wrapRef:{current:null},isReady:true,isPlaying:true,playbackRate:1,isMuted:false,getSoundMuted:mocks.getSoundMuted,mute:mocks.mute,playWithSound:mocks.playWithSound,syncSoundIntent:mocks.syncSoundIntent,pauseVideo:vi.fn(),errorCode:mocks.error,retry:vi.fn()})}))
vi.mock('@/app/explore/ForYouMeterContext',()=>({useForYouMeter:()=>undefined}))
vi.mock('./SpotlightPlayerFrame',()=>({default:({children}:{children:React.ReactNode})=><div>{children}</div>}))
import HomeForYouSpotlight from './HomeForYouSpotlight'
import type {ForYouClip} from '@/app/lib/forYou'
const clip:ForYouClip={video:{id:'99999999-9999-4999-8999-999999999990',youtube_id:'abcdefghij0',title:'Source',channel:null},clip_start_ms:0,clip_end_ms:45000,segments:[]}
let host:HTMLDivElement,root:Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();mocks.error=null;host=document.createElement('div');document.body.append(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
it('uses initial server data without making another selection on hydration',async()=>{
 await act(async()=>root.render(<HomeForYouSpotlight initialClip={clip}/>));expect(mocks.select).not.toHaveBeenCalled()
})
it('replaces an unembeddable source only once, excluding the rejected source',async()=>{
 let resolve!:(value:ForYouClip)=>void
 mocks.select.mockImplementation(()=>new Promise(done=>{resolve=done}));mocks.error=150
 await act(async()=>root.render(<HomeForYouSpotlight initialClip={clip}/>))
 expect(mocks.select).toHaveBeenCalledExactlyOnceWith(clip.video.id)
 await act(async()=>resolve({...clip,video:{...clip.video,id:'99999999-9999-4999-8999-999999999991'}}))
 expect(mocks.select).toHaveBeenCalledOnce();expect(host.querySelector('[role=alert]')).not.toBeNull()
})
it('mounts the player only when the section approaches the viewport',async()=>{
 let intersect!:()=>void
 vi.stubGlobal('IntersectionObserver',class{
  constructor(callback:(entries:{isIntersecting:boolean}[])=>void){intersect=()=>callback([{isIntersecting:true}])}
  observe(){}disconnect(){}
 })
 await act(async()=>root.render(<HomeForYouSpotlight initialClip={clip}/>))
 expect(host.querySelector('[data-spotlight-deferred]')).not.toBeNull()
 expect(host.querySelector('[data-spotlight-ready]')).toBeNull()
 await act(async()=>intersect())
 expect(host.querySelector('[data-spotlight-deferred]')).toBeNull()
 expect(host.querySelector('[data-spotlight-ready]')).not.toBeNull()
 vi.unstubAllGlobals()
})
